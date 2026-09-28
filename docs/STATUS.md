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

## Update 26.09.2026 (2) — Persistenz: Supabase Free verbunden (lokal verifiziert, noch nicht deployt)

🟢 Datenbank eingerichtet, Migrationen angewandt, echter Persistenztest bestanden (siehe `docs/DATABASE.md`). 🟡 Production erst nach Deploy auf Supabase umgestellt. Neu: Leseschutz für Kunden/Bestellungen/Retouren/Finanzen/Audit, Systemmonitor prüft Supabase per echter Leseprobe (🟢/🔴 statt pauschal 🟡). Tests 97/97, Build ✅.

## Update 26.09.2026 (3) — Reparaturphase: E-Commerce + Agenten (lokal, noch nicht deployt)
- **E-Commerce:** 3 reproduzierte Fehler im Bestellweg behoben; Ereignisse und Webhook-Belege persistent. E2E gegen die echte DB 23/23.
- **Agenten-Zentrale:** Werknetz24 (8 Betriebs-Agenten), E-Commerce (Engine mit echter letzter Aktivität) und Master (Systemmonitor) strikt getrennt. Je Agent: aktuelle Aufgabe, benötigte Verbindungen, Test/Reparatur. Entwicklungs-Werkzeuge separat. Details in `werknetz24-landing/docs/FINAL-INTEGRATION-AUDIT.md`.
- Tests 111/111, Build ✅.

## Update 26.09.2026 (4) — Reparaturphase abgeschlossen, live geprüft
Production live und eingeloggt getestet: Master, Werknetz24-Anbindung, E-Commerce, Agenten, Persistenz (Supabase), Navigation, Trennung. `MASTER_API_SECRET` am 26.09. neu erzeugt und gesetzt (Wert nur lokal gespeichert, nie ausgegeben). Endtabelle: `werknetz24-landing/docs/FINAL-INTEGRATION-AUDIT.md` („ABSCHLUSS DER REPARATURPHASE“). Tests 114/114, Build ✅.

## Update 26.09.2026 (5) — Direktnavigation Datenbereiche + Live-Schreibtest
Kunden/Leads/Rechnungen/Bestellungen/Produkte direkt aus `/master` (Test gegen tote Links). Production-Schreibtest mit Fehlerfällen bestanden, Daten überstehen ein neues Deployment (Testdaten danach gelöscht). Tests 116/116.

## Update 26.09.2026 (6) — Endstand
Integrationen-Übersicht, Direktnavigation System/Integrationen, Mobil-Regression behoben (`f90a8ff`). Finaler Live-Test bestanden (anonym + eingeloggt). Offen nur: Google-Zustimmung, `WA_APP_SECRET`, `FAMULOR_API_KEY` (Konto-Aktionen Adnan). Tests 117/117.

## Update 26.09.2026 (7) — „Alle Bereiche“ + Qualitätsgate-Durchlauf
- Neuer Tab `/master?tab=bereiche`: jeder Bereich mit Lesen/Schreiben/Steuern/Status/Letzter Check/Letzter Fehler/Aktion, nur echte Quellen.
- Behoben und live geprüft:
  - feste Status ersetzt
  - Systemstatus nennt rote Systeme
  - Stripe je Betrieb getrennt
  - „Anmeldung erforderlich“ statt „nicht erreichbar“
- Tests 120/120, Build ok, Live-Rundgang 0 JS-Fehler.
- Details: werknetz24-landing `docs/FINAL-INTEGRATION-AUDIT.md`.

## Update 26.09.2026 (8) — Master-Auftrag Gesamtprüfung
- Behoben und live geprüft:
  - Aufgaben-Lesen nur mit Secret, ohne Anmeldung ehrliche Anzeige
  - PATCH-Fehlercodes 404/400
  - Geister-Aufgabe im Speicher-Modus
  - Aufgabe „Persistenz fertigstellen“ nach Live-Nachweis auf Erledigt gesetzt
- Tests 121/121, Build ok; beide Vercel-Projekte: alle Deployments der letzten Stunden „Ready“.
- Live:
  - Navigation Master ↔ Werknetz24 ↔ E-Commerce hin und zurück
  - 404-Seite, unbekannter Tab fällt auf die Übersicht zurück
  - 0 JS-Fehler; mobil ohne Überlauf
- Offen, extern:
  - Google (Zustimmung), `WA_APP_SECRET`, `FAMULOR_API_KEY` (im Famulor-Konto existiert noch kein Schlüssel)
  - E-Commerce-Stripe (bewusst gesperrt), Shopify nicht eingerichtet
- Details: DATABASE.md und werknetz24-landing `docs/FINAL-INTEGRATION-AUDIT.md`.

## Update 26.09.2026 (9) — Finaler Fertigstellungs-Auftrag
- Master-Code unverändert. Tests 121/121, Build ok.
- Live-Regression bestanden: Navigation, Persistenz, 401-Schutz, 404, mobil, 0 JS-Fehler.
- „Sicherheit“ zeigt nach dem Werknetz24-Fix nur noch „ADMIN_SECRET ungewöhnlich kurz“.
- Shopify-Webhook fail-closed (503), E-Commerce-Stripe weiterhin bewusst gesperrt.

## Update 26.09.2026 (10) — Nachprüfung nach „eingetragen“
- Die drei Werte (`GOOGLE_REFRESH_TOKEN` neu, `WA_APP_SECRET`, `FAMULOR_API_KEY`) sind in Vercel nicht angekommen. Werknetz24 wurde dennoch neu deployt: Google weiterhin `invalid_grant`.
- Vollständige Live-Regression Master/Werknetz24/E-Commerce bestanden, keine Code-Änderung nötig. Tests 121/121, Build ok.

## Update 26.09.2026 (11) — Final Quality Gate
- Neu: „⎋ Abmelden“ in der Seitenleiste (`logoutMaster()` in `lib/admin-fetch.js`). Vorher gab es keinen Logout, das Secret blieb dauerhaft im Browser. Live getestet.
- Negativtests live bestanden:
  - falscher Bearer → 401
  - fehlende Pflichtfelder / ungültige E-Mail / kaputtes JSON → 400
  - Shopify-Webhook → 503
- Regression: Tests 122/122, Build ok, 0 JS-Fehler.

## Update 26.09.2026 (12) — Browsertour + E-Commerce-Ablauf live
- Alle 15 Routen + 30 Tabs angemeldet, Desktop + Handy: 0 JS-Fehler. 4 Handy-Überläufe behoben (`f3ffef3`), live 90/90 ok.
- Bestellablauf live über die Production-API 13/13 (inkl. Quality-Gate-Sperre nach Zahlung, Fehlerfälle, Retoure, Persistenz, Trennung), aufgeräumt.

## Endstand 26.09.2026, ca. 20:45
- Technisch abgeschlossen, Production live, Git sauber (`8ed2201`). Offen nur Werknetz24-Zugänge (Adnan) sowie E-Commerce-Zahlungen/Shopify (Entscheidung).

## Update 26.09.2026 (13) — Eigener Shop vorbereitet (geschlossen)
Adnans Entscheidung: „Alles vorbereiten“ und „Eigener Shop, kostenlos“ (kein Shopify).
- **Kundenseiten:**
  - `/laden`: Produkte, Warenkorb, Bestellformular
  - `/laden/danke`: Rückkehr nach der Bezahlung
  - `/laden/{impressum,datenschutz,agb,widerruf}`: zeigen „wird vor Eröffnung veröffentlicht“, bis echte, geprüfte Texte in `lib/shop-rechtstexte.js` stehen
- **Bestellung** (`POST /api/orders?type=shop-bestellung`):
  - Preise nur serverseitig
  - legt Kunde + Bestellung an, dann Stripe Checkout (ohne SDK, Idempotency-Key)
  - Scheitert Stripe, wird die Bestellung storniert
- **Zahlungsbestätigung** (`/api/payments/stripe`):
  - Stripe-Signaturprüfung (Toleranz 5 min)
  - jedes Ereignis nur einmal (`ecommerce_webhook_receipts`)
  - nur `checkout.session.completed` + paid + `business_id=ecommerce` → Bestellung `paid`
- **Start-Checkliste** (`lib/shop.js`, sichtbar in E-Commerce → Quality Gate):
  1. Rechtstexte vollständig + `SHOP_RECHTSTEXTE_FREIGEGEBEN`
  2. `STRIPE_SECRET_KEY`
  3. `STRIPE_WEBHOOK_SECRET`
  4. ≥ 1 Produkt READY/PUBLISHED mit echter positiver Marge
  5. Supabase
  6. `SHOP_LIVE`
  - Live-Stand: nur 5 erfüllt → **geschlossen**.
- **Shopname** zentral in `lib/shop-marke.js`, Platzhalter „Online-Shop“.
- **Tests:** 131/131, 9 neue. Weiterhin 12 Server-Funktionen (Vercel-Limit). Live: Bestellung 503, Webhook 503, Seiten 200, Browser 0 Fehler.

## Update 26.09.2026 (14) — Sortiert24: TECHNISCH STARTKLAR – VERKAUFSSTART AUSSTEHEND
- Name „Sortiert24“; Produktfelder (Beschreibung, Bilder, Bestand, Lieferzeit) per Migration `20260926220000`; Produkt-Bearbeitung mit Live-Marge; Shop mit Kategorien, Details, dauerhaftem Warenkorb, Versand, Bestandsprüfung/-abbuchung.
- PATCH kann den Pipeline-Status nicht mehr überspringen (vorher: ungeprüftes Produkt direkt auf READY möglich).
- Tests: 135/135. Browsertest 25/25 (geöffneter Zustand simuliert), App-Runde 90/90. Build ok, 12 Funktionen.
- Anleitung und Start-Checkliste: `docs/SORTIERT24.md`.

## Update 26.09.2026 (15) — Anmeldeseite statt Browser-Fenster
- Anlass: Adnan kam nicht in die Master-Zentrale. Im Browser war der 13-stellige Werknetz24-Code gespeichert, der Server lehnte ihn ab, und das alte `window.prompt` sagte nie „Code falsch“. Der 64-stellige Master-Code lag nur in einer Datei.
- Neu:
  - `/anmelden` mit klarer Meldung und Rücksprung (nur interne Pfade)
  - „⎆ Anmelden / ⎋ Abmelden“ in den Kopfzeilen von Master, E-Commerce und Werknetz24-Übersicht, auch mobil sichtbar
  - Ein vom Server abgelehnter gespeicherter Code wird automatisch entfernt.
  - Schreiben ohne Anmeldung → Weiterleitung zur Anmeldeseite; kein Browser-Fenster mehr.
- Adnans Entscheidung: eigenen Master-Code vergeben. **Er setzt `MASTER_API_SECRET` selbst in Vercel**, Claude ändert ihn nicht.
- Tests 138/138, live: Anmelden/Abmelden/falscher Code/Rücksprung auf Desktop + Handy, 0 JS-Fehler, 0 Browser-Fenster.

