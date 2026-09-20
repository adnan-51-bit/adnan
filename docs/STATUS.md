# Projektstatus – Master-Zentrale

Stand: 2026-09-20

## Gesamtstatus

🟡 **TECHNISCHE BASIS WEIT FORTGESCHRITTEN – PRODUKTIVER GESCHÄFTSBETRIEB NOCH GESPERRT**

Die Master-Zentrale, API-Schichten, Automation-Logik, Finanz-Validierung, System-Registry und Quality-Gate sind im Repository vorhanden. Produktionsfreigabe bleibt gesperrt, solange Persistenz, Deployment und externe Integrationen nicht nachweisbar verifiziert sind.

## Master-Zentrale

🟢 **UI/API-BASIS IMPLEMENTIERT**

Vorhanden:
- /master zentrale Übersicht (Standard-Einstiegspunkt seit Phase 1, `/` leitet direkt hierher weiter)
- Betriebe
- Aufgaben
- Systeme/Integrationen
- Finanzen
- Automationen
- Audit-Log
- Einstellungen
- serverseitige API-Schichten
- Systemstatus-Registry
- Quality-Gate unter /api/master/quality-gate

## E-Commerce (Phase 3, 20.09.2026)

🟡 **ECHTE DATENSCHICHT UND WORKFLOWS IMPLEMENTIERT — NOCH KEIN PRODUKT VERÖFFENTLICHT**

Neu: `lib/ecommerce-store.js` — echte Persistenz (Supabase, wenn konfiguriert, sonst Prozess-Speicher, gleiches Muster wie `lib/master-store.js`) für:
- **Produkte** (`/produkt-pipeline`): 11-stufige Pipeline (IDEA → RESEARCH → SUPPLIER_CHECK → PRODUCT_CHECK → LEGAL_CHECK → MARGIN_CHECK → IMAGE_CHECK → COPY_CHECK → QUALITY_GATE → READY → PUBLISHED). Kein Schritt kann übersprungen werden — technisch erzwungen (`advanceProductPipeline` erlaubt nur genau einen Schritt).
- **Lieferanten** (`/lieferanten`): Status recherchiert → geprüft → verifiziert → abgelehnt.
- **Kunden** (`/kunden`, neu), **Bestellungen** (`/bestellungen`, neu), **Retouren** (`/retouren`, neu) — alle bewusst **leer gestartet**, keine Fake-Daten.

**Geseedete Daten sind keine Erfindung:** Die 6 Lieferanten (CLP, T.M. Textil, ChiliTec, Hans Krempl, Dropply, BigBuy) und 6 Produktkandidaten stammen aus der bereits vorher in `app/lieferanten` und `app/produkt-pipeline` hartcodierten, echten Recherche (mit Quellen-URLs) — jetzt in die echte Datenschicht überführt statt im Frontend fest verdrahtet. `app/e-commerce/page.jsx` zeigte vorher fest einprogrammierte Zahlen ("20 Kandidaten", "6 geprüft") — jetzt echte, live aus der Datenschicht berechnete Werte.

**Sicherheitskorrektur (wichtigster Fund dieser Phase):** `POST /api/orders` übernahm vor dieser Phase `paymentConfirmed`/`productApproved`/`supplierVerified`/`marginApproved` direkt und ungeprüft aus dem Request-Body — jeder Aufrufer hätte behaupten können, ein Produkt sei freigegeben. Neue Funktion `deriveOrderGateInputs()` leitet diese drei Flags jetzt ausschließlich aus dem tatsächlichen, gespeicherten Pipeline-/Lieferantenstatus ab. Eine Bestellung wird nur automatisch weiterverarbeitet, wenn zum Zeitpunkt der Prüfung wirklich ein `PUBLISHED`-Produkt mit `verifiziert`-Lieferant und positiver Marge vorliegt — sonst `blocked`, mit den echten Blockierungsgründen.

**Keine neue API-Route:** `app/api/orders/route.js` wurde zum konsolidierten E-Commerce-Endpunkt (`?type=products|suppliers|customers|orders|returns`) erweitert statt eine 13. Route anzulegen.

**Bewusst nicht umgesetzt:** echte Stripe-/PayPal-/Shopify-Zahlungsabwicklung (bleibt `/api/payments/stripe` 503, `/api/webhooks/shopify` ohne Persistenz — beide bereits vor Phase 3 bewusst so gebaut, unverändert), echter Checkout im Shop (`/shop` bleibt die bereits vorher als Testsystem gekennzeichnete Kalkulations-Seite).

