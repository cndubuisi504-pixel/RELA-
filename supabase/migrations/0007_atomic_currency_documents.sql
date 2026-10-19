-- 0007 — store currency/instructions in the same transaction as the document.
-- No best-effort follow-up PATCH: a $ invoice must never become a ₦ invoice.
-- Also records the existing delivery-fee schema/RPC behaviour for fresh installs.
alter table public.documents
  add column if not exists delivery_kobo bigint not null default 0 check (delivery_kobo >= 0);
alter table public.documents drop constraint documents_total_matches;
alter table public.documents add constraint documents_total_matches
  check (total_kobo = subtotal_kobo - discount_kobo + tax_kobo + delivery_kobo);
alter table public.documents add constraint documents_currency_allowed
  check (currency in ('NGN', 'USD', 'GBP', 'EUR')) not valid;

-- New name avoids the two legacy create_document overloads and leaves the
-- previous production build working during rollout. All money is minor units.
create or replace function public.create_document_in_currency(
  p_type document_type,
  p_customer_name text,
  p_customer_phone text default null,
  p_customer_email text default null,
  p_mode document_mode default 'product',
  p_show_quantity boolean default true,
  p_quantity_label quantity_label default 'qty',
  p_items jsonb default '[]'::jsonb,
  p_discount_kobo bigint default 0,
  p_tax_kobo bigint default 0,
  p_amount_paid_kobo bigint default 0,
  p_payment_method text default null,
  p_due_date date default null,
  p_valid_until date default null,
  p_terms text default null,
  p_payment_terms text default null,
  p_notes text default null,
  p_delivery_kobo bigint default 0,
  p_currency text default 'NGN',
  p_payment_instructions text default null
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  v_business uuid;
  v_seq integer;
  v_number text;
  v_id uuid;
  v_subtotal bigint := 0;
  v_line bigint;
  v_total bigint;
  v_balance bigint;
  v_status text;
  v_item jsonb;
  v_pos integer := 0;
  v_qty numeric(12,3);
  v_price bigint;
begin
  select id into v_business from businesses where owner_id = auth.uid();
  if v_business is null then
    raise exception 'no_business_for_user' using errcode = 'P0003';
  end if;
  if p_currency is null or p_currency not in ('NGN', 'USD', 'GBP', 'EUR') then
    raise exception 'unsupported_currency' using errcode = '22023';
  end if;
  if length(coalesce(p_payment_instructions, '')) > 500 then
    raise exception 'payment_instructions_too_long' using errcode = '22023';
  end if;
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'customer_name_required' using errcode = 'P0004';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items_required' using errcode = 'P0005';
  end if;

  -- Recompute all totals from integer minor units, never from the client total.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce(nullif(v_item->>'quantity', '')::numeric, 1);
    v_price := coalesce(nullif(v_item->>'unit_price_kobo', '')::bigint,
                        nullif(v_item->>'rate_kobo', '')::bigint, 0);
    if v_qty <= 0 or v_price <= 0 then
      raise exception 'invalid_item_amount' using errcode = '22023';
    end if;
    v_line := round(v_qty * v_price)::bigint;
    v_subtotal := v_subtotal + v_line;
  end loop;
  if p_discount_kobo < 0 or p_tax_kobo < 0 or p_amount_paid_kobo < 0 or p_delivery_kobo < 0 then
    raise exception 'negative_amount' using errcode = 'P0007';
  end if;
  v_total := v_subtotal - p_discount_kobo + p_tax_kobo + p_delivery_kobo;
  if v_total < 0 then
    raise exception 'negative_total' using errcode = 'P0008';
  end if;
  if p_amount_paid_kobo > v_total then
    raise exception 'paid_exceeds_total' using errcode = 'P0009';
  end if;
  v_balance := v_total - p_amount_paid_kobo;
  if p_type = 'receipt' and (v_balance <> 0 or v_total <= 0) then
    raise exception 'receipt_requires_full_payment' using errcode = '22023';
  end if;
  v_status := case p_type
    when 'receipt' then 'paid'
    when 'invoice' then case
      when v_balance = 0 then 'paid'
      when p_amount_paid_kobo > 0 then 'partially_paid'
      else 'draft'
    end
    else 'draft'
  end;

  insert into document_number_sequences (business_id, document_type, issued_date, last_value)
  values (v_business, p_type, current_date, 1)
  on conflict (business_id, document_type, issued_date)
    do update set last_value = document_number_sequences.last_value + 1
  returning last_value into v_seq;
  v_number := case p_type when 'receipt' then 'REC' when 'invoice' then 'INV' else 'QUO' end
    || '-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

  insert into documents (
    business_id, created_by, document_type, document_number, issued_date, daily_sequence,
    customer_name, customer_phone, customer_email, mode, show_quantity, quantity_label,
    status, currency, payment_instructions, subtotal_kobo, discount_kobo, tax_kobo,
    delivery_kobo, total_kobo, amount_paid_kobo, balance_remaining_kobo,
    due_date, valid_until, terms, payment_terms, payment_method, internal_notes
  ) values (
    v_business, auth.uid(), p_type, v_number, current_date, v_seq,
    trim(p_customer_name), nullif(trim(coalesce(p_customer_phone, '')), ''),
    nullif(lower(trim(coalesce(p_customer_email, ''))), ''), p_mode, p_show_quantity, p_quantity_label,
    v_status, p_currency,
    case when p_type in ('invoice', 'quotation') then nullif(trim(p_payment_instructions), '') else null end,
    v_subtotal, p_discount_kobo, p_tax_kobo, p_delivery_kobo, v_total, p_amount_paid_kobo, v_balance,
    p_due_date, p_valid_until, p_terms, p_payment_terms, p_payment_method, p_notes
  ) returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pos := v_pos + 1;
    v_qty := coalesce(nullif(v_item->>'quantity', '')::numeric, 1);
    v_price := coalesce(nullif(v_item->>'unit_price_kobo', '')::bigint,
                        nullif(v_item->>'rate_kobo', '')::bigint, 0);
    insert into document_items (
      document_id, item_name, description, quantity, quantity_label,
      unit_price_kobo, rate_kobo, total_kobo, position
    ) values (
      v_id, trim(coalesce(v_item->>'name', 'Item')),
      nullif(trim(coalesce(v_item->>'description', '')), ''),
      v_qty, p_quantity_label, v_price, v_price, round(v_qty * v_price)::bigint, v_pos
    );
  end loop;
  insert into audit_logs (business_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_business, auth.uid(), 'document.created', 'document', v_id,
          jsonb_build_object('type', p_type, 'number', v_number, 'currency', p_currency));
  return jsonb_build_object('id', v_id, 'number', v_number, 'total_kobo', v_total, 'status', v_status);
end $fn$;

revoke all on function public.create_document_in_currency(document_type, text, text, text, document_mode, boolean, quantity_label, jsonb, bigint, bigint, bigint, text, date, date, text, text, text, bigint, text, text) from public;
grant execute on function public.create_document_in_currency(document_type, text, text, text, document_mode, boolean, quantity_label, jsonb, bigint, bigint, bigint, text, date, date, text, text, text, bigint, text, text) to authenticated;

-- Conversions keep currency, delivery and invoice payment instructions inside
-- the same transaction as the balance update. No client follow-up is required.
create or replace function public.convert_document(
  p_source_id uuid,
  p_target document_type,
  p_amount_paid_kobo bigint default 0,
  p_payment_method text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  src documents%rowtype;
  v_business uuid := current_business_id();
  v_new_id uuid;
  v_seq integer;
  v_number text;
  v_paid bigint;
  v_balance bigint;
  v_status text;
  v_amount bigint;
  v_key text;
  v_existing uuid;
begin
  if v_business is null then
    raise exception 'no_business_for_user' using errcode = 'P0003';
  end if;

  select * into src from documents where id = p_source_id and business_id = v_business for update;
  if not found then
    raise exception 'document_not_found' using errcode = 'P0010';
  end if;

  if p_target = 'quotation' then
    raise exception 'invalid_conversion_target' using errcode = 'P0011';
  end if;

  -- quotation -> invoice
  if p_target = 'invoice' then
    if src.document_type <> 'quotation' then
      raise exception 'only_quotations_convert_to_invoices' using errcode = 'P0012';
    end if;
    if src.converted_to_document_id is not null then
      raise exception 'already_converted:%', src.converted_to_document_id using errcode = 'P0013';
    end if;

    insert into document_number_sequences (business_id, document_type, issued_date, last_value)
    values (v_business, 'invoice', current_date, 1)
    on conflict (business_id, document_type, issued_date)
      do update set last_value = document_number_sequences.last_value + 1
    returning last_value into v_seq;
    v_number := 'INV-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

    insert into documents (
      business_id, created_by, document_type, document_number, issued_date, daily_sequence,
      customer_name, customer_phone, customer_email, customer_show_on_public, mode, show_quantity,
      quantity_label, status, currency, payment_instructions, subtotal_kobo, discount_kobo, tax_kobo, delivery_kobo, total_kobo,
      amount_paid_kobo, balance_remaining_kobo, due_date, terms, source_document_id
    ) values (
      v_business, auth.uid(), 'invoice', v_number, current_date, v_seq,
      src.customer_name, src.customer_phone, src.customer_email, src.customer_show_on_public,
      src.mode, src.show_quantity, src.quantity_label, 'draft', src.currency, src.payment_instructions, src.subtotal_kobo,
      src.discount_kobo, src.tax_kobo, src.delivery_kobo, src.total_kobo, 0, src.total_kobo,
      current_date + 14, src.terms, src.id
    ) returning id into v_new_id;

    insert into document_items (document_id, item_name, description, quantity, quantity_label, unit_price_kobo, rate_kobo, total_kobo, position)
    select v_new_id, item_name, description, quantity, quantity_label, unit_price_kobo, rate_kobo, total_kobo, position
    from document_items where document_id = src.id order by position;

    update documents set status = 'converted', converted_to_document_id = v_new_id where id = src.id;

    insert into document_conversions (source_document_id, destination_document_id, conversion_type, created_by, idempotency_key)
    values (src.id, v_new_id, 'quotation_to_invoice', auth.uid(), src.id::text || ':invoice');

    insert into audit_logs (business_id, actor_id, action, entity_type, entity_id, metadata)
    values (v_business, auth.uid(), 'document.converted', 'document', v_new_id,
            jsonb_build_object('from', src.document_number, 'to', v_number, 'type', 'quotation_to_invoice'));

    return jsonb_build_object('id', v_new_id, 'number', v_number, 'type', 'invoice');
  end if;

  -- invoice -> receipt
  if src.document_type <> 'invoice' then
    raise exception 'only_invoices_convert_to_receipts' using errcode = 'P0014';
  end if;
  if src.balance_remaining_kobo <= 0 then
    raise exception 'invoice_already_paid' using errcode = 'P0015';
  end if;

  v_amount := coalesce(nullif(p_amount_paid_kobo, 0), src.balance_remaining_kobo);
  if v_amount <= 0 then
    raise exception 'amount_must_be_positive' using errcode = 'P0016';
  end if;
  if v_amount > src.balance_remaining_kobo then
    raise exception 'amount_exceeds_balance' using errcode = 'P0017';
  end if;

  -- A repeat tap within two minutes is almost certainly the same payment.
  select id into v_existing
  from documents
  where business_id = v_business
    and source_document_id = src.id
    and document_type = 'receipt'
    and receipt_for_payment_kobo = v_amount
    and created_at > now() - interval '2 minutes'
  limit 1;
  if v_existing is not null then
    raise exception 'duplicate_payment:%', v_existing using errcode = 'P0018';
  end if;

  v_paid := src.amount_paid_kobo + v_amount;
  v_balance := src.total_kobo - v_paid;
  v_status := case when v_balance = 0 then 'paid' else 'balance_owed' end;
  v_key := src.id::text || ':receipt:' || v_paid::text;

  select destination_document_id into v_existing from document_conversions where idempotency_key = v_key;
  if v_existing is not null then
    raise exception 'duplicate_payment:%', v_existing using errcode = 'P0018';
  end if;

  insert into document_number_sequences (business_id, document_type, issued_date, last_value)
  values (v_business, 'receipt', current_date, 1)
  on conflict (business_id, document_type, issued_date)
    do update set last_value = document_number_sequences.last_value + 1
  returning last_value into v_seq;
  v_number := 'REC-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

  insert into documents (
    business_id, created_by, document_type, document_number, issued_date, daily_sequence,
    customer_name, customer_phone, customer_email, customer_show_on_public, mode, show_quantity,
    quantity_label, status, currency, payment_instructions, subtotal_kobo, discount_kobo, tax_kobo, delivery_kobo, total_kobo,
    amount_paid_kobo, balance_remaining_kobo, payment_method, source_document_id,
    receipt_for_payment_kobo
  ) values (
    v_business, auth.uid(), 'receipt', v_number, current_date, v_seq,
    src.customer_name, src.customer_phone, src.customer_email, src.customer_show_on_public,
    src.mode, src.show_quantity, src.quantity_label, v_status, src.currency, null, src.subtotal_kobo,
    src.discount_kobo, src.tax_kobo, src.delivery_kobo, src.total_kobo, v_paid, v_balance,
    nullif(trim(coalesce(p_payment_method, '')), ''), src.id, v_amount
  ) returning id into v_new_id;

  insert into document_items (document_id, item_name, description, quantity, quantity_label, unit_price_kobo, rate_kobo, total_kobo, position)
  select v_new_id, item_name, description, quantity, quantity_label, unit_price_kobo, rate_kobo, total_kobo, position
  from document_items where document_id = src.id order by position;

  update documents
    set amount_paid_kobo = v_paid,
        balance_remaining_kobo = v_balance,
        status = case when v_balance = 0 then 'paid' else 'partially_paid' end
    where id = src.id;

  insert into document_conversions (source_document_id, destination_document_id, conversion_type, created_by, idempotency_key)
  values (src.id, v_new_id, 'invoice_to_receipt', auth.uid(), v_key);

  insert into audit_logs (business_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_business, auth.uid(), 'payment.recorded', 'document', src.id,
          jsonb_build_object('receipt', v_number, 'amount_kobo', v_amount, 'balance_kobo', v_balance));

  return jsonb_build_object('id', v_new_id, 'number', v_number, 'type', 'receipt',
                            'paid_kobo', v_paid, 'balance_kobo', v_balance);
end $fn$;

revoke all on function convert_document(uuid, document_type, bigint, text) from public;
grant execute on function convert_document(uuid, document_type, bigint, text) to authenticated;


-- Public projection remains explicitly whitelisted; delivery is not lost.
create or replace function public_document(p_token text)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'type', d.document_type,
    'number', d.document_number,
    'issued_date', d.issued_date,
    'status', d.status,
    'business', jsonb_build_object(
      'name', b.name,
      'logo_url', b.logo_url,
      'phone', b.phone,
      'email', b.email,
      'address', b.address
    ),
    'customer_name', case when d.customer_show_on_public then d.customer_name else null end,
    'mode', d.mode,
    'quantity_label', d.quantity_label,
    'currency', d.currency,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', i.item_name,
        'description', i.description,
        'quantity', i.quantity,
        'quantity_label', i.quantity_label,
        'unit_price_kobo', i.unit_price_kobo,
        'rate_kobo', i.rate_kobo,
        'total_kobo', i.total_kobo
      ) order by i.position)
      from document_items i where i.document_id = d.id
    ), '[]'::jsonb),
    'subtotal_kobo', d.subtotal_kobo,
    'discount_kobo', d.discount_kobo,
    'tax_kobo', d.tax_kobo,
    'delivery_kobo', d.delivery_kobo,
    'total_kobo', d.total_kobo,
    'amount_paid_kobo', d.amount_paid_kobo,
    'balance_remaining_kobo', d.balance_remaining_kobo,
    'due_date', d.due_date,
    'valid_until', d.valid_until,
    'payment_instructions', case
      when d.document_type in ('invoice', 'quotation') then d.payment_instructions
      else null
    end,
    'verified_with', 'rela'
  )
  from documents d
  join businesses b on b.id = d.business_id
  where d.public_token = p_token
    and d.visibility = 'link'
    and d.status <> 'void';
$$;

revoke all on function public_document(text) from public;
grant execute on function public_document(text) to anon, authenticated;
