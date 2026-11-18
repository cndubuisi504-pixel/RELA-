-- 0010 — RELA PARTNERS: Multi-agency platform, client onboarding, projects,
-- project API credentials, agency wallets, and atomic ₦100 receipt billing engine.

-- 1. Agencies
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique,
  email text not null,
  phone text,
  website text,
  logo_url text,
  status text not null default 'active' check (status in ('active', 'suspended', 'pending')),
  low_balance_threshold_kobo bigint not null default 500000, -- ₦5,000 threshold
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agencies_slug_idx on public.agencies (slug);
create index if not exists agencies_status_idx on public.agencies (status);

-- 2. Agency Members (Multi-user agency teams)
create table if not exists public.agency_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'developer', 'viewer')),
  created_at timestamptz not null default now(),
  unique (agency_id, user_id)
);

create index if not exists agency_members_user_idx on public.agency_members (user_id);
create index if not exists agency_members_agency_idx on public.agency_members (agency_id);

-- 3. Agency Wallets (Prepaid balance for ₦100 receipt generation)
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null unique references public.agencies (id) on delete cascade,
  balance_kobo bigint not null default 0 check (balance_kobo >= 0),
  currency text not null default 'NGN',
  total_funded_kobo bigint not null default 0,
  total_spent_kobo bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wallets_agency_idx on public.wallets (agency_id);

-- 4. Relax businesses table constraints to support agency client onboarding
-- A client business may be created by an agency before the client owner creates their own personal user account.
alter table public.businesses alter column owner_id drop not null;
alter table public.businesses drop constraint if exists businesses_owner_id_key;
create index if not exists businesses_owner_id_idx on public.businesses (owner_id);

-- 5. Agency - Business Relationships (Decoupled client management)
create table if not exists public.agency_business_relationships (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended', 'transferred', 'archived')),
  spending_limit_kobo bigint, -- null = unlimited (uses agency wallet balance)
  spent_kobo bigint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, business_id)
);

create index if not exists agency_biz_rel_agency_idx on public.agency_business_relationships (agency_id);
create index if not exists agency_biz_rel_business_idx on public.agency_business_relationships (business_id);

-- 6. Website Projects (Websites / stores under a business managed by an agency)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  website_url text,
  environment text not null default 'production' check (environment in ('sandbox', 'production')),
  status text not null default 'active' check (status in ('active', 'inactive', 'revoked')),
  receipts_count integer not null default 0,
  last_receipt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_agency_idx on public.projects (agency_id);
create index if not exists projects_business_idx on public.projects (business_id);
create index if not exists projects_status_idx on public.projects (status);

-- 7. Extend API keys for project-specific credentials
alter table public.api_keys add column if not exists project_id uuid references public.projects (id) on delete cascade;
alter table public.api_keys add column if not exists agency_id uuid references public.agencies (id) on delete cascade;
alter table public.api_keys add column if not exists environment text not null default 'production' check (environment in ('sandbox', 'production'));
alter table public.api_keys add column if not exists key_hint text;

create index if not exists api_keys_project_idx on public.api_keys (project_id);
create index if not exists api_keys_agency_idx on public.api_keys (agency_id);

