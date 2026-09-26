# Deployment Gate

Stand: 2026-09-21 (Phase 5, Finaler Go-Live)

## Regel
Produktivstatus wird erst auf 🟢 gesetzt, wenn:
1. GitHub CI erfolgreich ist.
2. Vercel Deployment erfolgreich ist.
3. Master-Zentrale /master lädt.
4. /api/master/systems (bzw. äquivalent /api/health) antwortet.
5. keine Secrets im Client-Bundle landen.
6. Produktions- und Fehlerpfade getestet wurden.

## Aktueller Befund (verifiziert, nicht nur behauptet)

🟢 **Deployment erfolgreich und live bestätigt.**

- GitHub CI: Commit `c1afab7` (Run #108) — erfolgreich (grün), ebenso die drei vorherigen Commits `f1740d6`/`bc4762e`/`6395ca1`.
- Vercel: GitHub-Deployments-Ansicht zeigt `c1afab7` als **"Deployed (completed)", Production, Active**. Das zuvor dokumentierte Team-Build-Limit (s. Nachtrag Phase 1, unten) hat sich zwischenzeitlich aufgelöst — die letzten 4 Commits sind alle erfolgreich deployt (vorher schlugen mehrere Commits in Folge mit "Failed to deploy" fehl, sichtbar im GitHub-Deployments-Verlauf).
- **Live-URL (Produktions-Domain):** `https://adnan-sandy.vercel.app` — echt aufgerufen, liefert den aktuellen Code (Seitentitel "Werknetz24 Master-Zentrale", passend zum Phase-4-Fix).
- `/master` lädt (200, echte Daten: 3 Betriebe, 4 offene Aufgaben, 1 kritisches System, "0 € Umsatz — keine erfundenen Umsätze").
- `/e-commerce`, `/zentral`, `/produkt-pipeline`, `/lieferanten`, `/kunden`, `/bestellungen`, `/retouren`, `/shop`, `/automation` — alle 200, echte Daten (6 Produkte, 6 Lieferanten, 0 Kunden/Bestellungen/Retouren).
- `/api/health` antwortet mit ehrlichem Status (`persistence:"memory"`, `payments:"🔴"`, `quality_gate:"blocked"`).
- `/api/master/quality-gate` liefert korrekt `503` (Produktion noch nicht freigegeben — erwartet, s. `docs/QUALITY-GATE-PHASE-4.md`).
- **Sicherheitsfix live verifiziert (Stand 20.09.2026):** ein echter PATCH-Versuch gegen `/api/master/businesses` ohne Secret lieferte damals live `503` ("MASTER_API_SECRET nicht konfiguriert") — der in Phase 4 behobene Schreibschutz war zu dem Zeitpunkt bereits aktiv, aber noch ungeschützt durch ein echtes Secret.
- Unbekannte Route liefert korrekt `404`.
- Keine Konsolenfehler bei frischem Seitenaufruf (`/master` geprüft).

## Update 21.09.2026 — Secrets gesetzt, Verbindung live aktiviert

- `MASTER_API_SECRET` und `WERKNETZ24_STATUS_SECRET` wurden in der Vercel-Produktionsumgebung gesetzt (beide Projekte, `adnan` und `werkbot24-landing`) und beide Projekte redeployed.
- **Live neu getestet:** `PATCH /api/master/businesses` ohne Bearer-Token liefert jetzt `401 Unauthorized` (nicht mehr `503` — das Secret ist konfiguriert und wird geprüft); mit dem korrekten Token liefert derselbe Aufruf `200` und aktualisiert den Datensatz.
- **Werknetz24-Verbindung live neu getestet:** `GET https://werknetz24.de/api/customers?type=master-zentrale-status` mit korrektem Bearer-Token liefert `200` mit echten aggregierten Daten (Systemstatus, offene Incidents/Aufgaben/Rechnungen). `GET /api/master/businesses` auf der Master-Zentrale liefert für den Werknetz24-Eintrag `liveStatus.configured:true, liveStatus.ok:true` mit denselben echten Daten; visuell im `/master`-Betriebe-Tab als grüne "🔴/🟡/🟢 Werknetz24 live"-Box bestätigt.
- **Ursache eines ersten fehlgeschlagenen Setzversuchs:** Der erste `Add Environment Variable`-Versuch zeigte in der Vercel-Oberfläche "Added", der Wert war aber tatsächlich nicht gespeichert (bei Secret-Typ-Variablen zeigt Vercel den Wert grundsätzlich nie wieder an, was das nicht sofort erkennbar machte). Behoben durch `Rotate` mit erneuter, sichtbar bestätigter Werteingabe statt eines weiteren `Add`-Versuchs.

## Weiterhin offen

- `SUPABASE_URL`/`SUPABASE_SECRET_KEY` sind nicht gesetzt — erfordert ein echtes Supabase-Konto (existiert noch nicht, wurde auf ausdrücklichen Wunsch nicht selbst angelegt). Persistenz läuft deshalb weiterhin im Fallback-Speicher (Daten gehen bei jedem Neustart verloren).
- 🔴 **Rechtliche Pflichttexte (Impressum/Datenschutz/AGB/Widerruf) fehlen weiterhin komplett** (s. `docs/QUALITY-GATE-PHASE-4.md`) — blockiert jeden echten/öffentlichen Verkauf unabhängig vom technischen Deployment-Status. Wird nicht selbst erfunden/verfasst.

## Technische Absicherung
- Root Error Boundary vorhanden.
- Custom 404 vorhanden (live bestätigt).
- API-Route-Handler bleiben serverseitig.
- Schreibzugriffe sind seit Phase 4 durch `MASTER_API_SECRET` geschützt, seit 21.09.2026 mit echtem, live verifiziertem Secret (fail-closed, 401 ohne/200 mit korrektem Token).

## Update 22.09.2026 — "Kommandozentrale"-Auftrag, Teil 1 (Fehler & Warnungen, Übersicht)

Commit [`3f80dd0`](https://github.com/adnan-51-bit/adnan/commit/3f80dd0), GitHub CI ✅ success, Vercel-Deployment ✅ success (automatisch bei Push, wie bei allen vorherigen Commits — kein manuell ausgelöster Deploy).

**Live verifiziert:** `GET /master` → `200`, enthält "Fehler & Warnungen" im gerenderten HTML (vorher nicht erreichbar, s. u.). `GET /api/master/quality-gate` weiterhin korrekt `503`. `GET /e-commerce` weiterhin `200`, unverändert.

**Was gebaut wurde:** Die bereits im Code vorhandene, aber nie in Sidebar/Tab-Dispatch verlinkte `Alerts`-Komponente wurde erreichbar gemacht ("Fehler & Warnungen") und von einem veralteten, hartcodierten Tupel-Datenformat auf das tatsächliche Objekt-Format von `/api/master/systems` umgestellt (vorher wäre sie mit Live-Daten als "undefined" erschienen). Übersicht zeigt jetzt zusätzlich den echten Quality-Gate-Status und die letzten 5 Audit-Log-Einträge; KPIs/Panels sind anklickbar (direkte Navigation).

**Was das NICHT ist:** Kein neuer Endpunkt, kein neues Secret, keine neue Fehler-Datenschicht mit Ursache/Maßnahme/Logs pro Einzelfehler — das bleibt offen (s. `MASTER-CONTROL-ARCHITECTURE.md` im `werknetz24-landing`-Repo). Die "Agenten-Zentrale" aus demselben Auftrag wurde bewusst NICHT gebaut, da es aktuell keine Infrastruktur gibt, die den Status/letzte Aktivität/Fehler eines "Agenten" tatsächlich nachverfolgt — das wäre sonst erfundener Status.

Getestet: `npm test` 61/61 grün, `npm run build` erfolgreich (25 Routen, weiterhin 12 API-Funktionen).

## Update 26.09.2026 — Full-System-Audit Phase 2

- Commits `ab7ee31` → `c8491d1` → `34381d0`: GitHub CI `build: success`, Commit-Status `Vercel: success`, `vercel ls adnan` → Production **Ready**.
- Live geprüft (curl + Playwright, anonym): `/`, `/master`, `/master?tab=alerts|agents|systems|finance`, `/werknetz24`, `/e-commerce` → 200; keine JS-Laufzeitfehler; erwartete Konsolen-Einträge nur `503 /api/master/quality-gate` (Produktion bewusst gesperrt) und `401` (anonym); mobil 390 px ohne horizontales Scrollen.
- Neue Secrets: `WERKNETZ24_WRITE_SECRET` (Projekt `adnan`) und `MASTER_ZENTRALE_WRITE_SECRET` (Projekt `werkbot24-landing`) mit identischem, selbst erzeugtem Zufallswert per `vercel env add` gesetzt (Wert nie ausgegeben). Werknetz24-Seite live verifiziert (`POST …master-zentrale-systemcheck` ohne Auth → `401` statt vorher `503` = Wert ist gespeichert). Die Master-Seite des Secrets kann nur mit `MASTER_API_SECRET` live geprüft werden → offen, braucht Adnan.
- Nachdeploy-Fund und Fix im selben Durchgang: Styles der neuen Komponenten griffen nicht (styled-jsx), Secret-Abfrage wiederholte sich 46× → Commit `34381d0`, erneut deployt und erneut live geprüft.
