create table if not exists public.businesses (
  id text primary key,
  name text not null,
  type text not null default 'Geschäftsbereich',
  status text not null default 'OPEN',
  health text not null default '⚪',
  revenue text not null default '—',
  link text not null default '#',
  modules jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.master_tasks (
  id bigint generated always as identity primary key,
  title text not null,
  area text not null,
  status text not null default 'Offen',
  priority text not null default 'Mittel',
  updated_at timestamptz not null default now()
);

alter table public.businesses enable row level security;
alter table public.master_tasks enable row level security;

-- No public policies are created here. Server-side access must use a protected service credential.
