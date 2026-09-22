# Rechtstexte E-Commerce — ENTWURF, NICHT VERÖFFENTLICHEN

**Stand:** 22.09.2026
**Status:** 🟡 Entwurf, vorbereitet für den Tag der Gewerbeanmeldung — **kein veröffentlichungsfertiger, anwaltlich geprüfter Text.**

## Wichtiger Hinweis zuerst

Dies ist **keine Rechtsberatung**. Diese Texte sind ein technisch vorbereiteter Entwurf, damit am Tag der Gewerbeanmeldung nur noch echte Daten eingesetzt und ein Anwalt kurz gegenprüfen muss — statt bei null anzufangen. Struktur und Formulierungen orientieren sich an den bereits bestehenden, seit 21.08.2026 live auf werknetz24.de veröffentlichten Rechtstexten derselben Person (gleiches Vorgehen: erst als Entwurf vorbereitet, dann bei Vertragsstart aktiviert) sowie an der gesetzlich vorgeschriebenen Muster-Widerrufsbelehrung (Anlage 1 zu Art. 246a § 1 Abs. 2 und 3 EGBGB).

**Vor jeder Veröffentlichung zwingend:**
1. Gewerbeanmeldung abgeschlossen (Firmenname, ggf. Handelsregisternummer, USt-Status).
2. Rechtsanwalt prüft alle vier Texte — besonders die AGB (Gewährleistung, Dropshipping-Lieferzeiten) und die Widerrufsbelehrung (Fristbeginn bei Dropshipping kann je nach Lieferant abweichen).
3. Platzhalter in eckigen Klammern `[...]` durch echte Daten ersetzen.

---

## 1. Impressum (Entwurf)

```
Angaben gemäß § 5 DDG

Adnan Özsarilar
[Firmenname E-Commerce, z. B. "Werknetz24 E-Commerce" oder eigener Name — nach Gewerbeanmeldung festlegen]
Spandauer Str. 4
40789 Monheim am Rhein

Kontakt
Telefon: +49 177 2847102
E-Mail: [eigene E-Commerce-Adresse, z. B. shop@werknetz24.de — oder werknetz24@gmail.com, falls keine eigene eingerichtet wird]

Berufsbezeichnung
Einzelunternehmer — Handel mit [Warengruppe(n) nach finaler Produktauswahl, s. docs/PRODUCT-RESEARCH.md]

Umsatzsteuer
[Kleinunternehmer gemäß § 19 UStG — falls Umsatzgrenze weiterhin unterschritten, wie bei Werknetz24 —
ODER USt-IdNr: [folgt nach Gewerbeanmeldung], falls Regelbesteuerung/Dropshipping-Lieferanten eine
USt-IdNr verlangen (mehrere geprüfte Lieferanten, z. B. Dropply, verlangen zwingend eine USt-IdNr —
docs/SUPPLIER-PRODUCT-MATRIX-2026-09-20.md)]

Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
Adnan Özsarilar
Spandauer Str. 4
40789 Monheim am Rhein

Streitschlichtung
Die EU-Plattform zur Online-Streitbeilegung (OS) wurde von der Europäischen Kommission zum 20. Juli 2025
eingestellt (Verordnung (EU) 2024/3228). Verbraucherinnen und Verbraucher finden zuständige
Schlichtungsstellen stattdessen unter consumer-redress.ec.europa.eu.
Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
Verbraucherschlichtungsstelle teilzunehmen. [Bei Regelbesteuerung/größerem Geschäftsbetrieb vor
Veröffentlichung mit Anwalt prüfen, ob eine Teilnahmepflicht entsteht.]
```

---

## 2. Datenschutzerklärung (Entwurf)

Struktur wie die bestehende Werknetz24-Datenschutzerklärung, aber **inhaltlich komplett getrennt** — nennt nur Dienste, die im E-Commerce-Bereich tatsächlich im Code verwendet werden (`lib/ecommerce-store.js`, `lib/providers.js`), keine Werknetz24-Dienste (kein Retell/Lisa, kein Google Calendar hier).

```
1. Verantwortlicher
Adnan Özsarilar
[Firmenname E-Commerce]
Spandauer Str. 4, 40789 Monheim am Rhein
E-Mail: [siehe Impressum]

2. Hosting
Diese Seite wird bei Vercel Inc. (USA) gehostet. Server-Logs (IP-Adresse, Zeitpunkt, abgerufene
Datei) werden automatisch erfasst. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
Datenschutzbestimmungen: https://vercel.com/legal/privacy-policy

3. Bestellung und Kundenkonto
Bei einer Bestellung erheben wir: Name, Lieferadresse, E-Mail, bestellte Artikel, Bestellwert.
Diese Daten werden zur Vertragserfüllung (Bestellabwicklung, Versand über den jeweiligen Lieferanten)
verarbeitet. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
[Aktueller Stand 22.09.2026: Persistenz läuft im Server-Speicher, keine dauerhafte Datenbank aktiv
(Supabase noch nicht eingerichtet) — VOR echten Bestellungen muss eine dauerhafte, DSGVO-konform
konfigurierte Datenbank aktiv sein, sonst diesen Abschnitt entsprechend anpassen.]

4. Weitergabe an Lieferanten (Dropshipping)
Da unsere Produkte im Dropshipping-Verfahren direkt vom Lieferanten an Sie versendet werden, geben
wir die für den Versand notwendigen Daten (Name, Lieferadresse) an den jeweiligen Lieferanten weiter:
[Liste der tatsächlich genutzten Lieferanten je Bestellung, aus lib/ecommerce-store.js — aktuell
recherchiert, noch keine Bestellung ausgelöst: CLP, T.M. Textil, ChiliTec, Hans Krempl, Dropply,
BigBuy]. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).

5. Zahlungsabwicklung
[Aktueller Stand: Stripe- und PayPal-Integration im Code vorbereitet, aber bewusst gesperrt
(HTTP 503), bis eine sichere, vollständige Integration + Gewerbeanmeldung vorliegt — s.
docs/QUALITY-GATE-PHASE-4.md. Dieser Abschnitt ist erst zu befüllen, wenn eine Zahlungsart aktiv
geschaltet wird, mit dem jeweiligen Anbieter-Datenschutztext (Stripe: stripe.com/de/privacy,
PayPal: paypal.com/de/webapps/mpp/ua/privacy-full).]

6. Cookies und Tracking
Es wird [Stand 22.09.2026: kein Tracking-/Analyse-Code im Code gefunden] kein Tracking eingesetzt.
Falls sich das ändert (z. B. Google Analytics für den Shop), muss dieser Abschnitt vor Aktivierung
ergänzt und ein Cookie-Banner eingebaut werden.

7. Ihre Rechte
Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
Datenübertragbarkeit und Widerspruch gemäß Art. 15–21 DSGVO sowie das Recht auf Beschwerde bei einer
Aufsichtsbehörde.
```