## Update 27.09.2026 (16) — Sortiert24-Produktkatalog
- **Produktfelder:** Kurz-/Langbeschreibung, Vorteile, technische Daten, Lieferumfang, Hersteller, SKU, EAN (Prüfziffer), Lieferanten-URL, EK/Versand/Sonstiges jeweils mit Quelle, Bildquelle + Nutzungsrecht, Katalogstatus.
- **Kalkulation netto** (`lib/kalkulation.js`): Einstand, Rohmarge, Quote.
  - Behobener Fehler: Die Marge war vorher Brutto-VK minus Netto-EK, also um die USt zu hoch.
- **Katalogstatus** RECHERCHIEREN/GEPRÜFT/BEREIT/GESPERRT:
  - „Produkt prüfen“ (9 Prüfpunkte mit Quellen), „Veröffentlichen“ nur nach Prüfung, „Sperren/Entsperren“
  - Eine Änderung an Preis/Lieferant/Bildern setzt auf RECHERCHIEREN zurück.
  - Der Shop verkauft nur BEREIT.
- **Admin-Tabelle** Produkt | Bild | EK | Versand | VK | Marge | Lieferant | Lieferzeit | Status mit Kennzeichnung „Bildmaterial fehlt – Produkt noch nicht veröffentlichen“.
- **Verkaufspreis optional** (leer = nicht kalkuliert).
- **Recherche:** 7 belegte Kandidaten importiert, 0 verifiziert. Details: `docs/SORTIERT24-PRODUKTQUELLEN.md`.
- **Tests:** 143/143; Browsertest Katalog 18/18 (Desktop + Handy).

## Update 27.09.2026 (17) — Jeder Klick führt direkt zum Inhalt
- Adnans Wunsch: „wenn ich in der Zentrale einen Bereich anklicke, will ich direkt das sehen, was dort steht“.
- Die Bestandsaufnahme fand 40 Karten, die wie Knöpfe aussahen, aber nichts taten. Jetzt verlinkt:
  - **Master:**
    - Kachel „Betriebe“, Betriebszeilen → /werknetz24 bzw. /e-commerce
    - „Nächste Aufgaben“ → Aufgaben; System-Karten → Integrationen
    - neu: Kacheln und Seitenleiste „Internetseite werknetz24.de ↗“ und „Sortiert24-Shop ↗“
  - **E-Commerce:**
    - Kacheln Produkte, Lieferanten, Bestellungen, Umsatz → jeweiliger Reiter; Kunden und Retouren ebenso
    - Schritte 01–05 → passender Reiter
    - „Shop ansehen ↗“
  - **Werknetz24:**
    - Systemstatus, Probleme, Kunden, Leads → genaue Seite der Admin-Zentrale
    - Aufgaben/Rechnungen → Reiter; rote Meldungen → Fehlerseite
    - Module → Zielseite („Aufträge“ hat keine eigene Seite, bleibt ohne Link)
    - „Internetseite ↗“
- Live: 24/24 Klickziele korrekt, App-Runde 90/90 (Desktop + Handy), 0 JS-Fehler.

## Update 27.09.2026 (18) — Anmeldesperre + Katalog-Vervollständigung
- **Sperre nach 5 Fehlversuchen** (15 min, pro IP, Tabelle `master_login_sperre`). `checkAdminSecret` ist jetzt async, alle 15 Aufrufstellen umgestellt. Ein Aufruf ohne Code zählt nicht, Erfolg setzt zurück.
  - Anlass: Adnan will als Master-Code denselben Code wie beim Werknetz24-Login; das setzt er selbst in Vercel.
  - Live: Zähler 1 → 0 bestätigt; 5er-Sperre per Unit-Test (live bewusst nicht ausgelöst, gleiche IP wie Adnan).
- **Katalog:**
  - neue Spalten Beschreibung + Quelle
  - Zeile „Fehlt: …“ je Produkt
  - Kennzeichnung „Bild fehlt / Rechte ungeklärt“
  - sachliche Beschreibungen für alle 7 belegten Kandidaten
  - unbelegte Planwerte der 4 Produktideen entfernt
  - Bildverbot laut ChiliTec-AGB dokumentiert
- **Tests:** 145/145. Live: Katalog 20/20, Anmeldung 19/19, App-Runde 90/90.

## Update 27.09.2026 (19) — E-Commerce PAUSIERT (Adnans Entscheidung)
- Adnan: „dann lass uns E-Commerce erstmal stoppen, weil es viel Invest braucht“.
- **Stand beim Pausieren** (nichts gelöscht, alles live, Shop geschlossen):
  - Shop /laden fertig, 7-Punkte-Start-Checkliste
  - Katalog mit Netto-Kalkulation + TikTok-Marge (9 % Provision, `lib/shop-marke.js`)
  - 7 belegte Produktkandidaten (ChiliTec/Laprinta) mit Symbolbildern, alle „Recherchieren“
- **Gründe:**
  - Gewerbe nötig (eigener Shop, TikTok Shop und Händlerkonten)
  - echte Einkaufspreise nur mit Händlerkonto
  - echte Produktfotos (Kosten Muster/Abo)
  - bei TikTok zusätzlich regelmäßige Videos
- **Wiederaufnahme:** `docs/SORTIERT24.md` (Start-Checkliste) und `docs/SORTIERT24-PRODUKTQUELLEN.md`.

## Update 27.09.2026 (20) — Neuer Bereich „Einnahmequellen“
- Master-Zentrale → Reiter **Einnahmequellen** (auch als Kachel unter „Alle Bereiche“). Eigene Tabelle `master_einnahmequellen` (RLS, nur service_role) – getrennt von Werknetz24 und E-Commerce.
- Felder: Einnahmequelle, Kategorie, Zielgruppe, Angebot, möglicher Preis (mit Quelle), Startkosten, Werkzeuge, Aufwand, Recht, Markt, Nachfrage, Konkurrenz, Kosten, kostenloser Test, Teststatus, Quellen, erste Kunden, Einnahmen, Kosten, Gewinn (berechnet), Status IDEE/PRÜFUNG/TEST/ERSTER KUNDE/AKTIV/PAUSE.
- Regeln (serverseitig, `lib/einnahmequellen-regeln.js`): **TEST** erst, wenn alle 7 Prüfschritte (Markt, Nachfrage, Konkurrenz, Kosten, Recht, kostenloser Test, Quellen) ausgefüllt sind; **ERSTER KUNDE** nur mit ≥ 1 echtem Kunden; **AKTIV** nur mit echten Einnahmen > 0. Bearbeiten ändert nie den Status.
- API (keine neue Function): `GET /api/master/businesses?einnahmequellen=1`, `POST` actions `einnahmequelle-anlegen|aendern|status` – nur mit Anmeldung (401 ohne).
- Übersicht: Aktive / Im kostenlosen Test / Ideen zur Prüfung / Pause / Kosten / Einnahmen / Gewinn.
- Erste Einträge (live, mit Quellen, nichts geschätzt): Affiliate LKW-Kanal (PRÜFUNG), Pflege Google-Unternehmensprofil (IDEE), Sortiert24 (PAUSE, Link /e-commerce).
- Tests: `tests/einnahmequellen.test.js` (6), gesamt 153/153 grün; Build ok; live geprüft Desktop + Handy (kein Überlauf, keine neuen JS-Fehler).

## Update 27.09.2026 (21) — Grundarchitektur Schritt 1: Gesamtstatus auf der Startseite
- Startseite `/master` zeigt 12 Kennzahlen: Systemstatus, aktive/pausierte Projekte, Fehler, offene Aufgaben, laufende Automatisierungen, Einnahmen, Kosten, Gewinn, Kunden, Leads, Warnungen + Warnungsliste. Jede Kachel zeigt ihren Rechenweg und führt per Klick zum Bereich.
- Rechnung in `lib/gesamtstatus.js` (rein, getestet): Einnahmen = Werknetz24 bezahlte Rechnungen + bestätigte Master-Buchungen + Einnahmequellen; Kosten entsprechend (Werknetz24 bezahlte Ausgaben – neu im Werknetz24-Status, nur Summe); ausstehende/stornierte Buchungen zählen nicht. Fehlt eine Quelle → „unvollständig“ + Warnung, nie geschätzt.
- Regel: Einnahmen/Kosten einer Einnahmequelle nur dort eintragen, nicht zusätzlich als Master-Buchung (sonst doppelt).
- „Laufende Automatisierungen“ zeigt bewusst „—“, bis der Bereich Automatisierungen echte Läufe erfasst (Schritt 4).
- E-Commerce-Betrieb in der Datenbank auf Status PAUSIERT gesetzt.
- Tests: 157/157 (adnan), 171/171 `api/customers.test.js` (werknetz24-landing); live Desktop + Handy geprüft.
- Reihenfolge der nächsten Schritte: 2 Aufgaben-Filter (Kosten, Benutzeraktion, automatisch erledigbar) → 3 Einnahmequellen-Ausbau (SKALIEREN, Aufgabe erzeugen, Kunde zuordnen) → 4 Automatisierungen mit echten Läufen → 5 Agenten → 6 Finanzen je Bereich → 7 einheitliche Bereichsseiten.

## Update 27.09.2026 (22) — Steuerung: Aktionen, Kostenschutz, Automatisierungs-Log, Tagesbericht; Zentrale auf mehrere Seiten verteilt
- **Seitenaufbau** (Adnan: „nicht alles auf eine Seite“): Seitenleiste in Gruppen Überblick / Geschäftsbereiche / Steuerung / System. Jede Seite hat eine eigene Adresse `/master?tab=…`.
  - **Überblick** (Start): Statusleiste mit 11 Werten (System, Geschäftsbereiche, Einnahmen, Kosten, Gewinn, Kunden, Leads, Aufgaben, Automatisierungen, Agenten, Fehler; Rechenwege aufklappbar), Geschäfts-Control-Center (🟢 AKTIV / 🟡 TEST / ⚪ PAUSE / 🔴 FEHLER je Bereich, mit Grund und Direktlinks), „Jetzt zu tun“, „Benutzeraktion erforderlich“, „Nächste Schritte“.
  - **Heute & Bericht** (`?tab=heute`): Heute erledigt, Automatisch gelöst, Fehler, Tagesbericht (9 Fragen).
  - **Automatisierungen** (`?tab=automation`): alle Aktionen nach 🟢/🟡/🔴 + Automatisierungs-Log. Die frühere feste Textliste ist ersetzt.
  - Die frühere volle Startseite (Betriebsübersicht, System-Lage, Aktivitäten, Kachelreihen) ist entfernt; ihre Inhalte stehen auf Betriebe, Systemmonitoring/Fehlerzentrale und Audit-Log.
