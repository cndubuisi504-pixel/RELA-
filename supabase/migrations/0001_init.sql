-- ===========================================================================
-- rela. 0001_init
-- Core schema: businesses, documents, items, conversions, subscriptions,
-- usage counters, notifications, audit logs. RLS everywhere, safe public
-- verification, atomic per-business/per-day document numbering.
-- Money is ALWAYS integer kobo (₦1,000.00 = 100000).
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums ---
do $$ begin
  create type plan_tier as enum ('free', 'starter');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_type as enum ('receipt', 'invoice', 'quotation');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_mode as enum ('product', 'service');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quantity_label as enum ('qty', 'hours', 'days', 'projects', 'sessions');
exception when duplicate_object then null; end $$;

do $$ begin
  create type conversion_type as enum ('quotation_to_invoice', 'invoice_to_receipt');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_state as enum ('inactive', 'pending', 'active', 'past_due', 'expired', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_visibility as enum ('private', 'link');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- helpers ----
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ------------------------------------------------------------- profiles ---
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'owner' check (role in ('owner', 'admin')),
  plan plan_tier not null default 'free',
  subscription_status subscription_state not null default 'inactive',
  subscription_started_at timestamptz,
  subscription_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_touch on profiles;
create trigger profiles_touch before update on profiles
  for each row execute function set_updated_at();

-- Create a profile for every new auth user.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------- businesses ---
-- One business per owner in v1. Acts as the tenant root for all documents.
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  address text not null,
  phone text not null,
  email text,
  registration_info text,
  logo_url text,
  signature_url text,
  default_mode document_mode not null default 'product',
  default_theme text not null default 'classic' check (default_theme in ('classic', 'bold', 'minimal')),
  brand_primary text,
  brand_secondary text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  setup_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists businesses_touch on businesses;
create trigger businesses_touch before update on businesses
  for each row execute function set_updated_at();

-- Current tenant for RLS. Security definer so policies stay cheap and safe.
create or replace function current_business_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select id from businesses where owner_id = auth.uid() limit 1;
$$;

-- --------------------------------------------------------- numbering ------
-- Atomic per business / per type / per day sequence. The upsert locks the row,
-- so concurrent requests cannot produce duplicate numbers.
create table if not exists document_number_sequences (
  business_id uuid not null references businesses (id) on delete cascade,
  document_type document_type not null,
  issued_date date not null,
  last_value integer not null default 0,
  primary key (business_id, document_type, issued_date)
);

create or replace function next_document_number(
  p_business_id uuid,
  p_type document_type,
  p_date date default current_date
) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_seq integer;
  v_prefix text;
begin
  insert into document_number_sequences (business_id, document_type, issued_date, last_value)
  values (p_business_id, p_type, p_date, 1)
  on conflict (business_id, document_type, issued_date)
    do update set last_value = document_number_sequences.last_value + 1
  returning last_value into v_seq;

  v_prefix := case p_type
    when 'receipt' then 'REC'
    when 'invoice' then 'INV'
    else 'QUO'
  end;

  return v_prefix || '-' || to_char(p_date, 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');
end $$;

revoke all on function next_document_number(uuid, document_type, date) from public;
grant execute on function next_document_number(uuid, document_type, date) to authenticated, service_role;

-- ----------------------------------------------------------- documents ---
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  document_type document_type not null,
  document_number text not null,
  issued_date date not null default current_date,
  daily_sequence integer not null check (daily_sequence > 0),
  public_token text not null unique default encode(gen_random_bytes(16), 'hex'),

  customer_name text not null check (length(trim(customer_name)) > 0),
  customer_phone text,
  customer_email text,
  customer_show_on_public boolean not null default false,

  mode document_mode not null default 'product',
  show_quantity boolean not null default true,
  quantity_label quantity_label not null default 'qty',

  status text not null default 'draft',
  currency char(3) not null default 'NGN',

  subtotal_kobo bigint not null default 0 check (subtotal_kobo >= 0),
  discount_kobo bigint not null default 0 check (discount_kobo >= 0),
  tax_kobo bigint not null default 0 check (tax_kobo >= 0),
  total_kobo bigint not null default 0 check (total_kobo >= 0),
  amount_paid_kobo bigint not null default 0 check (amount_paid_kobo >= 0),
  balance_remaining_kobo bigint not null default 0 check (balance_remaining_kobo >= 0),

  due_date date,
  valid_until date,
  terms text,
  payment_terms text,
  payment_method text,
  internal_notes text,

  visibility document_visibility not null default 'link',
  source_document_id uuid references documents (id) on delete set null,
  converted_to_document_id uuid references documents (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint documents_number_unique unique (business_id, document_number),
  constraint documents_balance_matches check (balance_remaining_kobo = total_kobo - amount_paid_kobo),
  constraint documents_paid_not_over_total check (amount_paid_kobo <= total_kobo),
  constraint documents_total_matches check (total_kobo = subtotal_kobo - discount_kobo + tax_kobo),
  constraint documents_status_by_type check (
    (document_type = 'receipt'   and status in ('paid', 'balance_owed', 'void')) or
    (document_type = 'invoice'   and status in ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void')) or
    (document_type = 'quotation' and status in ('draft', 'sent', 'accepted', 'declined', 'expired', 'converted', 'void'))
  ),
  constraint documents_due_date_required check (document_type <> 'invoice' or due_date is not null or status = 'draft')
);

drop trigger if exists documents_touch on documents;
create trigger documents_touch before update on documents
  for each row execute function set_updated_at();

create index if not exists documents_business_created_idx on documents (business_id, created_at desc);
create index if not exists documents_business_type_idx on documents (business_id, document_type);
create index if not exists documents_public_token_idx on documents (public_token);
create index if not exists documents_customer_idx on documents (business_id, lower(customer_name));
create index if not exists documents_outstanding_idx on documents (business_id, status)
  where balance_remaining_kobo > 0;

-- -------------------------------------------------------- document items -
create table if not exists document_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  item_name text not null check (length(trim(item_name)) > 0),
  description text,
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  quantity_label quantity_label not null default 'qty',
  unit_price_kobo bigint not null default 0 check (unit_price_kobo >= 0),
  rate_kobo bigint not null default 0 check (rate_kobo >= 0),
  total_kobo bigint not null default 0 check (total_kobo >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists document_items_document_idx on document_items (document_id, position);

-- ---------------------------------------------------- document conversion-
create table if not exists document_conversions (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references documents (id) on delete cascade,
  destination_document_id uuid not null references documents (id) on delete cascade,
  conversion_type conversion_type not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint document_conversions_destination_unique unique (destination_document_id),
  -- one conversion per source per type: stops double "convert to invoice"
  constraint document_conversions_source_type_unique unique (source_document_id, conversion_type)
);

create index if not exists document_conversions_source_idx on document_conversions (source_document_id);

-- ---------------------------------------------------------- usage counter -
-- Read usage for date_trunc('month', now()); a missing row means zero, so the
-- counter never depends on a cron job to reset.
create table if not exists document_usage (
  business_id uuid not null references businesses (id) on delete cascade,
  period_month date not null,
  document_count integer not null default 0 check (document_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (business_id, period_month)
);

create or replace function bump_document_usage()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into document_usage (business_id, period_month, document_count)
  values (new.business_id, date_trunc('month', new.issued_date)::date, 1)
  on conflict (business_id, period_month)
    do update set document_count = document_usage.document_count + 1, updated_at = now();
  return new;
end $$;

drop trigger if exists documents_bump_usage on documents;
create trigger documents_bump_usage after insert on documents
  for each row execute function bump_document_usage();

-- Enforce the Free allowance in the database so no client can bypass it.
create or replace function enforce_free_document_limit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_plan plan_tier;
  v_count integer;
begin
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
end $$;

drop trigger if exists documents_free_limit on documents;
create trigger documents_free_limit before insert on documents
  for each row execute function enforce_free_document_limit();

-- ---------------------------------------------------------- subscriptions -
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  provider text not null default 'flutterwave',
  plan plan_tier not null default 'starter',
  status subscription_state not null default 'pending',
  provider_reference text,
  provider_customer_id text,
  provider_plan_code text,
  amount_kobo bigint,
  currency char(3) default 'NGN',
  started_at timestamptz,
  ends_at timestamptz,
  last_verified_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_reference_unique unique (provider, provider_reference)
);

drop trigger if exists subscriptions_touch on subscriptions;
create trigger subscriptions_touch before update on subscriptions
  for each row execute function set_updated_at();

create index if not exists subscriptions_business_idx on subscriptions (business_id, status);
create index if not exists subscriptions_ends_idx on subscriptions (ends_at) where status = 'active';

-- Webhook ledger. Idempotent by provider event id; no user access at all.
create table if not exists subscription_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'flutterwave',
  provider_event_id text not null,
  event_type text not null,
  reference text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received', 'verified', 'rejected', 'failed', 'duplicate')),
  processing_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint subscription_events_unique unique (provider, provider_event_id)
);

-- ---------------------------------------------------------- notifications -
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_profile_idx on notifications (profile_id, created_at desc);

-- -------------------------------------------------------------- audit log -
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_business_idx on audit_logs (business_id, created_at desc);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table profiles            enable row level security;
alter table businesses          enable row level security;
alter table documents           enable row level security;
alter table document_items      enable row level security;
alter table document_conversions enable row level security;
alter table document_usage      enable row level security;
alter table document_number_sequences enable row level security;
alter table subscriptions       enable row level security;
alter table subscription_events enable row level security;
alter table notifications       enable row level security;
alter table audit_logs          enable row level security;

-- profiles: a user sees and edits only their own row. Plan changes happen
-- server-side (service role) after a verified payment.
drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own on profiles for select
  using (id = auth.uid());

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- A user may edit their name, never their plan or role. Only the service role
-- (verified webhook path, no auth.uid()) can move a plan.
create or replace function protect_profile_plan()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and (
    new.plan is distinct from old.plan
    or new.role is distinct from old.role
    or new.subscription_status is distinct from old.subscription_status
    or new.subscription_started_at is distinct from old.subscription_started_at
    or new.subscription_ends_at is distinct from old.subscription_ends_at
  ) then
    raise exception 'plan_and_role_are_server_managed' using errcode = 'P0002';
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_plan on profiles;
create trigger profiles_protect_plan before update on profiles
  for each row execute function protect_profile_plan();

-- businesses
drop policy if exists businesses_select_own on businesses;
create policy businesses_select_own on businesses for select
  using (owner_id = auth.uid());

drop policy if exists businesses_insert_own on businesses;
create policy businesses_insert_own on businesses for insert
  with check (owner_id = auth.uid());

drop policy if exists businesses_update_own on businesses;
create policy businesses_update_own on businesses for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- documents
drop policy if exists documents_select_own on documents;
create policy documents_select_own on documents for select
  using (business_id = current_business_id());

drop policy if exists documents_insert_own on documents;
create policy documents_insert_own on documents for insert
  with check (business_id = current_business_id() and created_by = auth.uid());

drop policy if exists documents_update_own on documents;
create policy documents_update_own on documents for update
  using (business_id = current_business_id())
  with check (business_id = current_business_id());

drop policy if exists documents_delete_own on documents;
create policy documents_delete_own on documents for delete
  using (business_id = current_business_id());

-- document items
drop policy if exists document_items_all_own on document_items;
create policy document_items_all_own on document_items for all
  using (exists (
    select 1 from documents d
    where d.id = document_items.document_id and d.business_id = current_business_id()
  ))
  with check (exists (
    select 1 from documents d
    where d.id = document_items.document_id and d.business_id = current_business_id()
  ));

-- conversions
drop policy if exists document_conversions_select_own on document_conversions;
create policy document_conversions_select_own on document_conversions for select
  using (exists (
    select 1 from documents d
    where d.id = document_conversions.source_document_id and d.business_id = current_business_id()
  ));

-- usage: read-only to the owner
drop policy if exists document_usage_select_own on document_usage;
create policy document_usage_select_own on document_usage for select
  using (business_id = current_business_id());

-- subscriptions: read-only to the owner (writes only via verified webhook)
drop policy if exists subscriptions_select_own on subscriptions;
create policy subscriptions_select_own on subscriptions for select
  using (business_id = current_business_id());

-- notifications
drop policy if exists notifications_select_own on notifications;
create policy notifications_select_own on notifications for select
  using (profile_id = auth.uid());

drop policy if exists notifications_update_own on notifications;
create policy notifications_update_own on notifications for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- audit logs: owner may read their business trail; only the server writes
drop policy if exists audit_logs_select_own on audit_logs;
create policy audit_logs_select_own on audit_logs for select
  using (business_id = current_business_id());

-- subscription_events: deliberately NO policies -> service role only.

-- Keep numbering sequences server-side only.
drop policy if exists document_number_sequences_none on document_number_sequences;

-- ===========================================================================
-- Public verification — the only path an anonymous visitor can use.
-- Returns a whitelisted projection; internal notes, tags and staff data are
-- never exposed, and the raw documents table stays closed to anon.
-- ===========================================================================
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

-- ===========================================================================
-- Storage: branding bucket (logos + signatures), public read, owner-scoped
-- writes. Path convention: <auth.uid()>/logo.png, <auth.uid()>/signature.png
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding', 'branding', true, 2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists branding_read on storage.objects;
create policy branding_read on storage.objects for select
  using (bucket_id = 'branding');

drop policy if exists branding_insert_own on storage.objects;
create policy branding_insert_own on storage.objects for insert
  with check (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists branding_update_own on storage.objects;
create policy branding_update_own on storage.objects for update
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists branding_delete_own on storage.objects;
create policy branding_delete_own on storage.objects for delete
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===========================================================================
-- Convenience view: usage for the current month (0 when no row exists)
-- ===========================================================================
create or replace view business_usage_current as
select
  b.id as business_id,
  date_trunc('month', current_date)::date as period_month,
  coalesce(u.document_count, 0) as documents_used
from businesses b
left join document_usage u
  on u.business_id = b.id
 and u.period_month = date_trunc('month', current_date)::date;

alter view business_usage_current set (security_invoker = true);
