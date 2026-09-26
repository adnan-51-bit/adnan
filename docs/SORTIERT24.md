# Sortiert24 – eigener Shop

Stand: 26.09.2026 · Status: **TECHNISCH STARTKLAR – VERKAUFSSTART AUSSTEHEND**

Eigenes E-Commerce-Projekt, strikt getrennt von Werknetz24:
- eigene Tabellen `ecommerce_*`, per DB-Constraint `business_id = 'ecommerce'`
- eigene Kunden, Bestellungen und Zahlungen
- eigenes Stripe-Konto vorgesehen

## Was technisch fertig und getestet ist
| Teil | Wo | Test |
|---|---|---|
| Shop-Seite (Kategorien, Produktdetails, Bilder, Bestand, Lieferzeit, Warenkorb im Browser, Versand, Lieferadresse) | `/laden` | Browsertest Desktop + Handy (Zustand „geöffnet“ simuliert), live geschlossen |
| Danke-Seite nach Bezahlung | `/laden/danke` | live 200 |
| Rechtstext-Seiten (zeigen nichts Erfundenes) | `/laden/impressum`, `/datenschutz`, `/agb`, `/widerruf` | live 200, Platzhaltertext |
| Bestellung: Preise nur serverseitig, Bestand geprüft, Kunde + Bestellung + Stripe Checkout | `POST /api/orders?type=shop-bestellung` | Unit-Tests; live 503 (geschlossen) |
| Zahlungsbestätigung: Stripe-Signatur, einmalige Verarbeitung, nur `business_id=ecommerce`, Bestand wird abgebucht | `POST /api/payments/stripe` | Unit-Tests; live 503 (ohne Secret) |
| Produktverwaltung: bearbeiten mit Live-Marge, Beschreibung, bis zu 8 Bild-Adressen, Bestand, Lieferzeit, Lieferant | E-Commerce → Produkte → „Bearbeiten“ | Browsertest (Dialog, Marge) |
| Pipeline-Schutz: Status nur schrittweise, per PATCH nicht überspringbar | `/api/orders` PATCH | Unit-Test |
| Start-Checkliste (7 Punkte, Shop öffnet nur bei allen) | E-Commerce → Quality Gate | live |

## Start-Checkliste (so wird der Shop geöffnet)
1. **Gewerbe + Rechtstexte:** Nach der Gewerbeanmeldung die vier Texte, anwaltlich geprüft, in `lib/shop-rechtstexte.js` eintragen. Entwurf: `docs/LEGAL-TEXTS-DRAFT.md`, dort ohne `[Platzhalter]`. Dann in Vercel `SHOP_RECHTSTEXTE_FREIGEGEBEN=true` setzen.
2. **Stripe-Konto für Sortiert24** (nicht das von Werknetz24): `STRIPE_SECRET_KEY`. Erst `sk_test_…` zum Testen, dann `sk_live_…`. PayPal, Karte und Klarna schaltet man im Stripe-Dashboard als Zahlungsarten frei; kein eigener Code nötig.
3. **Stripe-Webhook:** Endpunkt `https://adnan-sandy.vercel.app/api/payments/stripe` (bzw. später die eigene Domain), Ereignis `checkout.session.completed`. Signing-Secret als `STRIPE_WEBHOOK_SECRET`.
4. **Versandkosten:** `VERSANDKOSTEN_CENT` in `lib/shop-marke.js`, Wert aus echten Lieferantenkonditionen (0 = kostenlos).
5. **Produkt:** Mindestens eines mit echtem Einkaufspreis, positiver Marge und Pipeline-Status „Bereit“/„Veröffentlicht“.
6. **Datenbank:** Supabase ✅
7. **Freischalten:** `SHOP_LIVE=true`, erst wenn 1–6 erfüllt sind.

Alle Variablen kommen ins Vercel-Projekt `adnan` (Production), danach neu deployen.

## Domain (nur geprüft, nichts gekauft)
Per DNS geprüft; das ist ein Hinweis, keine Garantie:
- vermutlich frei: `sortiert24.de`, `sortiert24.com`, `sortiert24.shop`, `sortiert-24.de`
- Vor dem Kauf: Markenrecherche beim DPMA (register.dpma.de) und Verfügbarkeit beim Registrar.
- Kosten: ca. 1 € pro Monat für eine .de-Domain. Kauf nur mit Adnans Zustimmung.
- Vercel-Hinweis: Der Hobby-Tarif ist laut Vercel für nicht-kommerzielle Nutzung. Für den echten Verkauf den Pro-Tarif prüfen (Kostenentscheidung Adnan). Eigenes Vercel-Projekt: laut Adnan „später, mit Gewerbe“.

## Datenschutz-Technik
- Der Shop setzt **keine Cookies und kein Tracking**. Der Warenkorb liegt im `localStorage` des Browsers; das ist technisch notwendig für den angeforderten Dienst, daher kein Cookie-Banner nötig.
- Die Datenschutzerklärung muss Stripe (Zahlung), Vercel (Hosting) und Supabase (Datenbank) nennen. Das gehört zum Rechtstext, nicht zum Code.
- Öffentliche Schnittstellen geben keine Einkaufspreise, Lieferanten oder Notizen heraus (Test).

## Nicht vorgesehen
Shopify ist nicht vorgesehen (Entscheidung „eigener Shop, kostenlos“). Der vorhandene Shopify-Webhook bleibt fail-closed (503).
