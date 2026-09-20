# Projektstatus

Stand: 2026-09-20

## Phase 1 — Lead-Verwaltung
🟡 IMPLEMENTIERT IM CODE

Enthalten:
- Lead-Liste
- neue Anfrage anlegen
- Anfrage öffnen und bearbeiten
- Status ändern
- Priorität ändern
- Kategorie
- Quelle
- Follow-up-Datum
- Notizen
- Status- und Prioritätsfilter
- Dashboard-Kennzahlen
- künstliche Testdaten

## Phase 2 — E-Commerce-Testsystem
🟡 IMPLEMENTIERT IM CODE

Enthalten:
- 20 Produktkandidaten als Testdaten
- Produkt-/Margentabelle
- Einkaufskosten
- Versandkosten
- Verkaufspreise
- kanalabhängige Modellgebühren
- Marketingkosten pro Bestellung
- Deckungsbeitrag pro Bestellung
- Filter nach Produktkategorie
- eigener Shop / eBay / Amazon als Kalkulationskanäle
- Freigabekriterien und Dokumentation

## Wichtige Einschränkung
Die E-Commerce-Kalkulation verwendet derzeit Modellannahmen. Sie sind **keine bestätigten Lieferantenpreise**. Vor echtem Verkauf müssen Lieferant, Einkauf, Versand, Lieferzeit, Retouren und Produktkonformität verifiziert werden.

Die Lead-Daten werden aktuell nur im Browser gespeichert. Eine zentrale persistente Datenbank ist noch nicht angeschlossen.

## Nächster Quality Gate
1. Shop- und Kalkulationsseiten lokal bzw. über Deployment bauen und testen.
2. Echte Lieferanten für die besten Produktkandidaten recherchieren.
3. Reale Kosten in die Kalkulation übernehmen.
4. Erst danach Produktfreigabe.
5. Erst danach echte Zahlungs-/Bestellprozesse.

## Regeln
- Keine echten Kundendaten in der Demo.
- Keine Secrets im Repository.
- Keine kostenpflichtigen Dienste ohne Freigabe.
- Keine automatisierte Massenwerbung ohne rechtliche Prüfung.
- Keine Produktfreigabe auf Basis von Fake-/unverifizierten Lieferantendaten.
- Werknetz24 bleibt getrennt.
