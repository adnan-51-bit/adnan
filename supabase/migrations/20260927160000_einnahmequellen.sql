-- Master-Zentrale: Einnahmequellen (27.09.2026). Eigene Tabelle, getrennt von Werknetz24 und E-Commerce.
-- Jede Idee durchlaeuft Pruefschritte (Markt, Nachfrage, Konkurrenz, Kosten, Recht, kostenloser Test) mit
-- Quellen, bevor sie in den Test darf. Betraege in Cent; keine erfundenen Werte (alles startet leer/0).
create table if not exists public.master_einnahmequellen (
  id text primary key,
  name text not null,
  kategorie text not null default '',
  zielgruppe text not null default '',
  angebot text not null default '',
  preis text not null default '',            -- moeglicher Preis inkl. Quelle (Text, weil oft Spanne)
  startkosten_cent integer check (startkosten_cent is null or startkosten_cent >= 0),
  werkzeuge text not null default '',
  aufwand text not null default '',
  rechtliches text not null default '',
  markt text not null default '',
  nachfrage text not null default '',
  konkurrenz text not null default '',
  kosten_pruefung text not null default '',
  quellen text not null default '',
  kostenloser_test text not null default '',
  test_status text not null default '',
  erste_kunden integer not null default 0 check (erste_kunden >= 0),
  einnahmen_cent integer not null default 0 check (einnahmen_cent >= 0),
  kosten_cent integer not null default 0 check (kosten_cent >= 0),
  status text not null default 'IDEE' check (status in ('IDEE', 'PRUEFUNG', 'TEST', 'ERSTER_KUNDE', 'AKTIV', 'PAUSE')),
  verweis text,
  notiz text not null default '',
  erstellt_am timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now()
);
alter table public.master_einnahmequellen enable row level security;
revoke all on public.master_einnahmequellen from anon, authenticated;
grant select, insert, update, delete on public.master_einnahmequellen to service_role;
