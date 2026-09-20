# Dropshipping-System

Stand: 2026-09-20

## Ziel
Mehrere Produkte verkaufen, ohne für den Start große Warenbestände vorzufinanzieren.

## Zielprozess
Kunde bestellt -> Zahlung -> Bestellung validieren -> Lieferant auswählen -> Bestellung übermitteln -> Direktversand -> Tracking zurück -> Kunde informieren -> Umsatz, Lieferantenkosten, Versand, Gebühren und Retouren zuordnen.

## Aktuelle Rechercheerkenntnis
Deutsche Anbieter bestätigen, dass Direktversand/neutraler Versand technisch und operativ angeboten wird. ChiliTec nennt 7,50 € Versandpauschale je Paket innerhalb Deutschlands, 10 € Mindestbestellwert netto und einen aktuellen CSV-Datenexport; Retouren müssen dort grundsätzlich an den Händler gehen. Krempl nennt manuelle oder automatische Bestellübermittlung und Versand im Namen des Händlers. CLP nennt Lagerung, Verpackung und Versand direkt an die Kundschaft im Namen des Händlers. DGH nennt neutralen Versand mit Händler-Absender und die Möglichkeit, ohne eigenen Warenbestand zu verkaufen. Diese Angaben sind Anbieterangaben und müssen vor Vertragsabschluss für konkrete Produkte bestätigt werden.

## Lieferanten-Gates
Ein Lieferant bleibt 🟡, bis geprüft sind:
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
Jedes Produkt erhält product_id, supplier_id, Kategorie, Einkaufspreis, Versandkosten, Verkaufspreis, Gebühren, Marketingkosten, Retourenreserve, Deckungsbeitrag, Lieferzeit, Bestandssignal, Compliance-Status und Freigabestatus.

## Automatisierung
Phase 1: Recherche und halbautomatische Prüfung.
Phase 2: Produktfeed, Preis-/Bestandssynchronisierung, Shop-Import, Bestellweiterleitung, Tracking-Rückgabe.
Phase 3: Margenwarnung, automatische Deaktivierung bei fehlendem Bestand, Preiswarnung, Lieferantenvergleich und Reporting.

## Kostenregel
Keine kostenpflichtige Integration, App, Domain, Werbung oder Bestellung ohne ausdrückliche Freigabe.

## Aktueller Stand
Kontrolloberflächen: /lieferanten und /produkt-pipeline. Noch keine produktive Lieferantenanbindung.

## Nächster Arbeitsabschnitt
1. konkrete Produkte gegen direkte Lieferantenangebote matchen
2. Versand und Mindestbestellwert berechnen
3. Retouren und Compliance prüfen
4. Netto-Deckungsbeitrag je Produkt berechnen
5. nur belastbare Kandidaten für Testfreigabe vorbereiten

## Recherchequellen
ChiliTec: https://www.chilitec.de/versand-und-zahlung/dropshipping/
Krempl: https://www.krempl.de/dropshipping/
CLP: https://www.clp.de/haendler
DGH: https://shop.dgh.de/informationen/dropshipping/
