# Persistenz & Order Service

Stand: 2026-09-20

## Jetzt umgesetzt

- zentraler Order-Service
- Event-Speicherung als austauschbare Store-Schicht
- Order-State aus Events
- Duplicate-Schutz über Idempotency-Key
- GET/POST /api/orders
- kontrollierter Stripe-Webhook-Eingang als Scaffold

## Bewusste Grenze

Der aktuelle Store ist nur Prozess-Speicher. Ein Neustart löscht ihn. Das ist **nicht produktionsbereit**.

Der Stripe-Webhook ist derzeit bewusst vollständig gesperrt. Er verarbeitet keine Zahlungsereignisse. Für Produktion muss die offizielle Stripe-Signaturprüfung mit der offiziellen Stripe-Bibliothek und persistenter Speicherung implementiert werden.

## Produktionsschritt

1. persistente Datenbank
2. offizielle Stripe-Signaturprüfung
3. Webhook-Event in Datenbank speichern
4. Order-Service transaktional machen
5. Queue/Background Processing
6. Supplier Connector
7. Tracking
8. Notifications

## Quality Gate

Kein echter Fulfillment-Auftrag darf ausschließlich aufgrund dieses Scaffolds entstehen.