- **Aktionslogik** `lib/aktionen.js`: 18 Aktionen. Kategorien: AUTOMATISCH (Server-Knopf oder „macht Claude“), FREIGABE (Geld/Veröffentlichung – zeigt Was/Warum/Kosten/Rhythmus/Bereich/Leistung), NICHT_MOEGLICH (mit Grund + Link zur richtigen Stelle).
- **Kostenschutz** `pruefeAusfuehrung`:
  - ohne Freigabe → 409
  - Freigabe gilt nur für genau diese Aktion und nur mit `bestaetigt: true`
  - auch mit Freigabe führt die Zentrale **keine** Geld-Aktion aus → 501, „beim Anbieter selbst ausführen“
  - gesperrt (E-Commerce pausiert, Zahlungen) → 423
  - verboten → 403
- **Ausführung + Log** `lib/aktion-ausfuehren.js`:
  - Echte Aktionen: Systemprüfung, Werknetz24-Systemwächter, Tests & Build (GitHub Actions), Git-Status (GitHub Commits), Quality Gate, Tagesbericht.
  - Jeder Versuch, auch ein abgelehnter, landet im Audit-Log (`automation.lauf`) mit Zeit, Agent, Bereich, Aktion, Ergebnis, Fehler, Kosten (immer 0) und Quelle.
  - `werknetz24-landing` ist privat → ohne optionalen `GITHUB_TOKEN` ehrlich „nicht prüfbar (privat)“.
- **API** (keine neue Function): `GET /api/master/businesses?aktionen=1`, `?tagesbericht=1`, `POST {action:"aktion-ausfuehren", id, freigabe?}` – alles nur mit Anmeldung.
- **Werknetz24-Status**: zusätzlich `leads.heute` / `kunden.heute` (neu angelegt heute, Berlin), nur Zählwerte.
- **Tests**: `tests/steuerung.test.js` (8). Gesamt 164/164 (adnan), 171/171 `api/customers.test.js`.
- **Live geprüft**:
  - ohne Code 401
  - Geld-Aktionen 409, Verbot 403
  - 6 echte Aktionen laufen und stehen im Log
  - alle 14 Seiten am Desktop und Handy: kein Überlauf, keine JS-Fehler, Klick-Navigation ok
- Später (nicht gebaut): Einnahmequellen-Ablauf Interesse → Wiederholbar → Automatisieren → Skalieren als eigene Stufen; zeitgesteuerte Läufe (Cron) für Tagesbericht.

## Update 27.09.2026 (23) — Einnahmequellen: vollständiger Workflow
- **Ablauf:** Idee → Prüfung → kostenloser Test → **Interesse** → erster Kunde → Einnahme (aktiv) → **Wiederholbar** → **Automatisiert** → **Skalieren**, dazu Pause.
- **Regeln** (serverseitig, `lib/einnahmequellen-regeln.js`, jede Stufe setzt die vorherigen voraus):
  - Interesse = alle Prüfschritte + Interesse-Nachweis
  - Erster Kunde = ≥ 1 zugeordneter Kunde
  - Aktiv = zusätzlich Einnahmen > 0
  - Wiederholbar = zusätzlich ≥ 2 Kunden
  - Automatisiert = zusätzlich Beschreibung, was automatisch läuft, und Grad > 0 %
  - Skalieren = zusätzlich Gewinn > 0
- **Neue Felder** (Migration `20260927200000_einnahmequellen_workflow.sql`, angewendet): Beschreibung, benötigte Schritte, nächste Aufgabe, Verantwortlich/Agent, Automatisierungsgrad (0–100), Automatisierung, mögliche Einnahmen, Risiken, benötigte Benutzeraktion, Interesse-Nachweis, Kundenliste (eigene, getrennt von Werknetz24/E-Commerce), Stufe vor Pause. `master_tasks_v2.einnahmequelle_id` als Bezug.
- **Knöpfe je Einnahmequelle:** Bearbeiten, Aufgabe erzeugen, Kunde zuordnen, Automatisieren, Skalieren, Start/Stop, „Weiter: nächste Stufe“, Status ändern, Aufgaben & Verlauf.
- **Aufgaben:** landen in der zentralen Aufgabenliste (`area` „Einnahmequelle: …“, `business_id` master).
- **Aktivitätsverlauf:** jede Aktion im Audit-Log (`einnahmequelle.*`), pro Eintrag abrufbar.
- **Benutzeraktion:** das Feld „benötigte Benutzeraktion“ erscheint automatisch unter „Benutzeraktion erforderlich“ auf der Startseite bzw. im Tagesbericht (außer bei Pause).
- **API** (keine neue Function):
  - `POST` actions `einnahmequelle-aufgabe|kunde|start|stop`
  - `GET ?einnahmequellen=1&id=…` → Aufgaben + Verlauf
  - alles nur mit Anmeldung
- **Tests:** 170/170 (neu: 5 Workflow-Tests + 1 Tagesbericht-Test).
- **Live geprüft** mit markiertem Testeintrag (danach restlos gelöscht: Eintrag, Aufgabe, 6 Verlaufseinträge):
  - alle Aktionen per API
  - Regeln lehnen Automatisieren/Skalieren ohne Nachweis ab
  - 401 ohne Anmeldung
  - Browser Desktop + Handy ohne Überlauf und ohne JS-Fehler
- Echte Einträge unverändert.

## Update 27.09.2026 (24) — Einnahmequellen als Arbeitsbereich (Katalog, echte Aufgaben, Tageszentrale)
- **Katalog A–F**:
  - A Online-Anfragen bearbeiten
  - B Lead-Recherche / B2B-Daten
  - C Lokale Unternehmen
  - D Content-/Produktrecherche
  - E Affiliate
  - F Werknetz24: nur Sprung in den eigenen Bereich, keine Daten
- Ansicht umschaltbar: Katalog oder Status.
- **Neue Felder** (Migration `20260927220000_einnahmequellen_katalog.sql`): laufende Kosten, Fähigkeiten, Erlösart, Nachfrage (unbekannt/zu prüfen/belegt – „belegt“ nur mit Quelle), rechtliche bzw. Gewerbe-/Steuerprüfung (ja/nein/offen), Kriterien für die Arbeitspriorität, Automatisierungs-/Skalierungspotenzial, Automatisierungsstufe (manuell → teilweise → weitgehend), Automatisierungsplan, Quellenliste. Leere Angaben erscheinen als „noch zu prüfen“.
- **Arbeitspriorität P1–P4** (`arbeitsPrioritaet`, intern, keine Erfolgsaussage):
  - P1 = 0 € + schnell testbar + direkte Kunden
  - P2 = 0 € + wiederholbar
  - P3 = automatisierbar + skalierbar
  - P4 = kostenpflichtig, komplex oder Startkosten unbekannt
- **Quellen**: Quelle, URL, Datum und belegte Aussage sind Pflicht (`pruefeQuelle`).
- **Automatisierungsplan**: nur vollständige Vorschläge (was, Daten, Tool, Kosten, Risiko, Freigabe). Sobald Kosten entstehen, ist die Freigabe Pflicht. Es wird nie etwas aktiviert.
- **Aufgaben** (`master_tasks_v2`):
  - neue Felder: Beschreibung, nächste Aktion, Quelle, Ergebnis
  - Status nur noch Offen / In Arbeit / Wartet auf Benutzer / Erledigt / Gestoppt; „Blockiert“ per Migration zu „Wartet auf Benutzer“ umbenannt
  - neue Aufgabenseite mit Filtern: Status, Bereich, Einnahmequelle, Priorität
- **Tageszentrale** (`?tab=heute`): wichtigste Aufgabe, nächste Benutzeraktion, offene und wartende Aufgaben, aktive Einnahmequellen, erkannte Probleme, heute erledigt, letzte Aktivitäten, Knopf „Tagesbericht erstellen“ (echte Aktion im Log).
- **Daten eingetragen** (recherchiert, 15 Quellen mit Datum 27.09.2026: GewO § 14, DSGVO Art. 14/28, UWG § 7, UrhG § 51, Amazon PartnerNet, Vergleichsanbieter Google-Profil):
  - A Anfragen-Service
  - B Lead-Recherche (P4, rechtlich komplex)
  - C Google-Profil-Pflege
  - D Recherchepakete
  - E Affiliate (nur Vorbereitung, keine Partnerprogramme/Links)
  - Sortiert24 (pausiert)
  - Überall Nachfrage „zu prüfen“ und mögliche Einnahmen „noch zu prüfen“.
  - 5 echte nächste Aufgaben angelegt.
  - E-Commerce-Aufgaben (Stripe, Lieferanten-Connector) auf „Gestoppt“ gesetzt, weil E-Commerce pausiert ist.
- **Tests**: 179/179.
- **Live geprüft** (18 Prüfungen, Testeintrag danach restlos gelöscht):
  - Login-Schutz
  - Katalog A–F
  - P1-Anzeige
  - Quelle und Vorschlag über die Oberfläche
  - Datenpersistenz
  - Kostenschutz
  - Aufgabe mit allen Feldern, Filter, Statuswechsel
  - Tageszentrale und Tagesbericht
  - Desktop + Handy ohne Überlauf und ohne JS-Fehler

## Update 27.09.2026 (25) — Teil 3A: Einheitlicher Ablauf + kostenlose Automatisierungen
- **Ablauf** (Migration `20260927240000_einnahmequellen_automatisierung.sql`, alte Stufen umgemappt): Idee → Prüfung → Test → Automatisieren → Veröffentlichung → Leads/Kunden → Einnahmen → Skalieren (+ Pause).
- **Nachweise je Stufe:**
  - ab Test: Prüfstand
  - Automatisieren: Beschreibung, was läuft, und Grad > 0
  - Veröffentlichung: wo und wann
  - Leads/Kunden: ≥ 1 echter Lead oder Kunde
  - Einnahmen: Kunde + echte Einnahmen
  - Skalieren: zusätzlich Automatisierung, ≥ 2 Kunden, Gewinn > 0
- **Neue Felder:** benötigte Konten (nur Namen, nie Passwörter), Ergebnisse, Veröffentlichung, Leads, Entwürfe. In der Karte zusätzlich Quelle/Link und die echten Zahlen (Leads, Kunden, Einnahmen, Ausgaben, Gewinn).
- **Kostenlose Automatisierungen** (`lib/eq-automation.js`, vorlagenbasiert, ohne KI/kostenpflichtige Dienste, alles als Entwurf, nichts wird gesendet):
  - Recherche-Checkliste (offene Prüfpunkte + kostenlose Such-Links)
  - Content-Ideen
  - Texte (Angebot/Kurzprofil; Preis ohne Quelle bleibt „[noch zu prüfen]“)
  - E-Mail-Entwürfe (nur für bestehende Kontakte, UWG-§-7-Hinweis)
  - Statusmeldung
  - Einnahmequellen-Report
