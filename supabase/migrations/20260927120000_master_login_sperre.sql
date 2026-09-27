-- Sperre nach Fehlversuchen fuer die Master-Zentrale (27.09.2026): Adnan nutzt kuenftig denselben (kurzen)
-- Code wie beim Werknetz24-Login. Werknetz24 sperrt nach 5 Fehlversuchen 15 Minuten - hier jetzt genauso.
-- Pro IP ein Zaehler; nur serverseitig (service_role), kein oeffentlicher Zugriff.
create table if not exists public.master_login_sperre (
  ip text primary key,
  fehlversuche integer not null default 0 check (fehlversuche >= 0),
  erster_fehler timestamptz not null default now()
);
alter table public.master_login_sperre enable row level security;
revoke all on public.master_login_sperre from anon, authenticated;
grant select, insert, update, delete on public.master_login_sperre to service_role;
