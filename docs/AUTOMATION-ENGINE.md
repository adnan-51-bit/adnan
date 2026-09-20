# Automation Engine

Stand: 2026-09-20

## Ziel
Die Master-Zentrale bekommt eine provider-unabhängige Automationsschicht. Externe Systeme dürfen später angeschlossen werden, ohne die Kernlogik neu zu bauen.

## Umgesetzt
- standardisierte Order-States
- standardisierte Event-Typen
- sichere State-Transitions
- Quality-Gate-Prüfung vor automatischem Fulfillment
- Health-Endpoint
- Automation-API als Dry-Run/Scaffold
- keine externe Bestellung, Zahlung oder Geldbewegung aus der Scaffold-API

## Bestellfluss
1. payment.confirmed
2. order.created
3. order.validated
4. supplier.order.requested
5. supplier.order.confirmed
6. shipment.tracking.updated
7. order.delivered

Bei Fehlern kann eine Bestellung auf blocked gesetzt werden. Eine blockierte Bestellung darf nicht automatisch weitergeleitet werden.

## Automatisierungs-Gates
Automatische Lieferantenweitergabe ist nur zulässig, wenn Zahlung bestätigt, Produkt freigegeben, Lieferant verifiziert, Marge freigegeben und keine offenen Risiko-Flags vorhanden sind.

## Noch nicht verbunden
- persistente Datenbank
- Zahlungsanbieter
- Shop
- Lieferanten-APIs/CSV/XML
- E-Mail
- Slack
- Tracking
- Rechnungs-/Steuersystem

Diese Anschlüsse benötigen echte Konten, Zugangsdaten und teilweise Vertrags-/Rechtsprüfung.

## Sicherheitsregel
Kein Endpoint darf nur aufgrund eines UI-Klicks echte Bestellungen auslösen. Ein späterer produktiver Connector muss zusätzlich Authentifizierung, Idempotenz, Audit-Log und Fehler-/Retry-Strategie besitzen.


## Webhook Layer

The repository now includes a secure Shopify webhook boundary with HMAC verification and duplicate-delivery protection. It accepts no webhook when the required secret is missing and does not create supplier orders. Persistent storage and real provider credentials remain required for production.
