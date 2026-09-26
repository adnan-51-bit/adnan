# Projektstatus – Master-Zentrale

Stand: 2026-09-21 (Phase 5, Finaler Go-Live)

## Gesamtstatus

🟡 **TECHNISCH LIVE UND VERIFIZIERT — ECHTER GESCHÄFTSBETRIEB WEITERHIN GESPERRT**

Die Master-Zentrale ist seit Phase 5 (21.09.2026) tatsächlich live und live geprüft unter `https://adnan-sandy.vercel.app` (nicht nur behauptet — Deployment-Status, Seiteninhalt, API-Antworten und der Phase-4-Sicherheitsfix wurden alle direkt gegen die Live-URL verifiziert). Das zuvor dokumentierte Vercel-Team-Build-Limit hat sich aufgelöst.

**Update 21.09.2026 (Folgearbeit "alles live machen"):** `MASTER_API_SECRET` und `WERKNETZ24_STATUS_SECRET` wurden in der Vercel-Produktionsumgebung gesetzt und beide Projekte redeployed. Live verifiziert: Schreibschutz (`PATCH /api/master/businesses` ohne Token → `401`, mit korrektem Token → `200`) und die Werknetz24-Verbindung (`liveStatus.configured:true, ok:true` mit echten Daten, sichtbar im `/master`-Betriebe-Tab als grüne "Werknetz24 live"-Box). Damit sind Punkt 2 und 3 aus Abschnitt "Werknetz24-Anbindung" unten sowie der Schreibschutz aus Phase 4 jetzt 🟢 statt 🔵/🟡. Ein erster Setzversuch der Secrets hatte trotz Anzeige "Added" keinen Wert gespeichert (Vercel zeigt bei Secret-Typ-Variablen nie den Wert an, sodass das leer geblieben war) — behoben durch `Rotate` mit erneuter Werteingabe statt erneutem `Add`.

Produktiver **echter Geschäftsbetrieb** (Verkauf, Zahlungen) bleibt weiterhin gesperrt: Persistenz läuft weiterhin im Fallback-Speicher (kein Supabase-Konto vorhanden, auf Adnans ausdrücklichen Wunsch nicht selbst angelegt), und die rechtlichen Pflichttexte (Impressum/Datenschutz/AGB/Widerruf) fehlen komplett (🔴 BLOCKER, s. `docs/QUALITY-GATE-PHASE-4.md`).

## Multi-Business-Struktur — Phase 1 (21.09.2026)

🟢 **UMGESETZT, GETESTET, NICHT DEPLOYED.**

Formale `business_id`-Trennung eingeführt: `lib/master-store.js` (`BUSINESS_IDS`, `isKnownBusinessId`, `getBusiness`), `lib/master-tasks.js` und `lib/master-finance.js` validieren/filtern jetzt nach `business_id` (`GET /api/master/tasks?business_id=`, `GET /api/master/finance?business_id=`, `GET /api/master/businesses?id=`). `lib/ecommerce-store.js` stempelt `business_id: "ecommerce"` auf jeden Datensatz. Keine neue API-Route-Datei — weiterhin genau 12 Vercel-Funktionen. Volle Details: `docs/MULTI-BUSINESS-ARCHITECTURE.md`.

## Multi-Business-Struktur — Phase 2: E-Commerce-Dashboard (21.09.2026)

🟢 **UMGESETZT, GETESTET, LOKAL LIVE GEPRÜFT, NICHT DEPLOYED.**

`app/e-commerce/page.jsx` ist jetzt das vollständige, eigenständige E-Commerce-Dashboard (Übersicht, Produkte, Produkt-Pipeline, Lieferanten, Bestellungen, Kunden, Zahlungen, Retouren, Finanzen, Automationen, Systeme, Quality Gate, Einstellungen) — gebaut im selben Aufbau wie `/master` (Topbar + Sidebar-Tabs). Die vorher auf 6 Einzelseiten verteilte Funktionalität wurde konsolidiert, keine Funktion entfernt: alte Routen (`/produkt-pipeline`, `/lieferanten`, `/kunden`, `/bestellungen`, `/retouren`, `/automation`) leiten jetzt clientseitig auf `/e-commerce?tab=<bereich>` weiter. Master-Zentrale-Sidebar verlinkt direkt auf die neuen Tab-URLs.