---

## 3. Allgemeine Geschäftsbedingungen (Entwurf)

```
Allgemeine Geschäftsbedingungen
Stand: [Datum der Veröffentlichung]

[Firmenname E-Commerce] — Adnan Özsarilar
Spandauer Straße 4, 40789 Monheim am Rhein
Einzelunternehmer, [Kleinunternehmer gemäß § 19 UStG / Regelbesteuerung — je nach finalem Status]

§ 1 Geltungsbereich
(1) Diese AGB gelten für alle Bestellungen über [Shop-Domain] zwischen Adnan Özsarilar
([Firmenname]) und dem jeweiligen Kunden.
(2) Es gelten ausschließlich diese AGB; abweichende Bedingungen des Kunden werden nicht anerkannt,
es sei denn, wir stimmen ihrer Geltung ausdrücklich schriftlich zu.

§ 2 Vertragsschluss
(1) Die Darstellung der Produkte im Shop stellt kein bindendes Angebot dar, sondern eine
Aufforderung zur Bestellung.
(2) Mit der Bestellung gibt der Kunde ein verbindliches Angebot ab. Der Vertrag kommt erst durch
unsere Bestellbestätigung per E-Mail zustande.

§ 3 Preise und Versandkosten
(1) Alle Preise verstehen sich [inkl./zzgl. gesetzlicher Umsatzsteuer, je nach USt-Status].
(2) Versandkosten werden vor Abschluss der Bestellung gesondert ausgewiesen und richten sich nach
den tatsächlichen Konditionen des jeweiligen Lieferanten (s. Datenschutzerklärung Ziff. 4).

§ 4 Zahlung
Zahlung ist möglich über: [aktive Zahlungsarten zum Zeitpunkt der Veröffentlichung eintragen —
Stand 22.09.2026 ist noch keine Zahlungsart live].

§ 5 Lieferung (Dropshipping-Hinweis)
(1) Die Lieferung erfolgt direkt durch unseren jeweiligen Lieferanten im Dropshipping-Verfahren,
nicht aus einem eigenen Lager.
(2) Voraussichtliche Lieferzeiten werden bei der jeweiligen Produktbeschreibung angegeben und
basieren auf den Angaben des Lieferanten; verbindliche Liefertermine gelten nur, wenn ausdrücklich
zugesagt.
(3) Ist ein bestelltes Produkt nicht verfügbar, informieren wir den Kunden unverzüglich; bereits
geleistete Zahlungen werden erstattet.

§ 6 Eigentumsvorbehalt
Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.

§ 7 Gewährleistung
Es gelten die gesetzlichen Gewährleistungsrechte.

§ 8 Widerrufsrecht
Es gilt die gesonderte Widerrufsbelehrung (s. Abschnitt 4 dieses Dokuments).

§ 9 Streitschlichtung
[Wie Impressum — vor Veröffentlichung mit Anwalt prüfen.]
```

---

## 4. Widerrufsbelehrung (Entwurf, orientiert an der gesetzlichen Muster-Widerrufsbelehrung, Anlage 1 zu Art. 246a § 1 Abs. 2 und 3 EGBGB)

**Wichtig:** Bei Dropshipping kann der Fristbeginn ("Erhalt der Ware") je nach Lieferant/Versandart abweichen — vor Veröffentlichung mit Anwalt prüfen, insbesondere bei Lieferungen in mehreren Teilsendungen.

```
Widerrufsrecht

Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.

Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter
Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.

Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
  [Firmenname E-Commerce]
  Adnan Özsarilar
  Spandauer Str. 4, 40789 Monheim am Rhein
  E-Mail: [siehe Impressum]
mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über
Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.

Folgen des Widerrufs
Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten
haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die
Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. [...]

Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an
dem Sie uns über den Widerruf dieses Vertrags unterrichten, an uns zurückzusenden. [Rücksendeadresse
ergänzen — bei Dropshipping ggf. abweichend vom Lieferanten, vor Veröffentlichung klären.]

Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.
```

---

## Was noch fehlt, bevor eines dieser Dokumente live gehen kann

1. Gewerbeanmeldung (liefert Firmenname/USt-Status/ggf. Handelsregisternummer).
2. Entscheidung, ob E-Commerce unter demselben Namen wie Werknetz24 läuft oder eigenen Namen bekommt.
3. Anwaltliche Prüfung aller vier Texte.
4. Festlegung der tatsächlichen Rücksendeadresse für Widerrufe (Lieferant vs. eigene Adresse).
5. Sobald eine Zahlungsart aktiviert wird: den jeweiligen Datenschutz-/AGB-Abschnitt ergänzen.
