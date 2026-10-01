# AUTO-INCOME – eigener Betrieb in der Master-Zentrale

**Stand:** 01.10.2026 · **Status:** 🟢 VERIFIED (lokal gebaut und im Browser geprüft) · Daten 🟡 Snapshot, keine Live-Anbindung

## Was es ist
AUTO-INCOME ist ein eigenständiger Betrieb (Projekt für ein möglichst automatisiertes Online-Einkommen ohne eigenes Produkt). Er ist vollständig getrennt von Werknetz24 und E-Commerce: eigene Daten, eigene Seite, eigene Navigation.

## Kennung und Ablage
| Was | Wo |
|---|---|
| business_id | `auto-income` (registriert in `lib/master-store.js`, Teil von `BUSINESS_IDS`) |
| Betriebsseite | `/auto-income` (`app/auto-income/page.jsx`, eigener Titel, `noindex`) |
| Daten | `lib/auto-income-data.js` – jeder Datensatz trägt `business_id: "auto-income"` |
| Schnittstelle | `GET /api/master/businesses?autoIncome=1` (alle Daten) und `?autoIncome=kurz` (Startseiten-Zeile). **Nur mit `MASTER_API_SECRET`**, sonst 401. Keine neue Route-Datei (Vercel-Limit 12 Funktionen) |
| Navigation | Seitenleiste „Direkt öffnen → AUTO-INCOME“, Betriebe-Tab (Karte mit „Öffnen“), Startseite „Geschäftsbereiche“ mit Kurzübersicht (Status, aktiver Test, Einnahmen, Kosten, Messstufe, Blocker, letzte Aktivität) |
| Ampel Startseite | `lib/gesamtstatus.js`: Betriebe mit Status `TEST` zeigen 🟡 TEST statt 🟢 AKTIV |

## Seiteninhalt
Oben: aktueller Test → messbare Daten → Einnahmen → Kosten → nächster Schritt. Darunter: Betriebsstatus, Geld (Einnahmen, Kosten, Provisionen, Auszahlungen, Gewinn/Verlust, offene Auszahlungen), Test-Center (alle Tests mit Status, Ziel, Start, Kosten, Einnahmen, Angeschrieben, Antworten, Interessenten, Quote, Messstufe 0–5, Ergebnis, Blocker, nächster Schritt), Blocker (warum, wer, was genau, was Claude danach macht), Arbeitsverlauf, Agenten, Automatisierung, Dokumente.

## Datenquellen und Einschränkungen
- **Snapshot statt Live-Daten:** Das AUTO-INCOME-Projekt liegt privat und lokal (eigener Projektordner mit eigenem Git). Vercel kann darauf nicht zugreifen. Claude aktualisiert `lib/auto-income-data.js` nach jedem Arbeitszyklus. Die Seite zeigt Datenstand und „Live-Verbindung: NICHT ANGESCHLOSSEN“.
- **Öffentliches Repository:** Es stehen nur Kennzahlen und Status im Code, keine persönlichen Angaben und keine Projektdokumente. Ein Test prüft das. Die Dokumente erscheinen in der Liste mit „NICHT ANGESCHLOSSEN“.
- **Nicht im Browser-Code:** Die Seite importiert den Datensatz nicht direkt. Er kommt nur über die geschützte API (geprüft im Build: keine Snapshot-Texte in `.next/static`).
- **Agenten:** Für AUTO-INCOME laufen keine eigenen Agenten. Angezeigt wird „Nicht eingerichtet“, bei der Test-Auswertung „Kein Agent – Skript“.
- **Bearbeiten-Knopf** im Betriebe-Tab: Bei aktivem Supabase existiert AUTO-INCOME nicht in der Tabelle `businesses` (Stammdaten nur im Code, `NUR_IM_CODE` in `lib/master-store.js`). Speichern über „Bearbeiten“ meldet dann „Business not found“. Stammdaten werden im Code gepflegt.
- **Werknetz24 unverändert:** Im Repo `werknetz24-landing` wurde nichts geändert.

## Tests (01.10.2026)
- `npm test`: **282/282 grün** (vorher 274/274; 8 neue in `tests/auto-income.test.js`; `tests/multi-business-separation.test.js` um `auto-income` in der festen Reihenfolge ergänzt).
- `next build`: erfolgreich, Route `/auto-income` statisch.
- Lokal (`next start`): `/auto-income` 200; API ohne Secret 401, mit Secret nur `business_id: auto-income`. Browser: ohne Anmeldung „Anmeldung erforderlich“; mit Anmeldung alle 8 Bereiche, TEST_002C markiert (10 / 3 / 30 %), 0,00 €, keine sensiblen Begriffe, kein seitliches Scrollen. Startseite: Kachel 🟡 TEST mit Kurzübersicht. Betriebe → Öffnen → `/auto-income`.
