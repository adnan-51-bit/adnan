alter table if exists public.master_systems add column if not exists last_checked_at timestamptz;
alter table if exists public.master_systems add column if not exists next_action text not null default '';
alter table if exists public.master_systems add column if not exists source text not null default 'manual';

update public.master_systems
set last_checked_at = coalesce(last_checked_at, updated_at)
where last_checked_at is null;

create index if not exists master_systems_status_idx on public.master_systems (status);
