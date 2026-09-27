-- Erster-Kunde-Modus (27.09.2026): Ort und Branche je Betrieb (potenzieller Kunde). Nur oeffentlich belegte Angaben.
alter table public.master_leads
  add column if not exists ort text not null default '',
  add column if not exists branche text not null default '';
