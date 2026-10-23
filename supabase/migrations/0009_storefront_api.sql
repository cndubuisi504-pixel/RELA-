-- 0009 — Storefront API keys and API receipts
-- Provides authenticated endpoints for approved storefronts to issue receipts,
-- generate verifiable documents, and download PDFs.

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  business_id uuid references public.businesses (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  rate_limit_per_minute integer not null default 120,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists api_keys_hash_idx on public.api_keys (key_hash);
create index if not exists api_keys_business_idx on public.api_keys (business_id);

create table if not exists public.api_receipts (
  id text primary key,
  document_id uuid references public.documents (id) on delete set null,
  api_key_id uuid references public.api_keys (id) on delete set null,
  receipt_number text not null,
  order_number text,
  business_name text not null,
  business_address text,
  business_phone text,
  business_email text,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  items jsonb not null default '[]'::jsonb,
  charges jsonb not null default '[]'::jsonb,
  discount numeric not null default 0,
  tax numeric not null default 0,
  total_amount numeric not null default 0,
  currency text not null default 'NGN',
  payment_method text,
  payment_reference text,
  payment_status text not null default 'paid',
  purchase_date timestamptz not null default now(),
  verification_url text not null,
  public_token text not null,
  download_token text not null,
  pdf_base64 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists api_receipts_public_token_idx on public.api_receipts (public_token);
create index if not exists api_receipts_download_token_idx on public.api_receipts (download_token);
create index if not exists api_receipts_receipt_number_idx on public.api_receipts (receipt_number);
create index if not exists api_receipts_order_number_idx on public.api_receipts (order_number);

alter table public.api_keys enable row level security;
alter table public.api_receipts enable row level security;

grant all on public.api_keys to service_role;
grant all on public.api_receipts to service_role;
