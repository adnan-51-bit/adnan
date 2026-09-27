-- Verkaufsprozess Google-Profil (27.09.2026): Website je Betrieb + CRM-Nachweise (Kontakt-Freigabe durch Adnan,
-- schriftliche/digitale Zustimmung des Kunden, Google-Zugang als Administrator, Aenderungsprotokoll, Beendigung).
alter table public.master_leads
  add column if not exists website text not null default '',
  add column if not exists pilot_crm jsonb not null default '{}'::jsonb;
