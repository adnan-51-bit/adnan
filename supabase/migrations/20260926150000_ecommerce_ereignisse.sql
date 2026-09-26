-- E-Commerce: Bestell-Ereignisse und Webhook-Belege dauerhaft speichern (26.09.2026).
-- Vorher lagen beide nur im Prozessspeicher (lib/store.js, lib/idempotency.js): nach jedem
-- Neustart waren Ereignisverlauf und Duplikatschutz weg. Die Eindeutigkeit (idempotency_key /
-- key) erzwingt die Datenbank selbst - ein doppelt eingehendes Ereignis kann nicht zweimal wirken.

create table if not exists public.ecommerce_order_events (
  id text primary key,
  business_id text not null default 'ecommerce' check (business_id = 'ecommerce'),
  order_id text not null references public.ecommerce_orders(id),
  type text not null,
  from_status text,
  to_status text,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists ecommerce_order_events_order_idx on public.ecommerce_order_events (order_id, created_at desc);

create table if not exists public.ecommerce_webhook_receipts (
  key text primary key,
  business_id text not null default 'ecommerce' check (business_id = 'ecommerce'),
  provider text not null,
  received_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['ecommerce_order_events','ecommerce_webhook_receipts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;
