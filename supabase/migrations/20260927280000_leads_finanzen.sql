-- Teil 4B (27.09.2026): E-Mail & Leads + Einnahmen je Einnahmequelle.
-- Zentrale Lead-Liste der Einnahmequellen (getrennt von Werknetz24-Leads und E-Commerce-Kunden).
create table if not exists public.master_leads (
  id text primary key,
  einnahmequelle_id text,
  name text not null,
  firma text not null default '',
  email text not null default '',
  telefon text not null default '',
  quelle text not null default '',
  selbst_angefragt boolean not null default false,
  einwilligung boolean not null default false,
  status text not null default 'NEU' check (status in ('NEU', 'INTERESSENT', 'KONTAKT', 'ANGEBOT', 'KUNDE', 'VERLOREN', 'GESPERRT')),
  rohtext text not null default '',
  notiz text not null default '',
  nachrichten jsonb not null default '[]'::jsonb,
  angebot jsonb,
  naechster_schritt text not null default '',
  erstellt_am timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now()
);
create index if not exists master_leads_eq_idx on public.master_leads (einnahmequelle_id);
alter table public.master_leads enable row level security;
revoke all on public.master_leads from anon, authenticated;
grant select, insert, update, delete on public.master_leads to service_role;

-- Finanzbuchungen: Bezug zu Einnahmequelle/Lead und Test-Kennzeichen (Testbuchungen zaehlen nie als echte Einnahmen).
alter table public.master_finance_entries
  add column if not exists einnahmequelle_id text,
  add column if not exists lead_id text,
  add column if not exists ist_test boolean not null default false;
create index if not exists master_finance_eq_idx on public.master_finance_entries (einnahmequelle_id);