- **Lead-Erfassung:**
  - Einwilligung ja/nein ist Pflicht.
  - Beim Erfassen entsteht automatisch eine Nachfass-Aufgabe (fällig in 3 Tagen). Ohne Einwilligung steht dort der Hinweis „keine Werbung senden“.
  - Lead-Status neu/kontaktiert/interessiert/kunde/verloren; „kunde“ übernimmt den Lead als Kunden.
- **Aufgaben aus „Benötigte Schritte“:** eine Zeile = eine Aufgabe, ohne Doppelte.
- **Wiederkehrende Prüfungen:**
  - neue Aktionen: Quellen-Links prüfen, überfällige Aufgaben, Einnahmequellen-Report und der Sammellauf „Wiederkehrende Prüfungen“ (Systemprüfung, Quellen, Fälligkeit, Report, Tagesbericht)
  - **täglich per Vercel Cron** (`vercel.json`, 05:00 UTC, Hobby-kostenlos; im Dashboard als aktiv bestätigt)
  - Cron-Weg `GET ?cron=wiederkehrend`: höchstens 1× pro Stunde, Antwort nur `{ok, gelaufen}`; ist ein optionales `CRON_SECRET` gesetzt, wird es verlangt
- **Quellen-Prüfung:** Nur 404/410 oder eine nicht existierende Domain gelten als toter Link. Gesperrte oder langsame Seiten (live: gesetze-im-internet.de, lokalbesucher.de) erscheinen als „nicht automatisch prüfbar“, nicht als Fehler.
- **API** (keine neue Function): POST `einnahmequelle-entwurf|lead|lead-status|schritte`, GET `?eqreport=1`, `?cron=wiederkehrend`.
- **Tests:** 186/186.
- **Live geprüft:**
  - Cron-Weg (200, zweiter Aufruf 429)
  - Quellen-Prüfung gegen echte URLs
  - Browser (12 Prüfungen): Ablauf, Lead + Nachfass-Aufgabe, E-Mail-Entwurf, Aufgaben aus Schritten, Lead → Kunde, Report, Automatisierungen-Seite, Desktop + Handy
  - Testeintrag restlos gelöscht
- Echte Einträge ergänzt: benötigte Konten, erste Recherche-Checklisten und Content-Ideen als Entwürfe.

## Update 27.09.2026 (26) — Teil 4A: Content & Werbung + „Wartet auf Freigabe“
- **Neuer Bereich „Content & Werbung“** (`?tab=content`, Tabelle `master_content`, Migration `20260927260000_content_freigaben.sql`, RLS an).
  - Felder: Content-/Video-Ideen, Skript, Titel-Varianten, Beschreibung, Plattform-Varianten (TikTok, Instagram, YouTube Shorts, Facebook, LinkedIn), Bilder mit Pflicht-Rechteangabe, Produkt-/Angebotsinfo, Werbetext, Social-Media-Beiträge, Veröffentlichungen (Plattform/Link/Datum), Quellen, Kennzahlen, Ergebnis, Verlauf.
- **Ablauf** Idee → Recherche → Skript → Content erstellen → Prüfung → Veröffentlichung → Reichweite → Leads → Einnahmen (+ Verworfen). Nachweise je Stufe:
  - Thema
  - Rechercheergebnis
  - Skript
  - Beschreibung + Plattform + Werbekennzeichnung + Bildrechte
  - Freigabe + eingetragener Link
  - echte Kennzahlen, Leads, Einnahmen
- **Kostenlose Automatik** (`lib/content-regeln.js`, Vorlagen, ohne KI):
  - Themen-Recherche-Links (Google Trends, TikTok-, YouTube-, Google-Suche)
  - Ideen-Generator: nur Vorschläge, Übernahme per Klick
  - Skript-Vorlage, 5 Titel-Varianten, Beschreibung mit Hashtags aus dem Thema, Plattform-Varianten, 3 Social-Posts, Werbetext
  - „Automatisch vorbereiten“ füllt nur leere Felder
- **Erfolg erkennen:** Interaktionsrate aus echten Kennzahlen, Vergleich nur mit eigenen Inhalten, erst ab 3 bewertbaren Inhalten.
- **Nie automatisch veröffentlicht**: Prüfung → Freigabe → Adnan postet selbst → trägt den Link ein. Wird Content nach der Freigabe geändert, verfällt die Freigabe und wird neu angefragt.
- **„Wartet auf Freigabe“** (`?tab=freigaben`, Tabelle `master_freigaben`):
  - Arten: Veröffentlichung, Kosten, Werkzeug, Automatisierung, Recht
  - Freigeben/Ablehnen mit Notiz, protokolliert; eine Freigabe löst selbst nichts aus
  - Automatisierungsvorschläge der Einnahmequellen mit „Freigabe nötig“ landen automatisch hier (einmalig)
  - offene Freigaben sind im Tagesbericht die erste Benutzeraktion
- **Werkzeuge**: Vorlagen-Generator (aktiv, 0 €). KI-Texte, TikTok-Schnittstelle und bezahlte Werbung sind standardmäßig **aus** und nur per „Freigabe anfragen“ erreichbar; „freigegeben“ heißt „Einrichtung ausstehend“, nicht eingeschaltet.
- **API** (keine neue Function): `GET ?content=1`, `?content=1&id=…`, `?freigaben=1`; `POST content-*`, `freigabe-entscheiden`, `werkzeug-anfragen`.
- **Daten:** die 10 Videos aus dem Obsidian-Plan „Affiliate LKW-Kanal“ als Content übernommen (verknüpft, vorbereitet, Status Recherche, keine Partnerlinks). Der echte Vorschlag „Formular → Tabelle“ (Anfragen-Service) wartet auf Freigabe.
- **Tests:** 195/195.
- **Live** (13 Prüfungen, Test-Content danach restlos gelöscht):
  - Login-Schutz
  - Vorbereiten
  - Ablauf bis Prüfung, Sperre ohne Freigabe
  - Freigabe über die Oberfläche, Veröffentlichung, Kennzahlen, Reichweite
  - Ideen
  - Desktop + Handy

## Update 27.09.2026 (27) — Teil 4B: E-Mail & Leads + Einnahmen je Einnahmequelle
- **Neuer Bereich „E-Mail & Leads“** (`?tab=leads`, Tabelle `master_leads`, Migration `20260927280000_leads_finanzen.sql`, RLS an). Getrennt von Werknetz24-Leads und E-Commerce-Kunden.
- **Leads:**
  - Erfassen, optional aus eingefügtem Text (E-Mail, Telefon, Name und Firma werden erkannt)
  - Pflichtangaben: „selbst angefragt?“ und „Einwilligung?“
  - automatische Nachfass-Aufgabe
- **Kontaktstatus:** Neu → Interessent → In Kontakt → Angebot → Kunde, dazu Verloren und Gesperrt (Widerspruch).
- **Kontakt nur erlaubt** mit Einwilligung oder eigener Anfrage (UWG § 7), sonst ist „gesendet“ gesperrt. Die Zentrale **versendet nichts**: Entwurf → „In E-Mail-Programm öffnen“ (mailto) → Adnan sendet → „Als gesendet markieren“.
- **E-Mail-Entwürfe:** Antwort, Nachfassen, Angebot, Danke.
- **Antworten einfügen** → automatische Einordnung (Interesse, Frage, Termin, Absage, Widerspruch, Angebot angenommen) → Status und Aufgabe. Widerspruch sperrt den Lead und stoppt seine Follow-ups.
- **Angebot:** Betrag nur, was Adnan einträgt. „Angenommen“ legt den Kunden in der Einnahmequelle an und bucht eine **offene** Einnahme; erst „Geld ist da“ macht daraus eine Einnahme. „Kosten erfassen“ nur mit Beleg.
- **Finanzen je Einnahmequelle** (Einnahmen, Kosten, Gewinn, offen, Quelle, Datum) nur aus echten Buchungen (`master_finance_entries` + `einnahmequelle_id`/`lead_id`).
  - `ist_test`-Buchungen zählen nie.
  - Die Einnahmequelle wird aus den Buchungen nachgezogen; die manuellen Geldfelder im Formular sind entfernt.
  - Im Gesamtstatus keine Doppelzählung mehr.
- **Einnahme-Ablauf je Einnahmequelle** (aus echten Daten abgeleitet): Recherche → Test → Content → Veröffentlichung → Lead → Kontakt → Angebot → Kunde → Einnahme → Report → Skalieren.
- **Automatisierungsgrad:** Manuell / KI vorbereitet (derzeit Regeln und Vorlagen, kostenlos) / Automatisch / Freigabe erforderlich (E-Mail-Dienst, echte KI, Werbung, Abos).
- Die Lead-Liste der Einnahmequelle (Teil 3A) ist jetzt ein Spiegel der zentralen Liste.
- Der Tagesbericht enthält neue Leads und Kunden (Einnahmequellen), offene Einnahmen und offene Antworten als Benutzeraktion.
- **Tests:** 203/203.
- **Live** (20 Prüfungen, Test-Einnahmequelle, Test-Lead und Testbuchungen danach restlos gelöscht):
  - Zugriffsschutz, falscher Code 401
  - Lead aus Text erkennen, Entwurf, gesendet, Antwort (Interesse), Angebot, angenommen, offene Einnahme, „Geld ist da“, Kosten, Gewinn
  - Ablauf bis Einnahme
  - Neuladen / Persistenz, Tagesbericht
  - Desktop + Handy (7 Seiten)
- **Befunde behoben:** Meldung kam vor dem Neuladen (alter Stand sichtbar); Filter-Auswahl auf dem Handy 9 px zu breit.
- **Stand echte Daten:** 0 Leads, 0 Buchungen, alle Einnahmequellen 0 € (nichts erfunden).

## Update 27.09.2026 (28) — Teil 5: Pilot „Pflege Google-Unternehmensprofil“ startbereit
- **Seite `?tab=pilot`** („Pilot: Google-Profil“, erste Seite unter Geschäftsbereiche): Quality Gate, Wartet auf mich, So kommst du zum ersten Kunden, Betriebe, Einnahmen, Aufgaben, Dokumentation & Quellen.
- **Aufgebaut auf Bestehendem:** Einnahmequelle C, zentrale Lead-Liste, Aufgaben, Angebote, Finanzen, Freigaben, Tagesbericht, täglicher Cron. Migration `20260927300000_pilot_google_profil.sql` (`master_leads.profil_analyse`, `master_leads.vertrag`, `master_einnahmequellen.pilot`, Freigabe-Art ENTSCHEIDUNG).
- **Profil-Analyse** (`lib/google-profil.js`): 10 Punkte, von Hand am öffentlichen Profil (keine kostenpflichtige API).
  - Link und Datum sind Pflicht, mindestens 5 Punkte müssen geprüft sein.
  - Ergebnis: Punkte 0–100 (eigene Checkliste, keine Google-Bewertung), Verbesserungsliste und Profil-Check-Bericht ohne Platzierungsversprechen.
  - Automatische Aufgaben: Interessent → „Bericht persönlich zeigen“ (keine Werbe-Mail); Kunde → eine Aufgabe je Verbesserung.
