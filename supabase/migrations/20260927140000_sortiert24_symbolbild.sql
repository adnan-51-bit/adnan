-- Sortiert24 (27.09.2026): Bildart + Bildnachweis. Adnan hat entschieden, frei lizenzierte Symbolbilder zu zeigen,
-- bis echte Produktfotos vorliegen. Ein Symbolbild wird ueberall als solches gekennzeichnet und reicht NICHT fuer
-- die Produktfreigabe (Pruefpunkt "Bilder" verlangt ein echtes Produktfoto).
alter table public.ecommerce_products add column if not exists bildart text;
alter table public.ecommerce_products add column if not exists bildnachweis text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ecommerce_products_bildart_check') then
    alter table public.ecommerce_products add constraint ecommerce_products_bildart_check check (bildart is null or bildart in ('produktfoto', 'symbolbild'));
  end if;
end $$;
