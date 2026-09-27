-- Teil 4A (27.09.2026): Content & Werbung + zentrale Freigaben.
-- Content: Ablauf Idee -> Recherche -> Skript -> Content erstellen -> Pruefung -> Veroeffentlichung -> Reichweite -> Leads -> Einnahmen.
-- Kennzahlen werden nur echt eingetragen (z. B. aus der Statistik der Plattform), nie geschaetzt.
create table if not exists public.master_content (
  id text primary key,
  titel text not null,
  einnahmequelle_id text,
  typ text not null default 'VIDEO' check (typ in ('VIDEO', 'BEITRAG', 'WERBETEXT', 'BILD', 'ARTIKEL')),
  plattformen jsonb not null default '[]'::jsonb,
  thema text not null default '',
  recherche text not null default '',
  quellen_liste jsonb not null default '[]'::jsonb,
  skript text not null default '',
  titel_varianten jsonb not null default '[]'::jsonb,
  beschreibung text not null default '',
  varianten jsonb not null default '{}'::jsonb,
  bilder jsonb not null default '[]'::jsonb,
  angebot_info text not null default '',
  werbetext text not null default '',
  social_posts jsonb not null default '[]'::jsonb,
  werbung boolean not null default false,
  veroeffentlichung jsonb not null default '[]'::jsonb,
  kennzahlen jsonb not null default '[]'::jsonb,
  ergebnis text not null default '',
  notiz text not null default '',
  status text not null default 'IDEE' check (status in ('IDEE', 'RECHERCHE', 'SKRIPT', 'ERSTELLT', 'PRUEFUNG', 'VEROEFFENTLICHT', 'REICHWEITE', 'LEADS', 'EINNAHMEN', 'VERWORFEN')),
  freigegeben boolean not null default false,
  erstellt_am timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now()
);
alter table public.master_content enable row level security;
revoke all on public.master_content from anon, authenticated;
grant select, insert, update, delete on public.master_content to service_role;

-- "Wartet auf Freigabe": nur Dinge, die Adnans persoenliche Entscheidung brauchen.
create table if not exists public.master_freigaben (
  id text primary key,
  art text not null check (art in ('VEROEFFENTLICHUNG', 'KOSTEN', 'WERKZEUG', 'AUTOMATISIERUNG', 'RECHT')),
  titel text not null,
  beschreibung text not null default '',
  kosten text not null default '',
  bereich text not null default '',
  bezug_typ text,
  bezug_id text,
  status text not null default 'OFFEN' check (status in ('OFFEN', 'FREIGEGEBEN', 'ABGELEHNT')),
  entscheidung_notiz text not null default '',
  entschieden_am timestamptz,
  erstellt_am timestamptz not null default now()
);
create unique index if not exists master_freigaben_offen_bezug on public.master_freigaben (art, bezug_typ, bezug_id) where status = 'OFFEN';
alter table public.master_freigaben enable row level security;
revoke all on public.master_freigaben from anon, authenticated;
grant select, insert, update, delete on public.master_freigaben to service_role;
