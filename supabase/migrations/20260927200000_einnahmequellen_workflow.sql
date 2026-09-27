-- Einnahmequellen-Workflow (27.09.2026): Interesse -> Wiederholbar -> Automatisieren -> Skalieren,
-- dazu Steuerfelder, eigene Kundenliste je Einnahmequelle und Verknuepfung zentraler Aufgaben.
-- Alles startet leer - keine erfundenen Werte.
alter table public.master_einnahmequellen
  add column if not exists beschreibung text not null default '',
  add column if not exists schritte text not null default '',
  add column if not exists naechste_aufgabe text not null default '',
  add column if not exists verantwortlich text not null default '',
  add column if not exists automatisierungsgrad integer not null default 0 check (automatisierungsgrad between 0 and 100),
  add column if not exists automatisierung text not null default '',
  add column if not exists moegliche_einnahmen text not null default '',
  add column if not exists risiken text not null default '',
  add column if not exists benutzeraktion text not null default '',
  add column if not exists interesse_nachweis text not null default '',
  add column if not exists kunden jsonb not null default '[]'::jsonb,
  add column if not exists status_vor_pause text;

alter table public.master_einnahmequellen drop constraint if exists master_einnahmequellen_status_check;
alter table public.master_einnahmequellen add constraint master_einnahmequellen_status_check
  check (status in ('IDEE', 'PRUEFUNG', 'TEST', 'INTERESSE', 'ERSTER_KUNDE', 'AKTIV', 'WIEDERHOLBAR', 'AUTOMATISIERT', 'SKALIEREN', 'PAUSE'));

-- Zentrale Aufgaben koennen einer Einnahmequelle gehoeren (bleiben in der einen Aufgabenliste sichtbar).
alter table public.master_tasks_v2 add column if not exists einnahmequelle_id text;
create index if not exists master_tasks_v2_einnahmequelle_idx on public.master_tasks_v2 (einnahmequelle_id);
create index if not exists master_audit_log_entity_idx on public.master_audit_log (entity_type, entity_id);
