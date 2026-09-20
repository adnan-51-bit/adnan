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

## Werknetz24-Connector (Phase 2, 20.09.2026)

Read-only Verbindung zum separaten, bereits produktiven System `adnan-51-bit/werknetz24-landing`.

- Modul: `lib/werknetz24-connector.js`, aufgerufen aus `lib/master-store.js` (`listBusinesses()`), **keine neue API-Route** — dieses Repo hat mit 12 Routen bereits das Vercel-Hobby-Limit erreicht (s. `docs/PROJECT-AUDIT.md` im Schwester-Repo).
- Gegenstelle: `GET https://werknetz24.de/api/customers?type=master-zentrale-status` — liefert ausschließlich aggregierte Kennzahlen (Systemstatus-Zähler, Anzahl offener Incidents/Aufgaben, Summe offener Rechnungen/Ausgaben in Cent). **Niemals** Kundendaten, Rechnungspositionen oder Rohdaten.
- Eigenes, engeres Secret: `WERKNETZ24_STATUS_SECRET` (hier) ↔ `MASTER_ZENTRALE_SECRET` (dort) — bewusst **nicht** das Werknetz24-`ADMIN_SECRET`. Grund: dieses System hatte im Bestandsaudit selbst keine eigene Authentifizierung auf seinen Schreibendpunkten; eine Kompromittierung hier darf nicht automatisch vollen Admin-Zugriff auf Werknetz24 erlauben.
- 🔵 **EXTERNAL — aktuell nicht konfiguriert.** `WERKNETZ24_STATUS_SECRET` ist in keiner Umgebung gesetzt. `listBusinesses()` liefert deshalb ehrlich `liveStatus: { configured: false, reason: "WERKNETZ24_STATUS_SECRET nicht gesetzt" }` für den Werknetz24-Eintrag — keine erfundenen Werte, keine vorgetäuschte Verbindung.
- Um zu aktivieren: in beiden Vercel-Projekten denselben zufälligen Secret-Wert setzen (`WERKNETZ24_STATUS_SECRET` hier, `MASTER_ZENTRALE_SECRET` in `werknetz24-landing`) und neu deployen. Adnan/Vercel-Zugang nötig — hier nicht selbst gesetzt.
- Getestet (`tests/werknetz24-connector.test.js`): fehlendes Secret liefert ehrlich `configured:false` ohne jeden Fetch-Versuch; korrekter Bearer-Header bei Erfolg; Server-Fehler (401/503) werden als `ok:false` mit echter Fehlermeldung durchgereicht statt eines stillen Fallbacks; Netzwerkfehler/Timeout werden abgefangen und ehrlich gemeldet, nicht als Erfolg maskiert.
