# Projektstatus – Master-Zentrale

Stand: 2026-09-20

## Gesamtstatus

🟡 **MVP SICHTBAR DEPLOYED – PRODUKTIVER GESCHÄFTSBETRIEB NOCH OFFEN**

Die technische Basis für Lead-Verwaltung, E-Commerce-Kalkulation und eine zentrale Übersicht existiert im Repository. Deployment, persistente Datenhaltung und reale Geschäftsprozesse sind noch nicht vollständig verifiziert.

## Geschäftsbereiche

### Werknetz24
🔵 EXTERNAL / SEPARAT

Die bestehende Werknetz24-Administration bleibt technisch getrennt. Die Master-Zentrale enthält nur die übergeordnete Übersicht bzw. Verweise.

### E-Commerce
🟡 CODE EXISTS

Vorhanden:
- Produktkandidaten-Testsystem
- Kalkulation für Einkauf, Versand, Kanalgebühren und Marketingannahmen
- Produktrecherche-Dokumentation
- Lieferantenrecherche Runde 1
- sichtbare Master-Zentrale /zentral
- sichtbare E-Commerce-Zentrale /e-commerce
- sichtbarer Bereich /kunden-gewinnen

Noch offen:
- reale Lieferanten vollständig verifizieren
- vollständige Stückkosten
- Produktkonformität/GPSR-Dokumentation
- Produktfreigabe
- Shop-Produktseite
- Bestell-/Zahlungsprozess
- persistente Datenbank
- vollständiger Produktions-Smoke-Test
- Bestell-/Zahlungsprozess
- persistente Datenhaltung


## Order Service & Persistence Scaffold

🟡 CODE EXISTS

Vorhanden:
- Order-Service API
- Event-/Order-Speicherung als austauschbare Store-Schicht
- Idempotency-Schicht
- Stripe-Webhook bewusst gesperrt, bis sichere Signaturprüfung implementiert ist

Offen:
- persistente Datenbank
- transaktionale Verarbeitung
- Queue/Background Processing

## Webhook Integration

🟡 CODE EXISTS

Vorhanden:
- Shopify-Webhookschnittstelle
- HMAC-Signaturprüfung
- Duplicate-Schutz auf Webhook-ID
- Provider-Capability-Modell

Offen:
- persistenter Idempotency Store
- echte Shopify-Konfiguration
- Payment-Webhooks
- produktive Order-/Supplier-Verarbeitung

## Automation Engine

🟡 CODE EXISTS

Vorhanden:
- Event- und Order-State-Modell
- sichere Zustandsübergänge
- Quality-Gate vor automatischem Fulfillment
- Health- und Automation-API als Dry-Run/Scaffold

Offen:
- persistente Datenbank
- echte Zahlungs-/Shop-Webhooks
- Lieferanten-Connectoren
- produktive Benachrichtigungen

## Lead-System

🟡 CODE EXISTS

Vorhanden:
- Lead-Liste
- neue Anfrage
- Bearbeitung
- Status
- Priorität
- Kategorie
- Quelle
- Follow-up
- Notizen
- Dashboard-Kennzahlen
- Testdaten

Offen:
- persistente zentrale Datenbank
- echte Eingangsquellen
- Automatisierung
- produktive Benachrichtigungen

## Master-Zentrale

🟡 CODE EXISTS

Vorhanden:
- Geschäftsbereich-Auswahl
- Statusübersicht
- Tool-Landschaft
- Arbeitsablauf
- Roadmap
- Verweise auf Werknetz24 und E-Commerce

Offen:
- echte zentrale Datenquelle
- Authentifizierung/Rechte
- persistente Aufgaben
- Integrationsstatus aus echten APIs
- produktives Deployment

## Aktueller Quality Gate

1. Kofferraum-Organizer weiter verifizieren.
2. Schubladen-Organizer parallel auf vollständige Kosten prüfen.
3. Erst nach vollständiger Kostenrechnung Produktentscheidung.
4. Danach erst Domain/Marke.
5. Danach Shop-Aufbau.
6. Danach Zahlungs-/Bestellprozess.
7. Danach produktives Deployment und Smoke-Test.
8. Danach kontrollierte Kundengewinnung.

## Regeln

- Keine Bestellung ohne Freigabe.
- Keine Domain ohne Produktfreigabe.
- Keine Werbung ohne Freigabe und rechtliche Prüfung.
- Keine kostenpflichtigen Dienste ohne ausdrückliche Freigabe.
- Keine Secrets im Repository.
- Keine echten Kundendaten in Testsystemen.
- Keine Produktfreigabe auf Basis unverifizierter Preise.
- Keine produktive Massenansprache ohne rechtliche Prüfung.

## Nächster STOP-Punkt

Produktentscheidung erst nach dokumentiertem Quality Gate. Bis dahin bleibt der Status 🟡.
