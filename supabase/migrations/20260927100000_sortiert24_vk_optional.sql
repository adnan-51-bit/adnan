-- Sortiert24 (27.09.2026): Verkaufspreis darf leer sein (= noch nicht kalkuliert). Vorher Pflichtfeld - fuer
-- Recherche-Kandidaten ohne belegten Einkaufspreis haette sonst ein Preis erfunden werden muessen.
-- Die bestehende Regel "falls gesetzt, dann > 0" bleibt.
alter table public.ecommerce_products alter column verkaufspreis_cent drop not null;