**Lokal live geprüft (`npm start`, Claude-in-Chrome auf `localhost:3000`):** Master-Zentrale → Betriebe → E-Commerce „Öffnen" landet ausschließlich im E-Commerce-Dashboard; alle 13 Tabs mit echten Daten (6 Produkte, 6 Lieferanten, 0 Kunden/Bestellungen/Retouren) geprüft; `/lieferanten` leitet sichtbar zu `/e-commerce?tab=lieferanten` weiter; Zahlungen-Tab zeigt echten Provider-Status; Systeme-Tab korrekt auf 4 relevante Einträge gefiltert; Quality Gate zeigt den echten, zentralen Gate-Status.

**Tests:** 6 neue Tests (`tests/ecommerce-dashboard.test.js`) — u. a. struktureller Beweis, dass das E-Commerce-Dashboard Werknetz24 nie referenziert und `/api/master/businesses` nie selbst aufruft, sowie ein automatischer Abgleich, dass Server-Registry (`lib/master-store.js`) und Client-Fallback (`app/master/page.jsx`) bei den Betriebs-Links nicht auseinanderlaufen können. Gesamtsuite 61/61 grün, `npm run build` erfolgreich (weiterhin 12/12 API-Funktionen, 25 Routen). Volle Details: `docs/MULTI-BUSINESS-ARCHITECTURE.md`.

**Getestet:** 8 neue Tests (`tests/multi-business-separation.test.js`) beweisen u. a. strukturell, dass `ecommerce-store.js` den Werknetz24-Connector nie importiert, und dass `listTasks`/`listFinance` mit `business_id`-Filter keine Vermischung zulassen. Gesamtsuite 55/55 grün, `npm run build` erfolgreich (weiterhin 12 API-Funktionen, 25 Routen). **Nicht deployed** (laut Auftrag).

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

## Quality Gate (Phase 4, 20.09.2026)

**Vollständiger Bericht:** `docs/QUALITY-GATE-PHASE-4.md`.

🔴 **BLOCKER gefunden und teilweise behoben:**
- **Behoben, seit 21.09.2026 auch live aktiv:** Alle 6 mutierenden API-Endpunkte (`/api/master/*`, `/api/orders`) hatten keine Authentifizierung — neues `lib/auth.js` (`MASTER_API_SECRET`, zeitkonstanter Vergleich, fail-closed) jetzt auf allen angewendet, inkl. Frontend-Anpassung (`lib/admin-fetch.js`) und neuem `admin-auth`-Check im Quality Gate selbst. `MASTER_API_SECRET` ist jetzt gesetzt und live bestätigt (401 ohne Token, 200 mit korrektem Token).
- **Weiterhin offen, nicht behebbar ohne echte rechtliche Prüfung:** Impressum, Datenschutzerklärung, AGB und Widerrufsbelehrung fehlen komplett — vor jedem öffentlichen/echten Verkauf zwingend nötig. Keine dieser Texte wurde erfunden.
- **Weiterhin offen (unverändert seit Phase 1):** Vercel-Team-Build-Limit.

**Datenschutz/Tracking:** 🟢 nichts Kritisches — keine unnötigen personenbezogenen Daten, kein Tracking-Code vorhanden, alle externen Dienste dokumentiert.

**Tests:** 47/47 grün (8 neu), `npm run build` erfolgreich, weiterhin 12 API-Funktionen. Nicht deployed.

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

## Werknetz24-Anbindung (Phase 2, 20.09.2026; live aktiviert 21.09.2026)

🟢 **LIVE — Verbindung aktiv, echte Daten fließen.**

Read-only Connector (`lib/werknetz24-connector.js`) an das bestehende, produktive `werknetz24-landing`-Repository gebaut. Liefert bei Aufruf von `listBusinesses()` den echten, live abgefragten Werknetz24-Status (Systemstatus, offene Incidents/Aufgaben, offene Rechnungen/Ausgaben-Summen) im `werknetz24`-Eintrag als `liveStatus`. `WERKNETZ24_STATUS_SECRET` ist seit 21.09.2026 in Production gesetzt; `liveStatus.configured` und `liveStatus.ok` sind live bestätigt `true`, mit echten, aktuell abgefragten Zahlen (bestätigt sowohl über `GET /api/master/businesses` als auch visuell im `/master`-Betriebe-Tab). Details, inkl. warum bewusst ein eigenes Secret statt des Werknetz24-`ADMIN_SECRET` verwendet wird: `docs/WEBHOOKS-AND-INTEGRATIONS.md`.

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

