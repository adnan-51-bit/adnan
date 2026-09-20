create table if not exists public.master_finance_entries (
  id bigint generated always as identity primary key,
  business_id text,
  kind text not null check (kind in ('income','expense')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'EUR',
  category text not null,
  description text not null default '',
  status text not null default 'confirmed' check (status in ('confirmed','pending','cancelled')),
  source text not null default 'manual',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.master_finance_entries enable row level security;
revoke all on public.master_finance_entries from anon, authenticated;
grant select, insert, update, delete on public.master_finance_entries to service_role;
create index if not exists master_finance_entries_occurred_at_idx on public.master_finance_entries (occurred_at desc);
