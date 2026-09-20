# Changelog

## 2026-09-20 (Phase 3)
### Phase 3 — E-Commerce fertigstellen (Technical Lead, werknetz24-landing-Sitzung)
- Neue echte Datenschicht `lib/ecommerce-store.js` (Supabase-oder-Speicher-Muster wie `lib/master-store.js`): Produkte (11-stufige Pipeline), Lieferanten, Kunden, Bestellungen, Retouren.
- Geseedete Lieferanten/Produkte sind die bereits vorher in `app/lieferanten`/`app/produkt-pipeline` hartcodierte, echte Recherche — nicht neu erfunden, nur in die Datenschicht überführt.
- Kunden/Bestellungen/Retouren starten bewusst leer — keine Fake-Daten.
- **Sicherheitskorrektur:** `app/api/orders/route.js` übernahm Sicherheitsflags (`paymentConfirmed`/`productApproved`/...) vorher direkt aus dem Request-Body. Neue Funktion `deriveOrderGateInputs()` leitet sie jetzt ausschließlich aus echten, gespeicherten Daten ab.
- `app/api/orders/route.js` zum konsolidierten E-Commerce-Endpunkt erweitert (`?type=`) — keine 13. Route (Vercel-Hobby-Limit).
- Neue Seiten `/kunden`, `/bestellungen`, `/retouren`; `/produkt-pipeline`, `/lieferanten`, `/e-commerce` jetzt live-daten-getrieben statt hartcodiert (inkl. Korrektur der vorher fest einprogrammierten Zahlen "20 Kandidaten"/"6 geprüft").
- `/shop` (Margenkalkulation, klar als Testdaten gekennzeichnet) bewusst unverändert.
- 18 neue Tests (`tests/ecommerce-store.test.js`), Gesamtsuite 38/38 grün, `npm run build` erfolgreich (25 Routen, weiterhin 12 API-Funktionen).
- Nicht deployed.

## 2026-09-20 (Phase 2)
### Phase 2 — Werknetz24 mit Master-Zentrale verbinden (Technical Lead, werknetz24-landing-Sitzung)
- Read-only Connector `lib/werknetz24-connector.js` zum bestehenden Werknetz24-System gebaut, ohne neue API-Route (Vercel-Hobby-Limit bereits erreicht).
- `lib/master-store.js` `listBusinesses()` reichert den `werknetz24`-Eintrag jetzt mit `liveStatus` an.
- `app/master/page.jsx`: neue `LiveStatus`-Komponente zeigt den echten Status auf der Betriebe-Karte — ehrlich `🔵 EXTERNAL` solange nicht konfiguriert.
- Eigenes, engeres Secret (`WERKNETZ24_STATUS_SECRET`) statt des Werknetz24-`ADMIN_SECRET` — Begründung in `docs/WEBHOOKS-AND-INTEGRATIONS.md`.
- Gegenstelle in `werknetz24-landing`: neuer `?type=master-zentrale-status`-Endpunkt (`api/customers.js`), liefert nur Aggregate, nie Kundendaten.
- Getestet: `tests/werknetz24-connector.test.js` (5 Tests, alle grün) — inkl. dass ohne Secret nie ein Fetch versucht wird.
- Nicht deployed. Vercel-Team-Build-Limit besteht unverändert fort.

## 2026-09-20 (spätere Änderung)
### Phase 1 — Grundlage und Bestand reparieren (Technical Lead, werknetz24-landing-Sitzung)
- Fehlende `.js`-Dateiendungen bei relativen Imports behoben (`lib/master-finance.js`, `lib/master-store.js`, `lib/master-tasks.js`, `lib/persistence.js`) — brach unter `node --test`.
- `jsconfig.json` ergänzt (`@/*` → `./*`) — fehlte komplett, betraf 4 weitere Dateien mit `@/`-Alias-Imports.
- `README.md`/`package.json.name` an die tatsächliche Master-Zentrale-Selbstbeschreibung angeglichen (vorher noch "Online-Anfragen-Automation").
- `/` leitet jetzt auf `/master` (vollständiges Dashboard) statt `/zentral` (ältere statische Version) weiter — beide bleiben erreichbar und gegenseitig verlinkt.
- Verifiziert: `npm test` 12/12 grün (vorher 8/9), `npm run build` erfolgreich.
- Neuer Fund dokumentiert (nicht in diesem Schritt behoben, da außerhalb des Auftragsumfangs): `/api/master/*`-Schreibendpunkte ohne Authentifizierung.

## 2026-09-20
### Phase 1
- Interaktives Lead-Dashboard implementiert.
- Neue Leads können in der Demo angelegt werden.
- Leads können geöffnet und bearbeitet werden.
- Status, Priorität, Kategorie, Quelle, Follow-up und Notizen vorhanden.
- Filter nach Status und Priorität vorhanden.
- Statusdokumentation aktualisiert.

### Hinweis
Die Demo speichert Daten derzeit nur im Browser-State. Persistente Speicherung ist noch offen.
