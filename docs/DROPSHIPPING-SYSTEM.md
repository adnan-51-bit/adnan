# Dropshipping-System

Stand: 2026-09-20

## Ziel

Mehrere Produkte verkaufen, ohne für den Start selbst große Warenbestände zu halten.

## Zielprozess

Kunde bestellt im Shop -> Zahlung -> Bestellung validieren -> passenden Lieferanten auswählen -> Bestellung an Lieferant übermitteln -> Lieferant versendet direkt an Endkunden -> Tracking zurückführen -> Kunde informieren -> Umsatz, Lieferantenkosten, Versand, Gebühren und Retouren der Bestellung zuordnen.

## Lieferanten-Gates

Ein Lieferant erhält zunächst 🟡.

Vor 🟢 müssen geprüft werden:
- B2B-Vertrag/Anmeldung
- tatsächlicher Einkaufspreis
- Versandkosten
- Mindestbestellwert/MOQ
- Lieferzeit
- Lagerbestandsquelle
- neutraler oder eigener Versand
- Retourenadresse und Retourenprozess
- Tracking
- Produktdaten
- Hersteller-/Importeurdaten
- GPSR-/Kennzeichnungsinformationen soweit relevant
- Rechnungsstellung
- Steuer-/USt.-Abwicklung
- API/CSV/XML/Shop-Anbindung
- Grundgebühren
- Testbestellung

## Produkt-Gates

🟢 erst wenn:
1. Lieferant bestätigt.
2. Produkt konkret identifiziert.
3. Einkauf und Versand belastbar.
4. Verkaufspreis realistisch.
5. Zahlungs-/Marktplatzgebühren kalkuliert.
6. Retourenreserve kalkuliert.
7. Marketingkosten-Szenario kalkuliert.
8. Produktinformationen/Compliance geprüft.
9. Testbestellung oder belastbarer Lieferantennachweis vorhanden.

## Mehrere Produkte

Das System ist bewusst multi-product aufgebaut. Produkte können von unterschiedlichen Lieferanten stammen.

Jedes Produkt erhält:
- product_id
- supplier_id
- Kategorie
- Einkaufspreis
- Versandkosten
- Verkaufspreis
- Gebühren
- Marketingkosten
- Retourenreserve
- Deckungsbeitrag
- Lieferzeit
- Bestandssignal
- Compliance-Status
- Freigabestatus

## Automatisierung

Phase 1: manuelle/halbautomatische Prüfung.

Phase 2:
- Produktfeed importieren
- Preise/Bestand synchronisieren
- Produkte in Shop übernehmen
- Bestellungen weiterleiten
- Tracking zurückschreiben

Phase 3:
- automatische Margenprüfung
- automatische Deaktivierung bei fehlendem Bestand
- Warnung bei Preisänderung
- Lieferantenvergleich
- Reporting

## Kostenregel

Keine kostenpflichtige Integration, App, Domain, Werbung oder Bestellung ohne ausdrückliche Freigabe.

## Aktueller Stand

Die Kontrolloberfläche liegt unter /lieferanten.

Die Lieferantenliste enthält recherchierte Kandidaten, aber noch keine produktive Anbindung. Externe Angaben müssen vor Vertragsabschluss direkt beim jeweiligen Anbieter bestätigt werden.

## Recherchehinweis

Aktuelle Recherche zeigt, dass deutsche/EU-Anbieter Direktversand, neutrale Verpackung und teils CSV/XML/API-Anbindungen anbieten. Beispiele: CLP, T.M. Textil, ChiliTec, Hans Krempl und BigBuy.

Diese Namen sind Recherche-Kandidaten, keine Kaufempfehlungen.