🟢 **DEPLOYMENT ERFOLGREICH UND LIVE VERIFIZIERT (21.09.2026, Phase 5)** — vollständiger Bericht: `docs/DEPLOYMENT-GATE.md`. Live-URL: `https://adnan-sandy.vercel.app`. Das unten beschriebene Team-Build-Limit hat sich zwischenzeitlich aufgelöst (GitHub-Deployments-Verlauf zeigt die letzten 4 Commits alle als "Deployed (completed)"). Rest dieses Abschnitts bleibt als historischer Verlauf erhalten.

<details><summary>Ursprünglicher Befund (20.09.2026, inzwischen gelöst)</summary>

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

</details>

## Verifikation

- 🟢 `npm install` + `npm test` + `npm run build` **erneut am 21.09.2026 (Phase 5) durchgeführt** — 47/47 Tests grün, Build erfolgreich, weiterhin 12 API-Funktionen.
- 🟢 **Vercel-Live-Status verifiziert** (nicht mehr offen): `https://adnan-sandy.vercel.app/master` und `/e-commerce` echt aufgerufen, korrekter Inhalt, keine Konsolenfehler. `/api/health` antwortet ehrlich. Unbekannte Route liefert `404`.
- 🟢 **Auth-Fund aus Phase 1 in Phase 4 behoben und in Phase 5 live bestätigt:** ein echter PATCH-Versuch gegen `/api/master/businesses` ohne Secret liefert live `503` — der Schreibschutz ist tatsächlich aktiv in Produktion, nicht nur lokal getestet.

## Regeln

- Keine Bestellung ohne Freigabe.
- Keine kostenpflichtigen Dienste ohne ausdrückliche Freigabe.
- Keine Secrets im Repository.
- Keine echten Kundendaten in Testsystemen.
- Keine erfundenen Finanzzahlen.
- Keine produktive Zahlung ohne Payment-Gate.
- Kritische Fehler stoppen Folgeprozesse.
- Produktionsstatus wird nur nach nachweisbarer Prüfung auf 🟢 gesetzt.

## Update 22.09.2026 — "Kommandozentrale"-Auftrag: Analyse + erster Baustein

Auftrag: Master-Zentrale zur echten Steuerzentrale für Werknetz24 + E-Commerce (Agenten, Fehlerzentrale, direkte Navigation, später auch Schreibzugriff auf Werknetz24-Funktionen wie Lisa/Kalender/Rechnungen) ausbauen.

**Analyse zuerst** (im `werknetz24-landing`-Repo dokumentiert, `docs/MASTER-CONTROL-ARCHITECTURE.md`): kartiert pro Werknetz24-Bereich den echten Code-Stand gegen den Zielzustand. Wichtigste Funde: `werknetz24-landing` hat nur noch 1 freien Vercel-Hobby-Funktionsslot; Easybell/Famulor/Lisa haben keinen serverseitig in Vercel hinterlegten API-Schlüssel — eine echte Fernsteuerung von Lisa aus der Master-Zentrale ist aktuell technisch nicht möglich, unabhängig vom Auftrag.

**Umgesetzt (Commit `3f80dd0`, live):** "Fehler & Warnungen" als eigener, direkt erreichbarer Sidebar-Punkt (vorher im Code vorhandene, aber nie verlinkte `Alerts`-Komponente aktiviert und auf echtes Datenformat korrigiert). Übersicht zeigt jetzt Quality-Gate-Status und letzte Aktivitäten (Audit-Log), alle KPIs/Panels anklickbar. Details: `docs/DEPLOYMENT-GATE.md`.

**Bewusst nicht gebaut (Fake-Daten-Risiko oder Geld-/Kundendaten-Risiko):**
- Agenten-Zentrale mit Live-Status/Start/Stop — keine Infrastruktur vorhanden, die das nachverfolgt.
- Echte Schreibsteuerung von Werknetz24 (Kalender/Rechnungen/Aufgaben anlegen aus der Master-Zentrale heraus) — technisch möglich, aber bewusst zurückgestellt, bis ein Sicherheits-/Bestätigungsmechanismus für Schreibzugriffe auf ein produktives System mit echtem Geld steht (Vorschlag in `MASTER-CONTROL-ARCHITECTURE.md`).
- Zentrale Suche über Kunden/Produkte/Bestellungen/Rechnungen/Aufgaben/Systeme — nicht begonnen, eigenständiges größeres Feature.
- Lisa/Famulor/Easybell-Fernsteuerung — blockiert durch fehlenden `FAMULOR_API_KEY` (Adnans Entscheidung, kostenpflichtig).

## Update 22.09.2026 (2) — Werknetz24-Kalender live gebaut, echter Google-Bug entdeckt

