# Changelog

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
