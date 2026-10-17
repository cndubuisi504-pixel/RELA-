-- Single-row site settings: things only the Rela team may change, everyone may read.
create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  logo_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

alter table public.site_settings enable row level security;

drop policy if exists site_settings_read on public.site_settings;
create policy site_settings_read on public.site_settings
  for select using (true);

-- No insert/update/delete policies: writes happen only via the service role
-- (admin server action), which bypasses RLS.
insert into public.site_settings (id) values (true)
on conflict (id) do nothing;