- **Angebot-Vorlage** mit Monatspreis. Der Monatspreis ist Adnans Entscheidung (Wartet auf mich); nach dem Festlegen schließt sich die Entscheidung automatisch.
- **Monatliche Leistung** (nur für Kunden):
  - Der Vertrag erzeugt beim Start und dann im **täglichen Monatslauf** (Aktion `pilot-monatslauf`, Teil der wiederkehrenden Prüfungen) einmal pro Monat 5 Monatsaufgaben und eine **offene** Monatsrechnung. Idempotent; zählt erst nach „Geld ist da“ als Einnahme.
  - Kundenzugang (Verwalter-Einladung über Google, kein Passwort) → Aufgabe „Wartet auf Benutzer“.
- **Quality Gate** (`pilotQualityGate`), 12 technische Punkte:
  - Einnahmequelle, ≥ 3 Quellen, Analyse, Leads/UWG, Angebot, Monatsleistung, Einnahmen-Tracking
  - 0 € Kosten und kein kostenpflichtiges Werkzeug aktiv
  - Aufgaben, Cron < 26 h, Tagesbericht < 26 h, Erreichbarkeit
  - Dazu 2 Benutzer-Punkte: Monatspreis und Gewerbe/Steuer (Freigabe setzt `pilot.gewerbe_geklaert`).
- Seite „Wartet auf Freigabe“ heißt jetzt **„Wartet auf mich“**. Der Tagesbericht enthält eine Pilot-Zeile.
- **Tests:** 209/209.
- **Live** (15 Prüfungen, Test-Betrieb im echten Piloten, danach Pilot exakt auf den vorherigen Stand zurückgesetzt):
  - Quality Gate technisch 12/12
  - Betrieb erfassen, Analyse, Bericht, Aufgabe
  - Kunde, monatliche Leistung, offene Monatsrechnung, 5 Monatsaufgaben, Kundenzugang wartet
  - Monatslauf idempotent
  - Wartet auf mich
  - Desktop + Handy (8 Seiten)
- **Kosten:** 0 €, kein kostenpflichtiges Werkzeug aktiv.

## Update 27.09.2026 (29) — Erster-Kunde-Modus (Pilot Google-Profil)
- **Liste „Potenzielle Kunden“** auf der Pilot-Seite. Je Betrieb:
  - Name, Ort, Branche
  - Quelle (Link + Abrufdatum)
  - Link „Google-Profil suchen“ (Maps-Suche, keine erfundenen Profilangaben)
  - analysiertes Profil, Punktzahl, erkennbare Verbesserungen (aus der Analyse)
  - Profil-Check-Bericht, Stufe, nächste Aufgabe
- Neue Pilot-Aktion `pilot-potenziell` (Name/Ort/Branche/Quelle/Datum Pflicht, keine Doppelten) legt die Aufgabe „Profil-Analyse … (Hoch, 3 Tage)“ an, keine Werbe-Nachfass-Aufgabe. Migration `20260927320000_potenzielle_kunden.sql` (`master_leads.ort`, `.branche`).
- **Stufen** (aus echten Daten): Potenziell → Gespräch → Interesse → Kunde → Laufende Leistung. Knöpfe „Gespräch geführt“ (erst nach der Analyse), „Hat Interesse“, „Kein Interesse“. Nichts ist verbindlich, keine Zahlung, kein Vertrag.
- **Genau eine nächste Aktion** (`naechstePilotAktion`, Reihenfolge Analyse → Bericht zeigen → nachfragen → unverbindliches Angebot) als Banner auf der Pilot-Seite und als Benutzeraktion im Tagesbericht.
- Der Bericht nennt jetzt Branche und Ort.
- Das Quality Gate hat einen neuen Punkt „≥ 3 potenzielle Kunden mit Quelle“ → **technisch 13/13**.
- **3 echte potenzielle Kunden** in Monheim am Rhein (Ort aus dem Werknetz24-Impressum), Angaben nur aus der Quelle, abgerufen am 27.09.2026:
  - Markus Lauck Elektroinstallation – elektriker.org
  - Backprofi (Bäckerei/Café) – monheimer-lokalhelden.de
  - Friseur Haargenau – dasoertliche.de
- **Tests:** 212/212.
- **Live** (14 Prüfungen, nur lesend): Banner, Liste, Stufen, Links, Analyse-Dialog, Gate 13/13, 3 Analyse-Aufgaben, Tagesbericht, Desktop + Handy.

## Update 27.09.2026 (30) — Verkaufsprozess Google-Profil-Service
- **Lead Finder:**
  - Betrieb mit Name, Ort, Branche, Website (optional; nur wenn sicher zum Betrieb gehörig) und Quelle (Link + Datum)
  - Google-Profil-Suche per Link
  - Analyse am echten Profil
  - Priorität aus der eigenen Analyse (hoch < 50, mittel < 75, sonst niedrig; ohne Analyse „offen“)
  - Migration `20260927340000_verkaufsprozess.sql` (`master_leads.website`, `.pilot_crm`)
- **Berichte:** Profil-Check mit Verbesserungen **und** Leistungsumfang. Das Angebot enthält die Google-Regeln (Administrator statt Inhaber, Bewertungen nur mit Erlaubnis, Änderungen werden mitgeteilt, 7-Arbeitstage-Frist, Gebühren schriftlich offengelegt). Der Kundenbericht listet die protokollierten Änderungen.
- **CRM:** Lead → geprüft → Kontakt freigegeben → Gespräch → Interesse → Angebot → Kunde → laufende Leistung → beendet, abgeleitet aus echten Daten.
  - **Kontakt nur nach Adnans Freigabe:** Nach der Analyse entsteht eine ENTSCHEIDUNG „Kontakt zu X freigeben?“ unter „Wartet auf mich“. Freigabe → Aufgabe „Bericht persönlich zeigen“; Ablehnung → Status Verloren.
