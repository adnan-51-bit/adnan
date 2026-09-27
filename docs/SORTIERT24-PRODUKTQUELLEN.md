# Sortiert24 – Produktquellen (Recherche 27.09.2026)

**Grundsatz:** Im Katalog stehen nur Angaben, die am 27.09.2026 auf der Originalseite des Lieferanten nachgelesen wurden.
- Kein Einkaufspreis ohne Beleg.
- Kein erfundener Verkaufspreis.
- Keine fremden Bilder.
- **Kein Produkt ist geprüft oder verkaufsbereit** – alle stehen auf „Recherchieren“.

## Ergebnis in Zahlen
- **7 Kandidaten** mit Primärquelle belegt. Gesucht waren 10; mehr ließen sich nicht mit nachvollziehbarem Lieferanten belegen, deshalb wurde nicht mit unbelegten Produkten aufgefüllt.
- **0 vollständig verifiziert.** Kein Einkaufspreis außer Laprinta ist ohne Händlerkonto sichtbar, kein Bildnutzungsrecht ist schriftlich geklärt.
- **Einkaufspreise:**
  - 1 belegt: Laprinta, 12,00 € netto, aber nur für Gewerbekunden und ohne Direktversand
  - 6 offen: ChiliTec zeigt „Preis nach Login“

## Kandidaten

| # | Produkt | Lieferant / Art.-Nr. | EAN (Seite) | EK netto | Versand | Bildquelle | Quelle |
|---|---|---|---|---|---|---|---|
| 1 | Klettband mit Öse, 5er Pack, 30 × 2 cm, schwarz | ChiliTec 22713 | 4250416327291 | offen („Preis nach Login“) | 7,50 € je Paket (DE) | offen – CSV-Export für Händler, Bildrecht nicht geregelt | https://www.chilitec.de/klettband-mit-oese-5er-pack/item-1-22713.html |
| 2 | Klettband mit Öse, 5er Pack, 15 × 2 cm, schwarz | ChiliTec 22712 | 4250416327284 | offen | 7,50 € | offen | https://www.chilitec.de/html/klettband-mit-oese-5er-pack/item-1-22712.html |
| 3 | Klettband mit Öse, 5er Pack, 50 × 2 cm, schwarz | ChiliTec 22936 | 4250416329738 | offen | 7,50 € | offen | https://www.chilitec.de/html/klettband-mit-oese-5er-pack/item-1-22936.html |
| 4 | Klettband mit Öse, 5er Pack, 80 × 3 cm, schwarz | ChiliTec 22937 | 4250416329745 | offen | 7,50 € | offen | https://www.chilitec.de/html/klettband-mit-oese-5er-pack/item-1-22937.html |
| 5 | Kabelbinder 150 × 3,5 mm, schwarz, 100er | ChiliTec 18681 | 4250416303929 | offen | 7,50 € | offen | https://www.chilitec.de/kabelbinder-150mm-x-3-5mm-schwarz/item-1-18681.html |
| 6 | Kabelbinder 300 × 3,5 mm, schwarz, 100er | ChiliTec 18683 | 4250416303943 | offen | 7,50 € | offen | https://www.chilitec.de/kabelbinder-300mm-x-3-5mm-schwarz/item-1-18683.html |
| 7 | Accordion Kofferraum-Organizer 60 × 31 × 36 cm | Laprinta pt-13402200 | nicht angegeben | **12,00 €** (1 Stk., unbedruckt) | nicht angegeben | offen | https://www.laprinta.de/accordion-kofferraumorganizer-schwarz-grau |

### ChiliTec (Kandidaten 1–6) – Belege
- **Hersteller:** laut jeder Produktseite ChiliTec GmbH, Bäckerberg 12, 38165 Lehre-Essenrode, Deutschland, GPSR-Kontakt gpsr@chilitec.de.
- **Verfügbarkeit:** „sofort lieferbar“. Eine Lieferzeit zum Endkunden ist nicht angegeben.
- **Direktversand** (https://www.chilitec.de/versand-und-zahlung/dropshipping/):
  - Mindestbestellwert 10 € netto Warenwert je Auftrag
  - 7,50 € Versandkostenpauschale je Paket innerhalb Deutschlands, netto/brutto nicht angegeben
  - Produktdaten per CSV-Datenexport im Kundenbereich
- **Wichtig für die Kalkulation:** Wegen 10 € Mindestwarenwert und 7,50 € Versand je Paket lohnt sich eine einzelne kleine Packung vermutlich nicht. Sinnvoller wären **Sets/Bündel** (z. B. mehrere Klettband-Größen + Kabelbinder), die den Mindestwert erreichen. Das ist eine Empfehlung, keine Entscheidung.
- **Marktpreise Dritter** (z. B. Kaufland „ab 3,29 €“ für 22713) sind Endkundenpreise anderer Händler, **nicht unser Einkaufspreis**, und wurden nicht übernommen.

### Laprinta (Kandidat 7) – Belege und Ausschlussgründe
- 12,00 € netto je Stück ab 1 Stück (gleicher Preis bis 1.000), unbedruckt; 600D Polyester; Herkunft China; „Auf Lager“.
- **Nur Lieferung an Handel/Industrie/Handwerk/Gewerbe.**
- Kein Hersteller angegeben (GPSR-Pflichtangabe fehlt), keine Versandkosten, kein Direktversand (eigenes Lager nötig).
- Lieferzeit ca. 9 Werktage nach Druckfreigabe (Werbeartikel-Kontext).
- Der frühere Rechercheeintrag „5,46 € netto“ bezog sich auf einen anderen Artikel und ist überholt.

### Geprüft, aber nicht aufgenommen
- **CLP:** Bestätigt Direktversand und stellt „images, copy and dimensions“ für die Shop-Einbindung bereit (https://clp.de/en/retailers). Nutzungsbedingungen und Preise gibt es aber erst nach Registrierung, und das Sortiment ist überwiegend Möbel (sperrig, hohe Versandkosten).
- **T.M. Textil:** kein passendes Ordnungsprodukt öffentlich belegbar.

## Rechenweg (lib/kalkulation.js, identisch in Admin und Server)
```
EK netto + Versand + sonstige nachweisbare Kosten = Einstandskosten
VK netto = VK brutto / (1 + USt)          USt = 19 % (Annahme Regelbesteuerung, lib/shop-marke.js)
VK netto − Einstandskosten                = Rohmarge
Rohmarge / VK netto × 100                 = Rohmargenquote
```
Beispiel (nur zur Veranschaulichung, keine echten Werte): EK 5,00 + Versand 7,50 = 12,50 € Einstand; VK 19,90 € brutto = 16,72 € netto → Rohmarge 4,22 € = 25,2 %.

## Was fehlt, damit ein Produkt geprüft werden kann
1. **Händlerkonto bei ChiliTec** (vermutlich Gewerbe nötig): echte EK-Preise und CSV-Datenexport.
2. **Schriftliche Bildfreigabe** des Lieferanten (oder eigene Produktfotos).
3. **Lieferzeit zum Endkunden** vom Lieferanten.
4. Klären, ob die 7,50 € Versand netto oder brutto sind.
5. Danach **Verkaufspreis kalkulieren** (mit Set-Idee wegen des Mindestwarenwerts).
6. Dann in der Zentrale „Produkt prüfen“ → „Veröffentlichen“.
