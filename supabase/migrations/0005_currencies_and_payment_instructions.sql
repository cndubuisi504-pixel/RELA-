-- 0005 — multi-currency documents + payment instructions.
-- Businesses pick a default currency and save reusable payment instructions
-- (Wise, bank wire, Payoneer…). Each document snapshots its currency and,
-- for invoices/quotations, the instructions that tell the customer how to pay.
alter table public.businesses
  add column if not exists default_currency text not null default 'NGN';

alter table public.businesses
  add column if not exists payment_instructions text;

alter table public.businesses
  add constraint businesses_default_currency_allowed
  check (default_currency in ('NGN', 'USD', 'GBP', 'EUR')) not valid;

alter table public.documents
  add column if not exists payment_instructions text;

comment on column public.documents.payment_instructions is
  'How to pay this document (bank wire, Wise, etc.). Snapshot from the business default at create; shown on the print sheet and public verify page.';

-- Expose the document's currency and (for unpaid document types) its payment
-- instructions on the public verify page. Whitelist projection only.
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
