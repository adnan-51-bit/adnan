# E-Commerce / Dropshipping – Arbeitsgrundlage

Stand: 2026-09-20

## Ziel

Aufbau eines testbaren E-Commerce-Systems mit:
- Produktrecherche
- Lieferantenprüfung
- Einkaufspreis
- Versandkosten
- Verkaufspreis
- Marktplatz-/Zahlungsgebühren
- Marketingkosten
- Retourenreserve
- Deckungsbeitrag
- Shop
- später Marktplatz-Anbindungen

## Status

🟡 Testsystem. Noch kein Produkt ist für den echten Verkauf freigegeben.

## Produktkandidaten

20 Kandidaten sind in `app/shop/page.jsx` hinterlegt. Die dortigen Einkaufs-, Versand- und Verkaufspreise sind ausdrücklich Modellannahmen und keine bestätigten Lieferantenangebote.

## Kalkulationsformel

Deckungsbeitrag je Bestellung =
Verkaufspreis
- Einkaufspreis
- Versand
- Verkaufs-/Zahlungsgebühren
- Marketingkosten
- Retouren-/Kulanzreserve
- sonstige variable Kosten

Steuern und fixe Betriebskosten werden separat betrachtet und nicht als Deckungsbeitrag ausgegeben.

## Vertrieb

Geplante Kanäle:
1. eigener Shop
2. eBay
3. Amazon erst nach gesonderter Prüfung

eBay weist für gewerbliche Verkäufer eine Verkaufsprovision plus 0,45 EUR pro Bestellung über 10 EUR aus; die variable Provision hängt von der Kategorie ab. Änderungen gelten ab 01.07.2026 in ausgewählten Kategorien. Quelle: https://www.ebay.de/help/selling/selling-fees/store-fees?id=4809

Amazon nennt für den Professional-Tarif 39 EUR netto/Monat und für die meisten Kategorien Verkaufsgebühren von 8–15 %. Quelle: https://sell.amazon.de/preisgestaltung

## Freigabekriterien

Ein Produkt wird erst 🟢 freigegeben, wenn:
- Lieferant identifiziert und geprüft
- EU-/DE-Lieferweg verifiziert
- Einkaufspreis verifiziert
- Versandkosten verifiziert
- Lieferzeit verifiziert
- Retourenprozess geklärt
- Produktkonformität/Informationspflichten geprüft
- realistische Werbekosten kalkuliert
- Deckungsbeitrag positiv und ausreichend für Risiken ist

## Keine Fake-Zahlen

Alle Modellannahmen müssen als TEST/ANNAHME gekennzeichnet bleiben, bis sie mit einem realen Lieferanten oder einer offiziellen Gebührenquelle verifiziert wurden.

## Nachtrag 21.09.2026 (Phase 2 Multi-Business-Struktur): eigenständiges Dashboard

`app/e-commerce/page.jsx` ist jetzt das vollständige E-Commerce-Dashboard (Übersicht, Produkte,
Produkt-Pipeline, Lieferanten, Bestellungen, Kunden, Zahlungen, Retouren, Finanzen, Automationen,
Systeme, Quality Gate, Einstellungen) — nicht mehr nur eine Übersichtsseite mit Links zu
Einzelseiten. Details: `docs/MULTI-BUSINESS-ARCHITECTURE.md`.

## Nachtrag 20.09.2026 (Phase 3): echte Datenschicht statt hartcodierter Werte

`app/shop/page.jsx` bleibt unverändert die hier beschriebene Modellrechnung (20 Testkandidaten, klar als "🟡 TESTDATEN" gekennzeichnet — bewusst nicht angefasst, dient weiterhin der reinen Margenkalkulation).

**Neu, real und persistent** (`lib/ecommerce-store.js`, s. `docs/STATUS.md` Abschnitt "E-Commerce (Phase 3)"): Produkte durchlaufen jetzt eine echte, technisch erzwungene 11-Stufen-Pipeline statt nur eine Statusspalte in einer JSX-Tabelle zu sein. Lieferanten haben einen echten, veränderbaren Status (recherchiert/geprüft/verifiziert/abgelehnt). Kunden/Bestellungen/Retouren sind neue, echte (leer startende) Datenbereiche unter `/kunden`, `/bestellungen`, `/retouren`.

Die Automatisierungslogik (`lib/automation.js`) selbst wurde nicht verändert — sie war bereits korrekt geschrieben (nimmt Sicherheitsflags als Parameter entgegen, statt sie selbst zu erfinden). Der Fehler lag im Aufrufer (`app/api/orders/route.js`), der diese Flags vorher direkt und ungeprüft aus dem Request weiterreichte. Das ist jetzt behoben (`deriveOrderGateInputs()`).
