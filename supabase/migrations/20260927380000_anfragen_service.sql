-- Pilot Anfragen-Service (27.09.2026): eingehende Online-Anfragen eines (spaeteren) Kunden-Betriebs erfassen,
-- automatisch analysieren und Antwortentwuerfe vorbereiten. Nichts wird automatisch gesendet.
-- Testfaelle tragen ist_test = true und werden nach dem Test archiviert (status ARCHIVIERT), nie mit echten Daten vermischt.
create table if not exists public.master_anfragen (
  id text primary key,
  einnahmequelle_id text,
  kunde_lead_id text,
  datum timestamptz not null default now(),
  quelle text not null default '',
  unternehmen text not null default '',
  text text not null default '',
  status text not null default 'NEU' check (status in ('NEU', 'ANALYSIERT', 'ENTWURF', 'WARTET_AUF_FREIGABE', 'ERLEDIGT', 'ARCHIVIERT')),
  prioritaet text not null default 'Mittel' check (prioritaet in ('Hoch', 'Mittel', 'Niedrig')),
  naechste_aktion text not null default '',
  kategorie text not null default '',
  dringlichkeit text not null default '',
  analyse jsonb not null default '{}'::jsonb,
  entwuerfe jsonb not null default '{}'::jsonb,
  task_id text,
  ergebnis text not null default '',
  verlauf jsonb not null default '[]'::jsonb,
  ist_test boolean not null default false,
  erstellt_am timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now()
);
alter table public.master_anfragen enable row level security;
create index if not exists master_anfragen_eq_idx on public.master_anfragen (einnahmequelle_id);