- **Kundenverwaltung** nach den Google-Richtlinien für Drittanbieter (https://support.google.com/business/answer/7353941?hl=de, abgerufen 27.09.2026, auch als Quelle der Einnahmequelle gespeichert):
  - Leistung starten nur mit dokumentierter **schriftlicher/digitaler** Zustimmung (Nachweisort, Gebühren offengelegt, Kunde bleibt Inhaber, Bewertungs-Erlaubnis ja/nein); nie Passwörter
  - Google-Zugang nur als **Administrator** (bestätigen schließt die Aufgabe)
  - Änderungen nur mit Zugang, werden protokolliert
  - Monatsaufgabe „Bewertungen beantworten“ nur mit Erlaubnis
  - Beenden → Aufgabe „Zugriff entfernen“ mit Frist 7 Arbeitstage
- **Einnahmen:** Angebot → Kunde → Monatsleistung (offen) → **Rechnungsentwurf** (Platzhalter bis zur Gewerbe-/Steuerklärung, Gebühr separat ausgewiesen, Hinweis § 14 Abs. 4 UStG) → „Geld ist da“ → Umsatz/Kosten/Gewinn. Keine Zahlungsschnittstelle.
- **Kostenregel:** 0-Euro-Modus bis zur ersten echten Einnahme. Danach „Kosten vorschlagen“ → Freigabe KOSTEN; eine Ausgabe wird nur mit freigegebener Freigabe erfasst (einmal je Freigabe).
- **Quality Gate:** 18 technische Punkte (neu: Daten korrekt, keine erfundenen Angaben, keine unzulässige Automatisierung, Google-Regeln, Datenschutz) → **live 18/18**. Dazu 2 Benutzer-Punkte (Monatspreis, Gewerbe).
- **3 Leads** (Monheim am Rhein, Quelle + Datum): Markus Lauck Elektroinstallation, Backprofi, Friseur Haargenau. Keine verifizierte Website gefunden (eine Kandidaten-Domain hatte ein ungültiges Zertifikat → nicht übernommen). Kein Kontakt versendet.
- **Tests:** 213/213.
- **Live:** 16 Prüfungen (nur lesend) Desktop + Handy.

## Update 27.09.2026 (31) — Master-Modus: tägliche Optimierung, Zahlungsnachweis, Gesamtübersicht, 3 Profil-Analysen
- **Täglicher Optimierungslauf** (`lib/optimierung.js`, Aktion `optimierung`, Teil der täglichen Prüfungen 07:00):
  - Je Einnahmequelle: funktioniert (echte Einnahmen) / in Arbeit / stockt (≥ 14 Tage ohne Aktivität), dazu Befunde (unanalysierte Leads, überfällige Aufgaben, viele Leads ohne Kunden, Test ohne Leads).
  - Pausieren wird ab 30 Tagen Stillstand **nur vorgeschlagen** (ENTSCHEIDUNG unter „Wartet auf mich“; Freigabe pausiert wirklich).
  - **Fokus-Regel:** bis zur ersten echten Einnahme eine Einnahmequelle vorantreiben; eine neue erst testen, wenn nichts in Bewegung ist (dann niedrigste Arbeitspriorität zuerst).
  - Ergebnis im Tagesbericht („Welche Einnahmequelle funktioniert?“, „Empfehlung“).
- **„Bezahlt“ nur mit Zahlungsnachweis** (z. B. Kontoauszug + Verwendungszweck), wird an der Buchung gespeichert; PIN/TAN/Passwörter werden abgelehnt.
- **Startseite:** zusätzliche Kacheln „Wartet auf mich“, „Aktive Kunden (Einnahmequellen)“, „Offene Leads (Einnahmequellen)“.
- **Profil-Analysen der 3 Leads** (öffentliche Google-Maps-Profile, 27.09.2026, nur sicher Sichtbares, Rest „nicht prüfbar“):
  - Markus Lauck Elektroinstallation 0/100 – **kein Google-Profil gefunden** (2 Suchen)
  - Friseur Haargenau 33/100 – keine Beschreibung, kein Leistungsbereich, keine eigenen Fotos, keine Inhaber-Antworten
  - Backprofi 60/100 – keine Beschreibung, Website-Link nur Marktplatz, selten Inhaber-Antworten
  - Die Kontakt-Freigaben liegen unter „Wartet auf mich“. Der Bericht zeigt einen „Hinweis zur Prüfung“.
- **Befund in eigener Sache:** Ein Commit baute nicht (Zeilenumbruch in einem Template). Vercel hat ihn nicht ausgeliefert; direkt danach behoben. Commits jetzt nur noch nach erfolgreichem Build.
- **Tests:** 217/217.
- **Live:** Optimierung, Zahlungsnachweis-Sperre, Login-Schutz; Übersicht, Pilot, Wartet auf mich, Heute am Desktop und Handy ohne Überlauf und ohne JS-Fehler. Quality Gate technisch 18/18.

## Update 27.09.2026 (32) — Master-Zentrale fertiggestellt: Erste-Einnahme-Modus, Dashboard, Ampel, Geld-Schutz

- **Erste-Einnahme-Modus** (`lib/erste-einnahme.js`): „Was fehlt bis zur ersten echten Einnahme?“ als 13-Schritte-Liste aus echten Daten. Sichtbar auf Überblick, Heute, Pilot und Einnahmequellen sowie im Tagesbericht. Der nächste offene Schritt ist die „Wichtigste nächste Aktion“.
- **Einnahmequellen-Dashboard** je Quelle:
  - Kennzahlen: Status, Aufwand, geplante Kosten, Leads, Interessenten, Kunden, Einnahmen, Kosten, Gewinn, letzte Aktivität, nächste Aufgabe.
  - **Automation Engine:** Intervall (täglich 07:00, bei Pause ausgesetzt), Prüfung, Fehlerstatus, Ergebnis, Optimierungsvorschlag.
- **Ampel GRÜN/GELB/ROT** im Aktionskatalog:
  - 🟢 läuft automatisch.
  - 🟡 deine Entscheidung (Wartet auf mich): Kontakt freigeben, Preis, Pausieren, Kostenvorschlag, Veröffentlichung.
  - 🔴 blockiert: Geld ausgeben, Dienste/Abos buchen, Werbung bezahlen, Zahlungen/Bankdaten, Verträge, Famulor-Testanruf, Shop-Veröffentlichung. Automatische Web-Recherche durch den Server ist OFFEN (ohne kostenpflichtige Such-Schnittstelle nicht möglich).
- **Geld-Schutz:** ROT-Aktionen werden auch mit „Freigabe“ nie ausgeführt (403). Abgelehnte Versuche stehen im Tagesbericht als „blockiert“, nicht als Fehler.
- **Tagesbericht:** neue Zeilen „Was wurde erledigt?“, „Neue Möglichkeiten“, „Welche Tests laufen?“, „Was braucht meine Freigabe?“, „Was fehlt bis zur ersten echten Einnahme?“, „Wichtigste nächste Aktion“.
- **Werknetz24 → PAUSIERT** (nur der Status; Daten, Repository, Obsidian und Funktionen bleiben unverändert). E-Commerce war schon pausiert. Systeme pausierter Bereiche (Famulor, Easybell, Stripe, PayPal, Shopify) erzeugen keine Warnungen und keine Benutzeraktionen mehr.
- **Neue Idee:** Amazon KDP (Kategorie D, Status IDEE, 0 € Start), mit 3 Quellen (KDP-Hilfe: Tantiemen 35 %/70 %, Steuerprofil vor Veröffentlichung Pflicht, Nutzung kostenlos). Gewerbe-/Rechtsprüfung = ja, Nachfrage „zu prüfen“.
- **Tests:** 222/222. Build ok.
- **Live:** Überblick, Heute, Pilot, Einnahmequellen und Automatisierungen am Desktop und am Handy, ohne Überlauf und ohne JS-Fehler. Die 503 von `/api/master/quality-gate` ist gewollt (Zahlungen gesperrt, solange E-Commerce pausiert ist).

## Update 27.09.2026 (33) — Teil 5: Master-Zentrale als Automatisierungs-Zentrale

- **Automatisierungs-Engine** (`lib/eq-pipeline.js`, täglicher Lauf `engine`):
  - Jede Einnahmequelle durchläuft 10 Schritte: Recherche → Vorbereitung → Content/Aktion → Lead → Kontakt → Interessent → Kunde → Einnahme → Auswertung → Optimierung. Ob ein Schritt erledigt ist, wird nur aus echten Daten erkannt.
  - Der nächste offene Schritt wird als Aufgabe „[Engine] …“ angelegt, je Quelle höchstens eine.
  - Kontakt, Kunde, Einnahme und Optimierung sind nie automatisch. Sie werden „Wartet auf Benutzer“ (WARTET AUF FREIGABE), und es entsteht kein Doppel, wenn dafür schon eine Entscheidung offen ist.
  - Vor der ersten Einnahme bekommt nur die Fokus-Einnahmequelle Aufgaben (Fokus-Regel).
- **Einnahmequellen-Manager:**
  - Neuer Status GESTOPPT (Migration 20260927360000); die Daten bleiben erhalten.
  - Phasen IDEEN/RECHERCHE/TEST/AKTIV/PAUSE/ERFOLGREICH/GESTOPPT.
  - Neue Dashboard-Spalten: Kategorie, Einnahmemodell, Engine-Schritt, Automatisierung, Risiko, Quellen.
- **Finanz-Monitor:**
  - Getrennt nach Einnahmen, Kosten, Gewinn und offenen Einnahmen; aufgeschlüsselt je Monat, je Einnahmequelle und je Kostenquelle.
  - **Behoben:** Die Finanzen-Seite hatte offene Buchungen als Einnahmen mitgezählt.
  - **Neu:** Eine bestätigte Einnahme gibt es nur noch mit Zahlungsnachweis (live geprüft: ohne Nachweis HTTP 400).
- **Aufgaben-Zentrale:**
  - Bereiche: Heute, Automatisch erledigt, Wartet auf mich, Fehler, Erfolgreich, nächste Aktion.
  - Erledigte Aufgaben ohne Notiz werden automatisch mit Datum dokumentiert; ein vorhandenes Ergebnis bleibt stehen.
- **E-Mail-Zentrale:** Vorlagen, Eingang, Antwort-Entwürfe, Follow-ups, Status. Kein automatischer Versand.
- **Lead-Manager-Tabelle:** Unternehmen/Person, Quelle, Kontakt, Interesse, Status, nächste Aktion, Notizen, Datum, Ergebnis.
- **Content-Zentrale:** Ideen, Video-Ideen, Skripte, fertige Texte, Titel, Beschreibungen, Affiliate-Kennzeichnung, Veröffentlichungsstatus, Ergebnisse. Keine automatische Veröffentlichung.
- **Startseite:** nur noch 12 Kernkennzahlen, alles Weitere unter „Rechenwege & weitere Kennzahlen“.
- **Tests:** 231/231, Build ok. Live-Check am Desktop und am Handy auf 6 Seiten, ohne Überlauf und ohne JS-Fehler.
- **Hinweis:** Die Startseite zeigt 18,11 € Kosten. Das sind echte, bezahlte Werknetz24-Ausgaben aus dessen eigener Buchhaltung; Master und Einnahmequellen stehen bei 0 €.

## Update 27.09.2026 (34) — Pilot Anfragen-Service vorbereitet (TEST, 0 €)

- **Neuer Reiter „Pilot: Anfragen-Service“** (`app/master/anfragen.jsx`, `lib/anfragen.js`, `lib/anfragen-regeln.js`, Tabelle `master_anfragen` mit RLS).
- **Anfrage-Eingang:** Datum, Quelle, Unternehmen, Anfrage, Status, Priorität, nächste Aktion.
- **Automatischer Ablauf beim Erfassen:** Analyse → Kategorie (Reklamation / Auftrag / Termin / Angebot / Rückruf / Frage / Sonstiges) → Dringlichkeit → Entwürfe → Aufgabe („Wartet auf Benutzer“) → Status gespeichert, jeder Schritt im Verlauf. Abschluss mit dokumentiertem Ergebnis durch den Menschen.
- **Entwurfs-Arbeitsbereich:** Antwort-E-Mail, Rückfrage, Angebotstext (ohne Preise), Zusammenfassung, nächste Aktion. Kostenlose Textvorlagen, kein Sprachmodell; nichts wird gesendet.
- **Kunden-Bereich:** Interessent / Pilotkunde / aktiver Kunde / beendet, nur aus echten Leads. Dazu Einnahmen, offene Aufgaben, Leistung, Ergebnisse.
- **Angebots-/Einnahmen-Modul:** Leistung, möglicher Preis (Text, unverbindlich), einmalig/monatlich, Kosten, erwartete Einnahmen (Zahl nur mit Quelle), tatsächliche Einnahmen aus den Buchungen.
- **Schutz:**
  - Echte Anfragen nur mit echtem Pilotkunden, bis dahin nur Testfälle (TEST, gestrichelt).
  - Testfälle werden archiviert, nicht gelöscht, und zählen nie als echte Anfragen.
  - Neue RECHT-Freigabe „Auftragsverarbeitung (AVV) vor echten Kundendaten“ (Art. 28 DSGVO).
- **Live-Test:**
  - Ein interner, fiktiver Testfall lief komplett durch (Anfrage → Analyse → 5 Entwürfe → Aufgabe [TEST] → Abschluss → Archiv).
  - Eine echte Anfrage ohne Kunden wurde abgelehnt (400).
  - Desktop und Handy ohne Überlauf und ohne JS-Fehler; Finanzen weiter 0 €.
- **Befund:** Die Migration schlug zuerst fehl, weil `analyse` ein reserviertes Wort ist. Der Spaltenname ist jetzt in Anführungszeichen gesetzt; kurzzeitig lieferte die neue Seite live einen Fehler.
- **Tests:** 239/239, Build ok.

## Update 27.09.2026 (35) — Erstkunden-Paket für den Google-Profil-Pilot

- **Druckbare Gesprächsunterlage** je analysiertem Betrieb (`/master/profil-check?id=…`, nur mit Anmeldung):
  - Punkte, die 3 wichtigsten Lücken, alle 10 geprüften Punkte, Leistungsumfang, Google-Regeln.
  - Kein Preis. Der Absender wird von Hand eingetragen (keine erfundenen Firmendaten).
  - Drucklayout DIN A4; Link „🖨 Gesprächsunterlage“ bei jedem Betrieb.
- **Gesprächsleitfaden** (7 Schritte) auf der Pilot-Seite: keine Versprechen, nichts unterschreiben lassen oder kassieren, keine Passwörter annehmen, danach in der Zentrale dokumentieren.
- **Entscheidungsvorlage** für Kontakt, Monatspreis, Gewerbe/Steuer und AVV: je Entscheidung was fehlt, warum, Kosten und kostenlose Alternative, mit Quellen. Neu recherchiert:
  - Gewerbeanmeldung Monheim 26 € (Stadt Monheim).
  - Kostenlose amtliche AVV-Formulierungshilfe (BayLDA).
- **Live-Test:** Alle 3 Unterlagen öffnen korrekt (0/60/33 Punkte, kein €); ohne Anmeldung sind keine Daten sichtbar. Desktop, Handy und Druckansicht ohne Überlauf und ohne JS-Fehler.
- **Tests:** 242/242, Build ok.

## Update 27.09.2026 (36) — Kundengewinnungs-Pilot gestartet

- **4 neue Leads** aus dem öffentlichen Verzeichnis monheimer-lokalhelden.de (nur Firmenangaben + Quelle): Atlas Friseur, Autolackiererei Schneider, Blumenzauber, Astrid Becker Cosmetics. Leads gesamt 7, analysiert 3.
- **Profil-Analysen** der 4 neuen Leads: als Aufgabe für Claude angelegt. Die Browser-Erweiterung war nicht verbunden, und Google Maps wird nicht automatisch ohne Browser ausgelesen (Nutzungsbedingungen). Das Verbinden ist eine Benutzer-Aufgabe unter „Wartet auf mich“.
- **Neu: datierte Nachfass-Aufgaben** nach freigegebenem Kontakt:
  - „Gespräch geführt“ → „Nachfassen nach Gespräch“ (+7 Tage).
  - „Hat Interesse“ → „Angebot übergeben“ (+3 Tage, Preis erst nach Entscheidung).
  - Nichts wird gesendet.
- **Tests:** 243/243, Build ok, live Desktop + Handy ohne Fehler.

## Update 27.09.2026 (37) — Wechsel zum echten Pilot-Test

- Kein weiterer Ausbau. Chrome läuft, aber die Claude-Erweiterung ist nicht verbunden (0 verbundene Browser) – Analysen der 4 neuen Leads warten darauf.
- Erster Kontakt zu Friseur Haargenau ist vorbereitet (Gesprächsunterlage, Leitfaden, Angebotsvorlage, Nachfass-Automatik).
- Nächster Schritt liegt bei Adnan: Kontakt-Freigabe Haargenau + Erweiterung verbinden. Kosten 0 €, Einnahmen 0 €.

## Update 27.09.2026 (38) — Pilot-Test: alle 7 Leads analysiert

- Die Claude-Browser-Erweiterung ist verbunden. Die 4 neuen Leads wurden am öffentlichen Google-Profil analysiert (nur sicher Sichtbares, der Rest „nicht prüfbar“):
  - Atlas Friseur 60/100
  - Autolackiererei Schneider 70/100
  - Blumenzauber 50/100
  - Astrid Becker Cosmetics 86/100 (Profil schon gut gepflegt)
- Berichte, Gesprächsunterlagen, Angebotsvorlagen und 7 Kontakt-Freigaben sind automatisch entstanden. Gate 18/18.
- Keine neue Funktion gebaut. Kosten 0 €, Einnahmen 0 €.

## Update 27.09.2026 (39) — Fokus erster Umsatz, kein Ausbau

- Der Google-Profil-Service bleibt technisch unverändert. Für alle 7 Leads sind Analyse, Gesprächsunterlage, Angebotsvorlage und Kontakt-Freigabe vorhanden; Nachfass-Aufgaben entstehen automatisch.
- **Befund (nicht behoben, wartet auf Adnans OK):** „Deine nächste Aktion“ (naechstePilotAktion) prüft die Stufen von vorn. Solange irgendein Lead noch auf „Kontakt freigeben“ steht, zeigt sie diese Freigabe statt des weitesten Leads (z. B. „Bericht bei Haargenau zeigen“). Außerdem steht Markus Lauck vor Haargenau (beide Priorität hoch).
- Nach dem ersten Kunden bereitet der vorhandene Ablauf den nächsten vor (nächster Lead mit offener Kontakt-Freigabe).
- Der Affiliate-Pilot folgt erst nach dem ersten Pilotkunden.

## Update 27.09.2026 (40) — Auftrags- und Umsatzmodus

- **Umsatz-Pipeline** prominent auf Startseite und Pilot: LEADS → KONTAKTIERT → INTERESSE → ANGEBOT → AUFTRAG → BEZAHLT. Dazu Leads, Interessenten, offene Nachfassungen, Angebote, gewonnene Aufträge, Einnahmen, Kosten, Gewinn und nächster konkreter Schritt.
- **Tägliche Lead-Recherche** (07:00, Aktion `lead-recherche`):
  - Quelle: öffentliches Verzeichnis monheimer-lokalhelden.de (robots.txt erlaubt), nur passende kleine Betriebe.
  - Gespeichert werden nur Firmenname, Branche, Ort und Quelle, keine Telefonnummern oder E-Mails.
  - Höchstens 3 neue Betriebe pro Tag, und nur solange weniger als 3 Betriebe auf eine Analyse warten.
  - Live-Lauf: Back Bakery, emma's (Blumen), Für alle Felle (Hundesalon).
- **Google-Profil-Analyse:** nicht automatisierbar ohne Kosten (die Places-Schnittstelle braucht ein Google-Abrechnungskonto mit Kreditkarte, blockiert). Claude analysiert in den Sitzungen mit der Browser-Erweiterung; bis dahin ist es eine Aufgabe für Claude.
- **Angebot:**
  - Bei „Hat Interesse“ entsteht automatisch ein Angebotsentwurf und die Freigabe „Angebot freigeben“.
  - Freigabe nur mit festgelegtem Monatspreis; danach übergabefertig mit Preis.
  - „Angebot übergeben“ → Nachfassen (+7 Tage); „Auftrag erteilt“ → Kunde.
  - Keine Einnahmebuchung beim Auftrag (die Monatsrechnung entsteht erst nach dokumentierter Zustimmung, bezahlt nur mit Nachweis).
- **Nächster Schritt:** Der Betrieb, der am weitesten ist, kommt zuerst; Betriebe ohne Google-Profil sind nachrangig. Aktuell: Kontakt zu Friseur Haargenau freigeben.
- **Tests:** 248/248, Build ok, live Desktop + Handy ohne Fehler.

## Update 27.09.2026 (41) — Auftrags-Generierungs-Pilot gestartet

- **Dashboard mit 8 Stufen:** Leads → Analysiert → Kontakt vorbereitet → Gespräch → Interesse → Angebot → Auftrag → Bezahlt. Dazu aktueller Lead, nächste Aktion, „Claude hat heute erledigt“, „Du musst“ (aktueller Lead zuerst), Einnahmen/Kosten/Gewinn.
- **Alle 10 Leads analysiert.** Neu:
  - Back Bakery 30/100 – Profil nicht vom Inhaber beansprucht
  - Für alle Felle Hundesalon 40/100 – Profil nicht beansprucht, ca. 60 m von Haargenau
  - emma's 75/100
- **Aktueller Lead:** Friseur Haargenau (33/100). Nächste Aktion: Kontakt-Freigabe durch Adnan.
- **Tests:** 248/248, Build ok, live Desktop + Handy ohne Fehler. Kosten 0 €, Einnahmen 0 €.

## Update 27.09.2026 (42) — Automatische Kundensuche

- **Tägliche Recherche** (07:00): bis zu 5 neue Betriebe aus dem öffentlichen Verzeichnis monheimer-lokalhelden.de.
  - Nur passende kleine Betriebe; Ketten, Versicherungen, Heilberufe und Vereine werden ausgeschlossen.
  - Geprüfte Seiten werden 30 Tage gemerkt, damit nichts doppelt geprüft wird.
  - Gestoppt wird, sobald 5 Betriebe auf eine Analyse warten; Fehler landen im Automatisierungs-Log.
- **Dashboard wie vorgegeben:** Neue Leads → Analysiert → Kontakt vorbereitet → Wartet auf Freigabe → Interesse → Angebot → Auftrag → Bezahlt. Dazu täglich die **Top-5**:
  - Bewertung = 100 − Punkte, +20 bei nicht beanspruchtem Profil, −40 ohne Google-Profil.
  - Nur noch nicht kontaktierte Betriebe mit sinnvollem Bedarf.
- **Heute:** 5 neue Leads gefunden und analysiert (jetzt 15, alle analysiert):
  - Eichholz 50
  - Mari Nails 70
  - Nail Lounge 0 (kein Profil)
  - Ryf 83 (Kette)
  - Mobile Friseurmeisterin Holtmann 14 (Profil unbeansprucht, „eventuell geschlossen“)
- **Tests:** 250/250, Build ok, live Desktop + Handy ohne Fehler. Kosten 0 €, Einnahmen 0 €.

## Update 27.09.2026 (43) — Kundenfindungs-Pilot, erster Lauf

- **Lauf 27.09.2026:** 28 Verzeichnisseiten geprüft, 5 neue Leads angelegt, kein Fehler. Quelle: monheimer-lokalhelden.de.
  - Fat Monheim (Kfz)
  - Änderungsschneiderei Dorniok
  - Goldschmiede Liebe
  - Bäckerei Busch Lerchenweg
  - Jörg Schneider Gartengestaltung
- **Leads gesamt: 20** (Ziel der ersten Phase erreicht), davon 15 analysiert. Die 5 neuen warten auf die Profil-Analyse: Die Browser-Erweiterung ist nicht verbunden (kein Auslesen von Google Maps ohne Browser).
- **Kontakt-Freigaben** tragen jetzt den Vermerk „Potentieller Lead – menschliche Prüfung erforderlich.“
- **Leverkusen/Düsseldorf:** keine kostenlose Quelle mit erlaubtem automatischem Abruf bekannt → Recherche von Hand in den Sitzungen (GELB, dokumentiert).
- **Tests:** 250/250, Build ok. Kosten 0 €, Einnahmen 0 €.

## Update 27.09.2026 (44) — Kundenfindung: 20+ geprüfte potenzielle Kunden

- **Läufe am 27.09.2026** (Quelle für die Betriebe: monheimer-lokalhelden.de; Analysen: öffentliche Google-Maps-Profile, Link je Lead gespeichert):
  - Lauf 1: 28 Seiten geprüft → 5 neu
  - Lauf 2: 14 Seiten → 5 neu
  - Lauf 3: 15 Seiten → 5 neu
  - keine Fehler
- **Stand:** 30 Leads, alle analysiert. 23 mit erkennbarem Bedarf (unter 75/100 Punkten), 7 bereits gut gepflegt.
- **Auffällige Befunde:**
  - Profil nicht vom Inhaber beansprucht: Holtmann, Back Bakery, Hundesalon Für alle Felle, KFZ Akallich
  - Kein Google-Profil gefunden: Lauck, Nail Lounge, Fat Monheim
  - „Vorübergehend geschlossen“: P&A Film
  - Adresse widersprüchlich: Jörg Schneider (Google Langenfeld, Verzeichnis Monheim)
  - Branche im Verzeichnis falsch: Elektro Mobile ist laut Google ein Handyshop (korrigiert)
- **Kontakt:** keiner aufgenommen, nichts verändert, nichts beansprucht. Kosten 0 €.

## Update 27.09.2026 (45) — Prioritäten + 5 Kontakte vorbereitet

- **Alle 30 Leads bleiben erhalten**; nichts wurde abgelehnt oder gelöscht.
  - Hohe Priorität (7): konkrete Lücken
  - Mittlere Priorität (16): mögliche Verbesserungen, inkl. „kein Google-Profil“
  - Niedrige Priorität (7): wenig offensichtlicher Bedarf, wird später bearbeitet
- **5 Kontakte vorbereitet** (öffentliche Adresse beim Lead gespeichert):
  - Friseur Haargenau (Turmstraße 1A)
  - Für alle Felle (Turmstraße 14)
  - Back Bakery (Ernst-Reuter-Platz 23)
  - KFZ Akallich (Opladener Str. 191)
  - Monheimer Blumenmarkt (Niederstraße 15 b)
- **Gesprächsunterlage:** neuer Abschnitt „Beobachtungen am öffentlichen Profil“ (z. B. nicht beansprucht); interne Arbeitshinweise werden nicht gedruckt.
- **Tests:** 251/251, Build ok, live Desktop + Handy ohne Fehler. Kein Kontakt aufgenommen, 0 €.

## Update 27.09.2026 (46) — Werknetz24/Lisa: nur Recherche (Werknetz24 bleibt pausiert)

- **Famulor-Stand (lesend geprüft):** Guthaben 4,79 €. Einziger verzeichneter Lisa-Anruf am 12.09.2026: Status „failed“. Lisa ist nicht nachweislich funktionsfähig.
- **Adnans Entscheidung:** nur recherchieren, eigene Liste in der Zentrale, keine Kontakt-Freigaben.
- **Neue Einnahmequelle** „Werknetz24 – Lisa Telefonassistent (nur Recherche)“, Status Pause, getrennt vom Google-Profil-Piloten. Die Umsatz-Pipeline zählt nur Pilot-Leads.
- **7 Leads** (Monheim, Handwerk; Quelle öffentliche Google-Profile, 27.09.2026):
  - Hohe Priorität: Meuten (nicht beansprucht, keine Öffnungszeiten), Kausch (nicht beansprucht, keine Öffnungszeiten, nur Mobilnummer)
  - Mittlere Priorität: Butz, Elektro Ari, Wiese
  - Niedrige Priorität: Scheidt, Schiefer
  - In keiner sichtbaren Rezension ein belegter Hinweis auf verpasste Anrufe; nichts erfunden.
- **Technik:** Leads lassen sich über „lead-anlegen“ mit `ohneAufgabe` ohne Nachfass-Aufgabe anlegen.
- **Verkaufsablauf Lead → Kunde (Adnans Vorgabe):** noch nicht umgesetzt, solange Werknetz24 pausiert ist. Vorhanden: Status, Notizen, Nachfass-Aufgaben, „kein Interesse“ stoppt Aufgaben. Es fehlen für Werknetz24-Leads: Kontakt-Freigabe und eine Kontaktvorlage für Besuch/Telefon.
- **Tests:** 251/251, Build ok. Kosten 0 €.

## Update 27.09.2026 (47) — Lisa-Diagnose: Testanruf aktuell nicht möglich (nur mit Kosten behebbar)

- **Geprüft (lesend, ohne Änderungen):**
  - Famulor-Konto: Kontoguthaben 4,79 €.
  - Dashboard: „No active plan“, Minutes left 5/0, Chat credits 0.
  - Assistent 20225 „Lisa Werknetz24“: Eingang, Pipeline, Prompt/Stimme/end_call/Termin-Werkzeuge gesetzt, keine Compliance-Sperre.
  - Nummer +49 2173 9998706 als SIP-Trunk (Easybell, IP-Freigabe) an Lisa gebunden.
  - Webhook erreichbar.
- **Ursache der fehlgeschlagenen Anrufe:** Famulor nimmt ohne Tarif bzw. Anrufminuten keine Gespräche an („Not enough credits“, live bewiesen am 11.09., letzter Fehlanruf am 12.09.). SIP, Easybell, Konfiguration und unser Code sind nicht die Ursache.
- **Zweiter Befund:** Google Calendar und Gmail sind im Werknetz24-Systemstatus rot (Token seit 22.09. ungültig) → Lisas Terminbuchung würde scheitern.
- **Nicht kostenlos behebbar.** Laut famulor.io/de/pricing: Prepaid 0,18 €/Min ohne Vertragsbindung, oder Plus 27 €/Monat (100 Minuten). Entscheidung liegt bei Adnan (zwei Aufgaben unter „Wartet auf mich“).
- **Nicht geändert (nicht ursächlich):** max_duration 240 s und AEC-Warmup (Famulor empfiehlt ≥600 s bzw. 3 s) – als Empfehlung notiert.
- **Sicherer Test (vorbereitet, startet erst nach Freigabe):** Adnan ruft von seinem Handy die Lisa-Nummer an, Testgespräch mit Name, Rückrufnummer, Anliegen und Terminwunsch, ca. 2 Minuten. Prüfen: Status „completed“ bei Famulor, Transkript und Variablen, Webhook-Eingang in Werknetz24, Kalendereintrag (danach löschen).

## Update 27.09.2026 (48) — Planwechsel: kostenloser Verkaufsprozess statt Lisa-Reparatur

- **Adnans Entscheidung:** Werknetz24, Lisa und Famulor bleiben pausiert; keine Famulor-Minuten, kein Testanruf, keine Zahlungen. Die Lisa-Aufgaben 87 und 88 sind gestoppt (mit Begründung, nicht gelöscht).
- **Ziel:** ein kostenloser Verkaufsprozess (finden → Bedarf → Lead → Kontakt vorbereiten → Freigabe → Kontakt → Interesse → Angebot → Verkauf nach Freigabe). Er läuft bereits als Google-Profil-Pilot.
- **Regionen:** Die tägliche automatische Suche bleibt bei Monheim (monheimer-lokalhelden.de). atalanda.com erlaubt den Abruf zwar, führt aber keine Betriebe aus Düsseldorf, Leverkusen oder Langenfeld (0 von 811 Einträgen, geprüft 27.09.2026). Diese Städte werden im Browser recherchiert (öffentliche Google-Profile, kostenlos).

## Update 27.09.2026 (49) — Einmal-Paket „Google-Profil-Optimierung“ + Top-10-Leads

- **Angebotsstruktur** (`EINMAL_PAKET`, `einmalAngebotText` in lib/google-profil.js; Knopf „Einmal-Paket“ im Pilot):
  - Einmalig, ca. 1 Stunde vor Ort, gemeinsam auf dem Gerät des Inhabers – kein Zugang, kein Passwort, kein Abo.
  - Die Bausteine ergeben sich nur aus den festgestellten Lücken.
  - Preis „noch festzulegen“; keine Rechnung vor der Gewerbe-/Steuerklärung.
- **Top-10 qualifizierte Leads** (alle echt, öffentlich geprüft am 27.09.2026, Kontakt-Freigabe offen), mit Standort, öffentlicher Kontaktmöglichkeit, Problemen, Gesprächsargument und Status „FREIGABE NÖTIG“:
  - Back Bakery, Für alle Felle, KFZ Akallich
  - Friseur Haargenau, Materne Fotografie, Monheimer Blumenmarkt
  - Blumenzauber, Eichholz, Jörg Schneider, Nail Lounge
- **Tests:** 252/252, Build ok. Keine Kontaktaufnahme, 0 €.

## Update 27.09.2026 (50) — Lead-to-Customer-System (kostenlos, getrennt von Werknetz24)

- **Lead-Bewertung nach 5 dokumentierten Kriterien** (lib/lead-bewertung.js, je 0–2 Punkte mit Begründung): erkennbarer Bedarf, erreichbarer Kontaktweg, passendes Angebot (Einmal-Paket), lokale Nähe, vorhandene Informationen. Sichtbar bei jedem Betrieb im Pilot; Grundlage der Top-5.
- **Tägliche Suche** speichert jetzt auch die öffentliche Geschäftsnummer und die Adresse aus den strukturierten Verzeichnisdaten (keine E-Mail-Adressen). „Kunst“ wird ausgeschlossen (Fehlgriff „Heidis Malereien“ korrigiert; der Lead bleibt gespeichert).
- **Heute:** 17 Seiten geprüft, 5 neue Leads, alle analysiert:
  - For you cosmetics 40 (Profil nicht beansprucht)
  - Salon Stock 25
  - Schell-Höniger 33
  - Maria's Blumenwelt 58
  - Heidis Malereien (kein Profil, passt eingeschränkt)
- **Stand:** 35 Leads, alle analysiert, 28 mit Bedarf.
- **Tests:** 255/255, Build ok, live Desktop + Handy ohne Fehler. Kosten 0 €, Einnahmen 0 €.

## Update 27.09.2026 (51) — Sales-Automat: Brief mit Antwort-Link

- **Warum:** Werbe-E-Mails ohne Einwilligung und Werbeanrufe sind unzulässig (UWG § 7), deshalb bleibt der erste Kontakt bei Adnan. Ein Brief, den Adnan selbst einwirft, ist zulässig und kostet 0 €. Alles danach läuft automatisch.
- **Neu:** lib/antwort-link.js, app/r/[token] (öffentlich, noindex), Briefmodus in /master/profil-check (`?brief=1&ids=…`), Knöpfe im Pilot.
- **Ablauf:**
  - Kontakt-Freigabe → Brief drucken → Aufgaben „Brief einwerfen“ (+3) und „Keine Antwort“ (+14).
  - Antwort „Ja“ → Einwilligung dokumentiert, Interessent, Rückruf-Aufgabe, Angebotsentwurf.
  - Antwort „Nein“ → Gesperrt.
- **Tests:** 260/260, Build ok, live geprüft. Kosten 0 €.

## Update 27.09.2026 (52) — Tagesabschluss

- Brief-Link lautet jetzt `werknetz24.de/r/<Code>` (Weiterleitung im werknetz24-landing-Repo, vercel.json). Datenschutzerklärung von werknetz24.de um Abschnitt 6a (Profil-Check per Brief und Antwort-Link) ergänzt.
- Live geprüft: Weiterleitung 307, Antwortseite 200 + noindex, Datenschutz online. Tests 260/260 (master) und 969/969 (landing).
- Stand: 50 Leads, alle analysiert. 0 Interessenten, 0 Kunden, 0 € Einnahmen, 0 € Kosten.
- Nächster Schritt (Adnan): Kontakt-Freigaben, Briefe drucken und einwerfen.

## Update 28.09.2026 (53) — Sales-Automat B1–B3

- **B1:** Die 5 neuen Leads des 07:00-Laufs sind analysiert (öffentliche Google-Profile), damit 55/55.
- **B2:** Neue Funktion `vertriebStatus` (lib/vertrieb-status.js).
  - Im Tagesbericht ganz oben: Vertriebsstatus, neue Antworten (24 h), „WARTET AUF MICH“ und Selbstprüfung.
  - In der Umsatz-Pipeline: „WARTET AUF MICH“ statt der langen Freigabe-Liste, dazu die Kästen „Neue Antworten“ und „Selbstprüfung“.
- **B3:** Selbstprüfung.
  - Fehler: Antwort ohne Rückruf-Aufgabe, gesperrt mit offenen Aufgaben, Dubletten, Recherche heute nicht gelaufen.
  - Hinweise: Freigabe ohne Brief > 3 Tage, Lead ohne Analyse > 3 Tage, Rückruf überfällig.
- **Tests:** 264/264, Build ok, live geprüft. Kosten 0 €.
