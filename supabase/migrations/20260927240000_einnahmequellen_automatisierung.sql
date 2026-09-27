-- Einnahmequellen Teil 3A (27.09.2026): einheitlicher Ablauf
--   Idee -> Pruefung -> Test -> Automatisieren -> Veroeffentlichung -> Leads/Kunden -> Einnahmen -> Skalieren (+ Pause)
-- sowie Leads, gespeicherte Entwuerfe (Texte/E-Mails/Ideen), benoetigte Konten, Ergebnisse, Veroeffentlichungs-Nachweis.
alter table public.master_einnahmequellen
  add column if not exists benoetigte_konten text not null default '',
  add column if not exists ergebnisse text not null default '',
  add column if not exists veroeffentlichung text not null default '',
  add column if not exists leads jsonb not null default '[]'::jsonb,
  add column if not exists entwuerfe jsonb not null default '[]'::jsonb;

-- Alte Stufen auf den einheitlichen Ablauf abbilden (bestehende Daten nutzen nur IDEE/PRUEFUNG/PAUSE).
update public.master_einnahmequellen set status = 'TEST' where status = 'INTERESSE';
update public.master_einnahmequellen set status = 'LEADS_KUNDEN' where status = 'ERSTER_KUNDE';
update public.master_einnahmequellen set status = 'EINNAHMEN' where status in ('AKTIV', 'WIEDERHOLBAR');
update public.master_einnahmequellen set status_vor_pause = case status_vor_pause when 'INTERESSE' then 'TEST' when 'ERSTER_KUNDE' then 'LEADS_KUNDEN' when 'AKTIV' then 'EINNAHMEN' when 'WIEDERHOLBAR' then 'EINNAHMEN' else status_vor_pause end;

alter table public.master_einnahmequellen drop constraint if exists master_einnahmequellen_status_check;
alter table public.master_einnahmequellen add constraint master_einnahmequellen_status_check
  check (status in ('IDEE', 'PRUEFUNG', 'TEST', 'AUTOMATISIERT', 'VEROEFFENTLICHT', 'LEADS_KUNDEN', 'EINNAHMEN', 'SKALIEREN', 'PAUSE'));