-- 8. Wallet Transactions Ledger
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  business_id uuid references public.businesses (id) on delete set null,
  type text not null check (type in ('deposit', 'receipt_deduction', 'refund', 'adjustment')),
  amount_kobo bigint not null, -- positive for deposit, negative for deduction
  balance_after_kobo bigint not null,
  currency text not null default 'NGN',
  reference text not null unique,
  idempotency_key text unique,
  status text not null default 'success' check (status in ('pending', 'success', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wallet_tx_agency_idx on public.wallet_transactions (agency_id, created_at desc);
create index if not exists wallet_tx_project_idx on public.wallet_transactions (project_id);
create index if not exists wallet_tx_reference_idx on public.wallet_transactions (reference);

-- 9. Extend API Receipts with agency and project links
alter table public.api_receipts add column if not exists agency_id uuid references public.agencies (id) on delete set null;
alter table public.api_receipts add column if not exists project_id uuid references public.projects (id) on delete set null;

create index if not exists api_receipts_agency_idx on public.api_receipts (agency_id);
create index if not exists api_receipts_project_idx on public.api_receipts (project_id);

-- 10. API Request & Audit Logs
create table if not exists public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  agency_id uuid references public.agencies (id) on delete set null,
  business_id uuid references public.businesses (id) on delete set null,
  api_key_id uuid references public.api_keys (id) on delete set null,
  endpoint text not null,
  method text not null,
  status_code integer not null,
  duration_ms integer not null,
  ip_address text,
  user_agent text,
  request_payload jsonb,
  response_summary jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists api_request_logs_project_idx on public.api_request_logs (project_id, created_at desc);
create index if not exists api_request_logs_agency_idx on public.api_request_logs (agency_id, created_at desc);

-- 11. Atomic Function: Debit Agency Wallet for Receipt (₦100 = 10,000 kobo)
create or replace function public.debit_agency_wallet_for_receipt(
  p_agency_id uuid,
  p_project_id uuid,
  p_business_id uuid,
  p_amount_kobo bigint default 10000,
  p_reference text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_wallet public.wallets%rowtype;
  v_rel public.agency_business_relationships%rowtype;
  v_existing_tx public.wallet_transactions%rowtype;
  v_new_balance bigint;
begin
  -- 1. Idempotency Check: Return existing success if already deducted
  if p_idempotency_key is not null then
    select * into v_existing_tx
    from public.wallet_transactions
    where idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return jsonb_build_object(
        'success', true,
        'already_processed', true,
        'transaction_id', v_existing_tx.id,
        'balance_kobo', v_existing_tx.balance_after_kobo
      );
    end if;
  end if;

  -- 2. Lock Agency Wallet row
  select * into v_wallet
  from public.wallets
  where agency_id = p_agency_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'wallet_not_found',
      'message', 'Agency wallet does not exist.'
    );
  end if;

  -- 3. Verify Wallet Balance
  if v_wallet.balance_kobo < p_amount_kobo then
    return jsonb_build_object(
      'success', false,
      'error', 'insufficient_funds',
      'message', 'Agency wallet balance is insufficient. Please top up your wallet.',
      'balance_kobo', v_wallet.balance_kobo,
      'required_kobo', p_amount_kobo
    );
  end if;

  -- 4. Check Client Spending Limit
  if p_business_id is not null then
    select * into v_rel
    from public.agency_business_relationships
    where agency_id = p_agency_id and business_id = p_business_id
    for update;

    if found and v_rel.spending_limit_kobo is not null then
      if (v_rel.spent_kobo + p_amount_kobo) > v_rel.spending_limit_kobo then
        return jsonb_build_object(
          'success', false,
          'error', 'client_spending_limit_exceeded',
          'message', 'Client spending limit exceeded for this business.',
          'spent_kobo', v_rel.spent_kobo,
          'limit_kobo', v_rel.spending_limit_kobo
        );
      end if;
    end if;
  end if;

  -- 5. Deduct Balance Atomically
  v_new_balance := v_wallet.balance_kobo - p_amount_kobo;

  update public.wallets
  set balance_kobo = v_new_balance,
      total_spent_kobo = total_spent_kobo + p_amount_kobo,
      updated_at = now()
  where id = v_wallet.id;

  if v_rel.id is not null then
    update public.agency_business_relationships
    set spent_kobo = spent_kobo + p_amount_kobo,
        updated_at = now()
    where id = v_rel.id;
  end if;

  -- 6. Insert Transaction Record
  insert into public.wallet_transactions (
    wallet_id,
    agency_id,
    project_id,
    business_id,
    type,
    amount_kobo,
    balance_after_kobo,
    currency,
    reference,
    idempotency_key,
    status,
    metadata
  ) values (
    v_wallet.id,
    p_agency_id,
    p_project_id,
    p_business_id,
    'receipt_deduction',
    -p_amount_kobo,
    v_new_balance,
    'NGN',
    coalesce(p_reference, 'REC-DED-' || gen_random_uuid()::text),
    p_idempotency_key,
    'success',
    jsonb_build_object('project_id', p_project_id, 'business_id', p_business_id)
  );

  -- 7. Increment Project Receipt Counter
  if p_project_id is not null then
    update public.projects
    set receipts_count = receipts_count + 1,
        last_receipt_at = now(),
        updated_at = now()
    where id = p_project_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'already_processed', false,
    'balance_kobo', v_new_balance,
    'deducted_kobo', p_amount_kobo
  );
end;
$$;

-- 12. Atomic Function: Credit Agency Wallet (e.g. from Paystack checkout)
create or replace function public.credit_agency_wallet(
  p_agency_id uuid,
  p_amount_kobo bigint,
  p_reference text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_wallet public.wallets%rowtype;
  v_new_balance bigint;
  v_existing_tx public.wallet_transactions%rowtype;
begin
  -- Idempotency check on deposit reference (Paystack transaction reference)
  select * into v_existing_tx
  from public.wallet_transactions
  where reference = p_reference and type = 'deposit'
  limit 1;

  if found then
    return jsonb_build_object(
      'success', true,
      'already_credited', true,
      'balance_kobo', v_existing_tx.balance_after_kobo
    );
  end if;

  -- Lock or create wallet
  select * into v_wallet
  from public.wallets
  where agency_id = p_agency_id
  for update;

  if not found then
    insert into public.wallets (agency_id, balance_kobo, total_funded_kobo)
    values (p_agency_id, p_amount_kobo, p_amount_kobo)
    returning * into v_wallet;
    v_new_balance := p_amount_kobo;
  else
    v_new_balance := v_wallet.balance_kobo + p_amount_kobo;
    update public.wallets
    set balance_kobo = v_new_balance,
        total_funded_kobo = total_funded_kobo + p_amount_kobo,
        updated_at = now()
    where id = v_wallet.id;
  end if;

  -- Record in ledger
  insert into public.wallet_transactions (
    wallet_id,
    agency_id,
    type,
    amount_kobo,
    balance_after_kobo,
    currency,
    reference,
    status,
    metadata
  ) values (
    v_wallet.id,
    p_agency_id,
    'deposit',
    p_amount_kobo,
    v_new_balance,
    'NGN',
    p_reference,
    'success',
    p_metadata
  );

  return jsonb_build_object(
    'success', true,
    'balance_kobo', v_new_balance,
    'credited_kobo', p_amount_kobo
  );
end;
$$;

-- RLS & Grants
alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.wallets enable row level security;
alter table public.agency_business_relationships enable row level security;
alter table public.projects enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.api_request_logs enable row level security;

grant all on public.agencies to service_role;
grant all on public.agency_members to service_role;
grant all on public.wallets to service_role;
grant all on public.agency_business_relationships to service_role;
grant all on public.projects to service_role;
grant all on public.wallet_transactions to service_role;
grant all on public.api_request_logs to service_role;
