-- 0002: document conversion chain + payment recording
--
-- quotation --convert_document('invoice')--> invoice
-- invoice   --convert_document('receipt', amount)--> receipt
--
-- Totals and statuses are always recomputed here from integer kobo and the
-- current row; the client only supplies ids and an amount.

alter table document_conversions add column if not exists idempotency_key text;
create unique index if not exists document_conversions_idem_idx
  on document_conversions (idempotency_key) where idempotency_key is not null;

-- Stage 1 assumed a document converts once. An invoice can take several partial payments.
alter table document_conversions drop constraint if exists document_conversions_source_type_unique;
create unique index if not exists document_conversions_quote_once_idx
  on document_conversions (source_document_id) where conversion_type = 'quotation_to_invoice';

alter table documents add column if not exists receipt_for_payment_kobo bigint;

-- Converted documents do not consume the monthly allowance: the vendor already
-- paid for the source document. (Free limit + usage counter both skip them.)
create or replace function public.enforce_free_document_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_plan plan_tier;
  v_count integer;
begin
  if new.source_document_id is not null then
    return new;
  end if;

  select p.plan into v_plan
  from profiles p
  join businesses b on b.owner_id = p.id
  where b.id = new.business_id;

  if v_plan = 'free' then
    select coalesce(document_count, 0) into v_count
    from document_usage
    where business_id = new.business_id
      and period_month = date_trunc('month', new.issued_date)::date;

    if coalesce(v_count, 0) >= 5 then
      raise exception 'free_document_limit_reached' using errcode = 'P0001';
    end if;
  end if;

  return new;
end $fn$;

create or replace function public.bump_document_usage()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
begin
  if new.source_document_id is not null then
    return new;
  end if;

  insert into document_usage (business_id, period_month, document_count)
  values (new.business_id, date_trunc('month', new.issued_date)::date, 1)
  on conflict (business_id, period_month)
    do update set document_count = document_usage.document_count + 1, updated_at = now();
  return new;
end $fn$;

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

  select * into src from documents where id = p_source_id and business_id = v_business;
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
      quantity_label, status, subtotal_kobo, discount_kobo, tax_kobo, total_kobo,
      amount_paid_kobo, balance_remaining_kobo, due_date, terms, source_document_id
    ) values (
      v_business, auth.uid(), 'invoice', v_number, current_date, v_seq,
      src.customer_name, src.customer_phone, src.customer_email, src.customer_show_on_public,
      src.mode, src.show_quantity, src.quantity_label, 'draft', src.subtotal_kobo,
      src.discount_kobo, src.tax_kobo, src.total_kobo, 0, src.total_kobo,
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
    quantity_label, status, subtotal_kobo, discount_kobo, tax_kobo, total_kobo,
    amount_paid_kobo, balance_remaining_kobo, payment_method, source_document_id,
    receipt_for_payment_kobo
  ) values (
    v_business, auth.uid(), 'receipt', v_number, current_date, v_seq,
    src.customer_name, src.customer_phone, src.customer_email, src.customer_show_on_public,
    src.mode, src.show_quantity, src.quantity_label, v_status, src.subtotal_kobo,
    src.discount_kobo, src.tax_kobo, src.total_kobo, v_paid, v_balance,
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

-- Status moves that are not payments. Payment status is owned by convert_document.
create or replace function set_document_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  src documents%rowtype;
begin
  select * into src from documents where id = p_id and business_id = current_business_id();
  if not found then
    raise exception 'document_not_found' using errcode = 'P0010';
  end if;

  if src.document_type = 'quotation' and p_status not in ('sent','accepted','declined','expired') then
    raise exception 'invalid_quotation_status' using errcode = 'P0019';
  end if;
  if src.document_type = 'invoice' and p_status not in ('sent','draft') then
    raise exception 'use_convert_to_receipt_for_payments' using errcode = 'P0020';
  end if;
  if src.document_type = 'receipt' then
    raise exception 'receipt_status_is_managed' using errcode = 'P0021';
  end if;

  update documents set status = p_status where id = p_id;
end $fn$;

revoke all on function set_document_status(uuid, text) from public;
grant execute on function set_document_status(uuid, text) to authenticated;
