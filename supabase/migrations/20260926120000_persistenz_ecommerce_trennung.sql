-- Persistenz für Master-Zentrale + E-Commerce (26.09.2026, Supabase Free, Region fra1).
-- Ergänzt, was der vorhandene Adapter-Code (lib/ecommerce-store.js, lib/master-tasks.js,
-- lib/master-store.js, lib/master-systems.js) erwartet, in den bisherigen Migrationen aber fehlte.
-- Die älteren Migrationsdateien bleiben unverändert (Historie).
--
-- Datentrennung wird in der Datenbank selbst erzwungen, nicht nur im Code:
--   * alle ecommerce_*-Tabellen: business_id ist fest 'ecommerce' (CHECK) - ein Werknetz24-
--     Datensatz kann dort technisch nicht gespeichert werden;
--   * Werknetz24 hat hier KEINE eigenen Tabellen - seine Daten bleiben ausschließlich im
--     Werknetz24-eigenen Speicher (Upstash) und werden nur live durchgereicht;
--   * master_tasks_v2 / master_finance_entries: business_id nur aus der bekannten Liste.
-- Zugriff nur serverseitig (service_role); anon/authenticated haben keinerlei Rechte, RLS aktiv
-- ohne öffentliche Policies.

-- ============ Master: fehlende business_id bei Aufgaben ============
alter table public.master_tasks_v2 add column if not exists business_id text not null default 'master';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'master_tasks_v2_business_id_check') then
    alter table public.master_tasks_v2 add constraint master_tasks_v2_business_id_check
      check (business_id in ('master','werknetz24','ecommerce','future'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'master_finance_entries_business_id_check') then
    alter table public.master_finance_entries add constraint master_finance_entries_business_id_check
      check (business_id is null or business_id in ('werknetz24','ecommerce','future'));
  end if;
end $$;
create index if not exists master_tasks_v2_business_id_idx on public.master_tasks_v2 (business_id);
create index if not exists master_finance_entries_business_id_idx on public.master_finance_entries (business_id);

-- ============ Master: Startdaten (identisch zu den bisherigen Code-Seeds, keine neuen Werte) ============
insert into public.businesses (id, name, type, status, health, revenue, link, modules) values
  ('werknetz24','Werknetz24','Bestehender Betrieb','EXTERNAL','🟡','—','/werknetz24','["Lisa / Telefon","Kunden","Leads","Aufträge","Rechnungen","Finanzen","Integrationen"]'::jsonb),
  ('ecommerce','E-Commerce','Geschäftsbereich','CODE EXISTS','🟡','0 €','/e-commerce','["Produkte","Lieferanten","Bestellungen","Shop","Marketing","Retouren","Finanzen"]'::jsonb),
  ('future','Weiterer Betrieb','Vorbereitet','OPEN','⚪','—','#','["Kunden","Aufgaben","Finanzen","Reports"]'::jsonb)
on conflict (id) do nothing;

insert into public.master_tasks_v2 (title, area, business_id, status, priority, owner)
select * from (values
  ('Persistenz fertigstellen','System','master','In Arbeit','Hoch','system'),
  ('Stripe sicher anbinden','Zahlungen','ecommerce','Blockiert','Hoch','system'),
  ('Lieferanten-Connector vorbereiten','E-Commerce','ecommerce','Offen','Mittel','system'),
  ('Master-Zentrale Quality Gate','Master','master','In Arbeit','Hoch','system')
) as seed(title, area, business_id, status, priority, owner)
where not exists (select 1 from public.master_tasks_v2);

-- Audit-Fund F9: die Migration vom 20.09. setzte Famulor fest auf 🟢. Ehrlicher Stand wie im Code.
update public.master_systems set status = '🟡',
  note = 'Werknetz24 Telefon (Lisa) - kein Live-Check möglich (FAMULOR_API_KEY fehlt), Status laut Werknetz24: nicht bestätigt',
  next_action = 'Letzten Anruf in der Agenten-Zentrale prüfen; FAMULOR_API_KEY ist Adnans Entscheidung'
where id = 'famulor' and status = '🟢' and note = 'Werknetz24 Telefon';

-- ============ E-Commerce ============
create table if not exists public.ecommerce_suppliers (
  id text primary key,
  business_id text not null default 'ecommerce' check (business_id = 'ecommerce'),
  name text not null,
  region text not null,
  categories text not null default '',
  modell text not null default '',
  neutral boolean not null default false,
  risiko text not null default 'unbekannt',
  quelle_url text,
  notiz text not null default '',
  status text not null default 'recherchiert' check (status in ('recherchiert','geprueft','verifiziert','abgelehnt')),
  erstellt_am timestamptz not null default now()
);

create table if not exists public.ecommerce_products (
  id text primary key,
  business_id text not null default 'ecommerce' check (business_id = 'ecommerce'),
  name text not null,
  kategorie text not null,
  supplier_id text references public.ecommerce_suppliers(id) on delete set null,
  einkaufspreis_cent integer check (einkaufspreis_cent is null or einkaufspreis_cent >= 0),
  versandkosten_cent integer check (versandkosten_cent is null or versandkosten_cent >= 0),
  verkaufspreis_cent integer not null check (verkaufspreis_cent > 0),
  pipeline_status text not null default 'IDEA' check (pipeline_status in ('IDEA','RESEARCH','SUPPLIER_CHECK','PRODUCT_CHECK','LEGAL_CHECK','MARGIN_CHECK','IMAGE_CHECK','COPY_CHECK','QUALITY_GATE','READY','PUBLISHED')),
  notiz text not null default '',
  erstellt_am timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now()
);

create table if not exists public.ecommerce_customers (
  id text primary key,
  business_id text not null default 'ecommerce' check (business_id = 'ecommerce'),
  name text not null,
  email text not null,
  adresse text,
  erstellt_am timestamptz not null default now()
);

create table if not exists public.ecommerce_orders (
  id text primary key,
  business_id text not null default 'ecommerce' check (business_id = 'ecommerce'),
  kunde_id text not null references public.ecommerce_customers(id),
  positionen jsonb not null,
  status text not null default 'payment_pending' check (status in ('payment_pending','paid','validated','supplier_pending','supplier_ordered','fulfilled','tracking_available','delivered','cancelled','blocked')),
  tracking_nummer text,
  erstellt_am timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now()
);

create table if not exists public.ecommerce_returns (
  id text primary key,
  business_id text not null default 'ecommerce' check (business_id = 'ecommerce'),
  bestellung_id text not null references public.ecommerce_orders(id),
  grund text not null,
  status text not null default 'angefragt' check (status in ('angefragt','genehmigt','abgelehnt','erhalten','erstattet')),
  erstellt_am timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['ecommerce_suppliers','ecommerce_products','ecommerce_customers','ecommerce_orders','ecommerce_returns'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;

-- Startdaten: dieselbe echte Recherche wie bisher im Code (lib/ecommerce-store.js seedSuppliers/
-- seedProducts), Quellen-URLs unverändert, offene Preise bleiben NULL. Keine Kunden/Bestellungen.
insert into public.ecommerce_suppliers (id, name, region, categories, modell, neutral, risiko, quelle_url, notiz, status) values
  ('sup_clp','CLP','Deutschland','Wohnen, Garten, Sport, Wellness','Direktversand',true,'niedrig','https://www.clp.de/haendler','Lagert, verpackt und versendet direkt an Endkunden im Namen des Händlers.','recherchiert'),
  ('sup_tm_textil','T.M. Textil','Deutschland','Heimtextilien','Blind Shipping',true,'niedrig','https://www.tm-textil.de/en/dropshipping.html','900+ SKUs im deutschen Lager, 24/48h Versand laut Anbieter, kein MOQ.','recherchiert'),
  ('sup_chilitec','ChiliTec','Deutschland','Haushalt, Technik, Zubehör','Neutralversand',true,'mittel','https://www.chilitec.de/versand-und-zahlung/dropshipping/','Direktversand an Kunden; Mindestbestellwert 10 € netto und 7,50 € Versandpauschale innerhalb Deutschlands laut Anbieter.','recherchiert'),
  ('sup_krempl','Hans Krempl','Deutschland','Haustechnik','Direktversand',true,'mittel','https://www.krempl.de/en/dropshipping/','Versand direkt aus dem Lager an Kunden; neutraler Versand in eigenem Namen laut Anbieter.','recherchiert'),
  ('sup_dropply','Dropply','EU','Nahrungsergänzung','Dropshipping',true,'hoch','https://www.dropply.eu/de','Nur B2B; EU-USt-IdNr. erforderlich. Für den Start bewusst nicht priorisiert.','recherchiert'),
  ('sup_bigbuy','BigBuy','EU','Gemischtes Sortiment','Dropshipping',true,'mittel','https://www.bigbuy.eu/','Breites Sortiment und Multi-Channel-Ausrichtung; Preise, Gebühren und konkrete Produktmargen separat prüfen.','recherchiert')
on conflict (id) do nothing;

insert into public.ecommerce_products (id, name, kategorie, supplier_id, einkaufspreis_cent, versandkosten_cent, verkaufspreis_cent, pipeline_status, notiz) values
  ('prod_auto_organizer','Kofferraum-Organizer','Auto & Ordnung',null,null,null,2499,'RESEARCH','Direktversand-Partner und Gesamtkosten prüfen.'),
  ('prod_drawer','Schubladen-Organizer','Haushalt',null,121,null,1890,'RESEARCH','Dropshipping-Lieferant mit kleiner MOQ finden.'),
  ('prod_dog_bottle','Hunde-Reisetrinkflasche','Tierbedarf',null,null,null,1990,'IDEA','Direktversand + EK verifizieren.'),
  ('prod_cable','Kabel-Organizer 5er','Ordnung & Zubehör','sup_chilitec',null,750,1990,'SUPPLIER_CHECK','Händler-EK nach Login + Retourenprozess prüfen.'),
  ('prod_textile','Heimtextilien','Wohnen','sup_tm_textil',null,null,2990,'SUPPLIER_CHECK','Händlerkonto + konkretes Produkt + EK prüfen.'),
  ('prod_garden','Garten-Organizer/Zubehör','Garten',null,null,null,2990,'IDEA','Produktrecherche starten.')
on conflict (id) do nothing;
