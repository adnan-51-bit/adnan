-- Einnahmequellen-Katalog + echte Aufgaben (27.09.2026).
-- Neue Felder starten "unbekannt"/leer - nichts wird geschaetzt. Ja/Nein-Pruefungen sind NULL, bis bewertet.
alter table public.master_einnahmequellen
  add column if not exists laufende_kosten_cent integer check (laufende_kosten_cent is null or laufende_kosten_cent >= 0),
  add column if not exists faehigkeiten text not null default '',
  add column if not exists erloesart text not null default '',
  add column if not exists nachfrage_status text not null default 'UNBEKANNT' check (nachfrage_status in ('UNBEKANNT', 'ZU_PRUEFEN', 'BELEGT')),
  add column if not exists rechtspruefung boolean,
  add column if not exists gewerbepruefung boolean,
  add column if not exists schnell_testbar boolean not null default false,
  add column if not exists direkte_kunden boolean not null default false,
  add column if not exists wiederholbar boolean not null default false,
  add column if not exists komplex boolean not null default false,
  add column if not exists automatisierungspotenzial text not null default 'UNBEKANNT' check (automatisierungspotenzial in ('UNBEKANNT', 'NIEDRIG', 'MITTEL', 'HOCH')),
  add column if not exists skalierungspotenzial text not null default 'UNBEKANNT' check (skalierungspotenzial in ('UNBEKANNT', 'NIEDRIG', 'MITTEL', 'HOCH')),
  add column if not exists automatisierungsstufe text not null default 'MANUELL' check (automatisierungsstufe in ('MANUELL', 'TEILWEISE', 'WEITGEHEND')),
  add column if not exists automatisierungsplan jsonb not null default '[]'::jsonb,
  add column if not exists quellen_liste jsonb not null default '[]'::jsonb;

-- Aufgaben: Beschreibung, naechste Aktion, Quelle, Ergebnis. Neue Status-Liste:
-- Offen / In Arbeit / Wartet auf Benutzer / Erledigt / Gestoppt ("Blockiert" = wartet auf Benutzer).
alter table public.master_tasks_v2
  add column if not exists beschreibung text not null default '',
  add column if not exists naechste_aktion text not null default '',
  add column if not exists quelle text not null default '',
  add column if not exists ergebnis text not null default '';
update public.master_tasks_v2 set status = 'Wartet auf Benutzer' where status = 'Blockiert';
