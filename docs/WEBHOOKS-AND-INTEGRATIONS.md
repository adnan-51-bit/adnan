# Webhooks & Integrationen

Stand: 2026-09-20

## Technische Basis

Die Master-Zentrale besitzt jetzt einen provider-unabhängigen Webhook-Eingang für Shopify.

Route:
- POST /api/webhooks/shopify

Sicherheitsregeln:
- HMAC-Signatur wird mit SHOPIFY_WEBHOOK_SECRET geprüft.
- Ohne Secret wird nichts angenommen.
- Ungültige Signatur wird mit 401 abgewiesen.
- Shopify Webhook IDs werden gegen doppelte Verarbeitung geschützt.
- Es wird noch nichts an einen Lieferanten weitergeleitet.
- Persistenz ist bewusst noch nicht aktiv.

Shopify dokumentiert HTTPS-POST-Webhooks, eindeutige Webhook-IDs und Wiederholungszustellung bei Fehlern. Die Anwendung muss deshalb schnell quittieren und Verarbeitung später auslagern.

## Nächster Produktionsschritt

1. persistenter Event Store
2. persistent gespeicherte Idempotency Keys
3. Shopify-Verbindung und Webhook-Konfiguration
4. Stripe/Payment Webhook
5. Order Service
6. Supplier Connector
7. Tracking
8. Benachrichtigung
9. End-to-End-Test

## Kostenregel

Keine kostenpflichtige Integration wird aktiviert, solange sie nicht ausdrücklich freigegeben wurde.


## Provider Readiness

Provider status now distinguishes **configured** from **productionReady**. An environment variable or credential is not treated as proof that the integration works. Production readiness requires connector-specific verification and an end-to-end test.
