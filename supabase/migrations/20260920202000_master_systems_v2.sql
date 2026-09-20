alter table if exists public.master_systems add column if not exists last_checked_at timestamptz;
alter table if exists public.master_systems add column if not exists next_action text not null default '';
alter table if exists public.master_systems add column if not exists source text not null default 'manual';

update public.master_systems
set last_checked_at = coalesce(last_checked_at, updated_at)
where last_checked_at is null;

create index if not exists master_systems_status_idx on public.master_systems (status);

insert into public.master_systems (id,name,status,note,next_action,source)
values
('github','GitHub','🟢','Code & Dokumentation','CI/Repository-Status prüfen','manual'),
('vercel','Vercel','🟡','Deployment','Deployment-Status des aktuellen Commits verifizieren','manual'),
('supabase','Supabase','🟡','Persistente Datenhaltung','Projekt/Secrets/Migration/Smoke-Test durchführen','manual'),
('famulor','Famulor','🟢','Werknetz24 Telefon','Konfiguration bei Bedarf prüfen','manual'),
('easybell','Easybell','🟡','Telefonie / Weiterleitung','Weiterleitung und Zielnummer testen','manual'),
('stripe','Stripe','🔴','Produktiv noch gesperrt','Signaturprüfung + persistenter Webhook-Store vor Aktivierung','manual'),
('paypal','PayPal','🟡','Zahlungsanbieter','Integration erst nach sicherem Payment-Gate','manual'),
('shopify','Shopify','🟡','Webhook-Schicht vorhanden','Echte Shop-Konfiguration und persistente Idempotenz prüfen','manual'),
('email','E-Mail','🟡','Connector offen','Provider und sichere Versandkonfiguration festlegen','manual'),
('slack','Slack','🟡','Connector offen','Workspace/Channel und Benachrichtigungsregeln festlegen','manual')
on conflict (id) do nothing;