**Tests:** 18 neue Tests (`tests/ecommerce-store.test.js`), davon 7 gezielt für `deriveOrderGateInputs` (jede der drei Sicherheitsbedingungen einzeln geprüft). Gesamtsuite 38/38 grün, `npm run build` erfolgreich (25 Routen, weiterhin genau 12 API-Funktionen).

## Werknetz24-Anbindung (Phase 2, 20.09.2026)

🔵 **EXTERNAL — Integrationsschicht vorbereitet, noch nicht aktiv.**

Read-only Connector (`lib/werknetz24-connector.js`) an das bestehende, produktive `werknetz24-landing`-Repository gebaut. Liefert bei Aufruf von `listBusinesses()` den echten, live abgefragten Werknetz24-Status (Systemstatus, offene Incidents/Aufgaben, offene Rechnungen/Ausgaben-Summen) im `werknetz24`-Eintrag als `liveStatus`. **Aktuell nicht konfiguriert** — `WERKNETZ24_STATUS_SECRET` ist in keiner Umgebung gesetzt, `liveStatus.configured` ist deshalb ehrlich `false`. Details, inkl. warum bewusst ein eigenes Secret statt des Werknetz24-`ADMIN_SECRET` verwendet wird: `docs/WEBHOOKS-AND-INTEGRATIONS.md`.

Keine neue API-Route nötig (Repo hat mit 12 Routen bereits das Vercel-Hobby-Limit erreicht).

## Quality Gate

🟡 **AKTIV – PRODUKTION NOCH NICHT FREIGEGEBEN**

Geprüft werden:
- Automation-Modul geladen
- Automation stoppt ohne bestätigte Zahlung
- vollständige System-Registry
- Persistenzmodus
- keine Ausgabe von Secret-Werten
- Payment-Gate bleibt bis zur sicheren Integration gesperrt

Der Quality-Gate-Endpoint liefert HTTP 503, solange die Produktionsbedingungen nicht erfüllt sind. Das ist beabsichtigt.

## Persistence / Datenbank

🟡 **ADAPTER VORBEREITET**

- Supabase-Adapter und Migrationen vorhanden.
- Authorization-Header im Business-Persistence-Adapter auf den tatsächlich geprüften `SUPABASE_SECRET_KEY` vereinheitlicht (Commit 8318911ea01bccf772d673c7c810958491c21042).
- Ohne SUPABASE_URL und SUPABASE_SECRET_KEY läuft der Fallback-Speicher.
- Fallback-Daten sind nicht als dauerhafte Produktionsdaten zu betrachten.
- Produktionsfreigabe erst nach Schema-Deployment, Read/Write-Smoke-Test, Neustarttest und Rechteprüfung.

## Automation Engine

🟢 **LOGIK UND REGRESSIONSTESTS VORHANDEN**

- Event-/Order-State-Modell
- sichere Zustandsübergänge
- Quality-Gate vor automatischem Fulfillment
- Regressionstests für ungültige Events, State-Transitions und Blocker

Offen:
- persistente Speicherung
- echte Zahlungs-/Shop-Webhooks
- Lieferanten-Connectoren
- produktive Benachrichtigungen

## Finanzen

🟢 **VALIDIERUNG VORHANDEN / PRODUKTIVE ZAHLUNGEN GESPERRT**

- Einnahmen/Kosten-Ledger
- Statusvalidierung
- negative Beträge werden abgelehnt
- stornierte Einträge werden aus Summen ausgeschlossen
- keine erfundenen Umsätze
- Stripe bleibt bis zur sicheren Payment-Integration gesperrt

## Systeme & Integrationen

🟢 **REGISTRY VORHANDEN**

Registriert:
- GitHub
- Vercel
- Supabase
- Famulor
- Easybell
- Stripe
- PayPal
- Shopify
- E-Mail
- Slack

🟡 Externe Live-Verbindungen sind nicht automatisch durch die Registry bestätigt.

## Deployment Gate

🔴 **NOCH NICHT GRÜN** (CI-Fehler jetzt behoben, Vercel-Team-Limit weiterhin offen)

**20.09.2026, Phase 1 (Werknetz24-landing-Sitzung, Technical Lead):** Der Commit-Status `failure` für `8318911` war tatsächlich das Team-Build-Limit — **aber zusätzlich gab es einen echten, reproduzierbaren Code-Fehler**, den die vorherige Sitzung nicht sehen konnte (siehe Korrektur unten). Beide Ursachen wurden getrennt geprüft:

