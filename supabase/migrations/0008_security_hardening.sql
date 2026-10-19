-- 0008 — Security hardening
-- 1. Restrict next_document_number so it cannot be invoked directly by anon or authenticated users.
--    All document numbering is handled internally by create_document_in_currency and convert_document.
revoke all on function public.next_document_number(uuid, document_type, date) from public, anon, authenticated;
grant execute on function public.next_document_number(uuid, document_type, date) to service_role;

-- 2. Restrict direct table INSERT on documents.
--    All document creation must go through create_document_in_currency or convert_document.
--    This prevents bypassing quota, numbering, items, or receipt payment rules via direct REST inserts.
drop policy if exists documents_insert_own on public.documents;
revoke insert on public.documents from authenticated, anon;

-- 3. Hardened free quota enforcement trigger:
--    Only active, unexpired Starter subscriptions bypass the 5-document monthly limit.
--    Accounts with expired or inactive subscriptions correctly fall back to the free allowance.
create or replace function public.enforce_free_document_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_plan plan_tier;
  v_sub_status subscription_state;
  v_sub_ends timestamptz;
  v_count integer;
begin
  if new.source_document_id is not null then
    return new;
  end if;

  select p.plan, p.subscription_status, p.subscription_ends_at
  into v_plan, v_sub_status, v_sub_ends
  from profiles p
  join businesses b on b.owner_id = p.id
  where b.id = new.business_id;

  -- Only active, unexpired Starter accounts bypass the free limit
  if not (v_plan = 'starter' and v_sub_status = 'active' and (v_sub_ends is null or v_sub_ends > now())) then
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
