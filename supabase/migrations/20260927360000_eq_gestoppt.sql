-- Teil 5 (27.09.2026): Einnahmequellen koennen endgueltig GESTOPPT werden (Daten bleiben erhalten, wie PAUSE).
alter table public.master_einnahmequellen drop constraint if exists master_einnahmequellen_status_check;
alter table public.master_einnahmequellen add constraint master_einnahmequellen_status_check
  check (status in ('IDEE', 'PRUEFUNG', 'TEST', 'AUTOMATISIERT', 'VEROEFFENTLICHT', 'LEADS_KUNDEN', 'EINNAHMEN', 'SKALIEREN', 'PAUSE', 'GESTOPPT'));
