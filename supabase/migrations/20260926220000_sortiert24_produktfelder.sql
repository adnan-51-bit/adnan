-- Sortiert24 (26.09.2026): Produktfelder fuer den eigenen Shop. Alle neuen Felder sind optional und
-- starten leer - es werden KEINE Werte erfunden. Bestehende Zeilen bleiben unveraendert.
alter table public.ecommerce_products add column if not exists beschreibung text not null default '';
alter table public.ecommerce_products add column if not exists bilder text[] not null default '{}';
alter table public.ecommerce_products add column if not exists bestand integer;
alter table public.ecommerce_products add column if not exists lieferzeit text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ecommerce_products_bestand_check') then
    alter table public.ecommerce_products add constraint ecommerce_products_bestand_check check (bestand is null or bestand >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ecommerce_products_bilder_check') then
    alter table public.ecommerce_products add constraint ecommerce_products_bilder_check check (cardinality(bilder) <= 8);
  end if;
end $$;