Commit [`cd58585`](https://github.com/adnan-51-bit/adnan/commit/cd58585) (Gegenstück zu `10a0f2e` im `werknetz24-landing`-Repo): Master-Zentrale zeigt jetzt auf der Werknetz24-Betriebskarte echte anstehende Kalendertermine und kann neue anlegen (`WerknetzKalender`-Komponente, `/api/master/businesses?werknetz24Kalender=1` + neuer POST-Zweig). 67/67 Tests grün, Build erfolgreich, live deployed.

**Beim Live-Test entdeckt (nicht durch diese Änderung verursacht):** `GET /api/master/businesses?werknetz24Kalender=1` liefert `{"configured":true,"ok":false,"error":"invalid_grant"}` — Werknetz24s Google-Verbindung (`GOOGLE_REFRESH_TOKEN`) ist aktuell ungültig/abgelaufen. Betrifft wahrscheinlich auch Lisas Live-Terminbuchung während echter Anrufe (`kalender-pruefen`/`kalender-buchen`), nicht nur diese neue Anzeige. **Fix braucht Adnans eigenen Google-Login** (Klick auf "Gmail verbinden" in `admin-zentrale.html` — deckt laut Code auch den Calendar-Scope ab), kann nicht selbst behoben werden.

## Nächster STOP-Punkt

**Deployment-Gate erreicht und bestätigt (Phase 5, 21.09.2026); `MASTER_API_SECRET` und `WERKNETZ24_STATUS_SECRET` seit 21.09.2026 gesetzt und live verifiziert.** Vor echtem Geschäftsbetrieb weiterhin nötig: `SUPABASE_*` (nur mit echtem Supabase-Konto — Adnan hat noch keins, bewusst nicht selbst angelegt, bleibt Fallback-Speicher), und vor allem: **rechtliche Pflichttexte (Impressum/Datenschutz/AGB/Widerruf) erstellen** — 🔴 BLOCKER, s. `docs/QUALITY-GATE-PHASE-4.md`.

## Update 26.09.2026 — Full-System-Audit Phase 2: Master-Zentrale als Steuerzentrale

Grundlage: `docs/FULL-SYSTEM-AUDIT.md` im Repo `werknetz24-landing`. Commits `ab7ee31`, `c8491d1`, `34381d0` (alle CI ✅, Vercel ✅ Production).

| Bereich | Status | Verifiziert |
|---|---|---|
| Sicherheitslücke F1: Werknetz24-Daten ohne Anmeldung über `/api/master/businesses?werknetz24…` | 🟢 behoben | live: alle Werknetz24-Zweige `401` ohne Secret, `liveStatus` ohne Anmeldung nur „Anmeldung erforderlich“ |
| Direktnavigation (Werknetz24, E-Commerce, Agenten, Fehler, Systeme, Finanzen) | 🟢 | Playwright live: jeder Klick landet direkt im Ziel, `/master?tab=alerts|agents|systems|finance` direkt aufrufbar, Rücknavigation aus `/werknetz24` und `/e-commerce` → `/master` |
| Fehlerzentrale (`/master?tab=alerts`) | 🟢 anonym / 🟡 angemeldet ungeprüft | anonym live: 8 Einträge mit Bereich, [Öffnen] [Logs] [Reparieren]; mit Secret (Werknetz24-Incidents, „Prüfung erneut ausführen“, „Als behoben abschließen“) nur per Test abgedeckt, live braucht Adnans Secret |
| Agenten-Zentrale (`/master?tab=agents`) | 🟢 anonym / 🟡 angemeldet ungeprüft | 6 echte Werknetz24-Agenten + E-Commerce-Engine + Master-Systemmonitor; Start/Stop/Pause/Neustart ehrlich OPEN, Retry real |
| Systemmonitoring um Werknetz24-Systemwächter ergänzt | 🟢 Code / 🟡 angemeldet ungeprüft | |
| Famulor nicht mehr fest 🟢 (F9), Werknetz24-Karte Ampel aus Live-Status | 🟢 | Test `master-systems.test.js` |
| Secret-Abfrage nach „Abbrechen“ | 🟢 | live 46 → 1 Abfrage, `tests/admin-fetch.test.js` |
| Styles Fehler-/Agenten-Zentrale (styled-jsx-ID-Kollision) | 🟢 | live: Klassen ohne `jsx-undefined`, Screenshots |
| Persistenz (Supabase) | 🔵 | unverändert Fallback-Speicher |

Tests: **93/93**, `npm run build` ✅ (26 Routen, weiterhin 12 API-Routen, keine neue Route-Datei).
