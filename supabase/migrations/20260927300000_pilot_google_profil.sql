-- Teil 5 (27.09.2026): Pilot "Pflege Google-Unternehmensprofil".
-- Profil-Analyse je Betrieb (Lead), monatliche Leistung (Vertrag) je Kunde, Pilot-Einstellungen je Einnahmequelle.
alter table public.master_leads
  add column if not exists profil_analyse jsonb,
  add column if not exists vertrag jsonb;
alter table public.master_einnahmequellen
  add column if not exists pilot jsonb;
-- Neue Freigabe-Art fuer persoenliche Entscheidungen (z. B. Preis festlegen).
alter table public.master_freigaben drop constraint if exists master_freigaben_art_check;
alter table public.master_freigaben add constraint master_freigaben_art_check
  check (art in ('VEROEFFENTLICHUNG', 'KOSTEN', 'WERKZEUG', 'AUTOMATISIERUNG', 'RECHT', 'ENTSCHEIDUNG'));
