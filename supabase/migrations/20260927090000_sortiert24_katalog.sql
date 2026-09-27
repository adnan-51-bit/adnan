-- Sortiert24-Produktkatalog (27.09.2026): vollstaendige Produktdaten, Quellen je Zahl, Bildrechte und
-- Katalogstatus (RECHERCHIEREN / GEPRUEFT / BEREIT / GESPERRT). Alle neuen Felder starten leer bzw.
-- auf RECHERCHIEREN - es werden keine Werte erfunden. Bestehende Zeilen bleiben inhaltlich unveraendert.
alter table public.ecommerce_products add column if not exists kurzbeschreibung text not null default '';
alter table public.ecommerce_products add column if not exists vorteile text[] not null default '{}';
alter table public.ecommerce_products add column if not exists technische_daten text not null default '';
alter table public.ecommerce_products add column if not exists lieferumfang text not null default '';
alter table public.ecommerce_products add column if not exists hersteller text;
alter table public.ecommerce_products add column if not exists sku text;
alter table public.ecommerce_products add column if not exists ean text;
alter table public.ecommerce_products add column if not exists lieferanten_url text;
alter table public.ecommerce_products add column if not exists ek_quelle text;
alter table public.ecommerce_products add column if not exists versand_quelle text;
alter table public.ecommerce_products add column if not exists sonstige_kosten_cent integer;
alter table public.ecommerce_products add column if not exists sonstige_kosten_quelle text;
alter table public.ecommerce_products add column if not exists bildquelle text;
alter table public.ecommerce_products add column if not exists bildrechte text not null default 'ungeklaert';
alter table public.ecommerce_products add column if not exists katalog_status text not null default 'RECHERCHIEREN';
alter table public.ecommerce_products add column if not exists geprueft_am timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ecommerce_products_bildrechte_check') then
    alter table public.ecommerce_products add constraint ecommerce_products_bildrechte_check
      check (bildrechte in ('ungeklaert', 'haendlerfreigabe', 'eigene', 'lizenz'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ecommerce_products_katalog_status_check') then
    alter table public.ecommerce_products add constraint ecommerce_products_katalog_status_check
      check (katalog_status in ('RECHERCHIEREN', 'GEPRUEFT', 'BEREIT', 'GESPERRT'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ecommerce_products_sonstige_kosten_check') then
    alter table public.ecommerce_products add constraint ecommerce_products_sonstige_kosten_check
      check (sonstige_kosten_cent is null or sonstige_kosten_cent >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ecommerce_products_ean_check') then
    alter table public.ecommerce_products add constraint ecommerce_products_ean_check
      check (ean is null or ean ~ '^([0-9]{8}|[0-9]{13})$');
  end if;
end $$;