1. **Echter Code-Fehler (jetzt behoben):** `lib/master-finance.js`, `lib/master-store.js`, `lib/master-tasks.js`, `lib/persistence.js` importierten relative Module ohne `.js`-Dateiendung (`from "./audit"` statt `from "./audit.js"`) — bricht unter Node.js' nativer ESM-Auflösung (`node --test`), auch wenn Next.js' Bundler es toleriert. Zusätzlich fehlte eine `jsconfig.json` für den `@/`-Pfad-Alias, der in 4 weiteren Dateien verwendet wird (`app/api/health/route.js`, `app/api/master/quality-gate/route.js`, `app/api/master/systems/route.js`, `lib/master-systems.js`) — ohne diese Datei ist NICHT VERIFIZIERT, ob `npm run build` vorher überhaupt durchgelaufen wäre. Beides behoben: fehlende Endungen ergänzt, `jsconfig.json` mit `"@/*":["./*"]` ergänzt. **Verifiziert:** `npm test` = 12/12 grün (vorher 8/9), `npm run build` erfolgreich (Next.js 16.3.3, Turbopack, alle 22 Routen generiert).
2. **Vercel-Team-Build-Limit:** weiterhin ungeklärt, betrifft auch das Schwester-Repository `werknetz24-landing` (dort hängt Commit `5523d29` ohne jeden Build-Trigger). Nur Adnan kann das im Vercel-Billing-Dashboard prüfen — er hat bereits signalisiert, notfalls ein Upgrade zu machen.

**Korrektur zur vorherigen Behauptung "kein sichtbarer GitHub-Actions-Workflow-Run":** Das war unzutreffend — unter github.com/adnan-51-bit/adnan/actions sind alle 104 Workflow-Runs einsehbar. Der neueste (Commit `8099964`, Run `#104`) war tatsächlich **rot** (exit code 1, exakt wegen Fund 1 oben) — nicht wegen fehlender Sichtbarkeit, sondern weil `tests/finance.test.js` echt fehlschlug.

Produktionsfreigabe erfordert weiterhin:
1. GitHub CI erfolgreich (🟢 jetzt erreicht, s. o. — muss nach diesem Fix erneut am echten CI-Lauf bestätigt werden)
2. Vercel Deployment erfolgreich (🔴 weiterhin blockiert durch Team-Limit)
3. /master lädt
4. /api/master/systems antwortet
5. keine Secrets im Client-Bundle
6. Produktions- und Fehlerpfade getestet

## Verifikation

- 🟢 `npm install` + `npm test` + `npm run build` wurden 20.09.2026 tatsächlich vollständig lokal ausgeführt (nicht nur einzelne Module) — 12/12 Tests grün, Build erfolgreich.
- 🟡 Vercel-Live-Status bleibt separat zu verifizieren (Team-Limit, s. o.).
- ⚪ **Neuer Fund, nicht Teil dieses Fixes:** `/api/master/businesses`, `/api/master/tasks`, `/api/master/finance`, `/api/master/systems` haben **keine erkennbare Authentifizierung** — jeder mit der URL kann per PATCH/POST Betriebsdaten, Aufgaben, Finanzbuchungen und Systemstatus ändern. Aktuelles Risiko durch fehlende Persistenz (In-Memory-Fallback, Daten gehen bei jedem Neustart verloren) praktisch begrenzt, wird aber zu einem echten Sicherheitsproblem, sobald Supabase produktiv konfiguriert ist. **Empfehlung (Entscheidung liegt bei Adnan/ChatGPT als Product Lead):** gleiches Bearer-Secret-Muster wie im Schwester-Repository `werknetz24-landing` (`ADMIN_SECRET`, zeitkonstant geprüft) — günstig, bewährt, schnell umsetzbar. Nicht in dieser Phase umgesetzt, da außerhalb des ursprünglich beauftragten Fix-Umfangs.

## Regeln

- Keine Bestellung ohne Freigabe.
- Keine kostenpflichtigen Dienste ohne ausdrückliche Freigabe.
- Keine Secrets im Repository.
- Keine echten Kundendaten in Testsystemen.
- Keine erfundenen Finanzzahlen.
- Keine produktive Zahlung ohne Payment-Gate.
- Kritische Fehler stoppen Folgeprozesse.
- Produktionsstatus wird nur nach nachweisbarer Prüfung auf 🟢 gesetzt.

## Nächster STOP-Punkt

**Vercel-Rate-Limit/Deployment-Gate klären → CI/Build → Vercel → API-Smoke-Test → Neustarttest → erst dann Produktionsfreigabe.**
