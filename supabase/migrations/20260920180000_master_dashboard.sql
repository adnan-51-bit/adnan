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

create table if not exists public.master_audit_log (id bigint generated always as identity primary key, actor text not null default 'system', action text not null, entity_type text not null, entity_id text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists master_audit_log_created_at_idx on public.master_audit_log (created_at desc);
alter table public.master_audit_log enable row level security;
revoke all on public.businesses from anon, authenticated;
revoke all on public.master_tasks from anon, authenticated;
revoke all on public.master_audit_log from anon, authenticated;
grant select, insert, update, delete on public.businesses to service_role;
grant select, insert, update, delete on public.master_tasks to service_role;
grant select, insert on public.master_audit_log to service_role;
