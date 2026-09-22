# Multi-Business-Architektur

Stand: 2026-09-21 (Phase 2 – E-Commerce-Dashboard)

## Phase 2 – Eigenständiges E-Commerce-Dashboard (21.09.2026)

`app/e-commerce/page.jsx` ist jetzt das vollständige, eigenständige Dashboard des Geschäftsbereichs
`business_id: "ecommerce"` — im selben Aufbau wie `/master` (Topbar + Sidebar mit Tabs), mit genau
den 13 im Auftrag geforderten Bereichen: Übersicht, Produkte, Produkt-Pipeline, Lieferanten,
Bestellungen, Kunden, Zahlungen, Retouren, Finanzen, Automationen, Systeme, Quality Gate,
Einstellungen.

**Konsolidierung statt Neubau:** Die vorher auf sechs einzelne Seiten verteilte Funktionalität
(`/produkt-pipeline`, `/lieferanten`, `/kunden`, `/bestellungen`, `/retouren`, `/automation`) wurde
unverändert in die jeweiligen Tabs übernommen — dieselben API-Aufrufe, dieselbe Geschäftslogik,
nur in einer gemeinsamen Navigation zusammengeführt. **Keine Funktion wurde entfernt:** Jede alte
Route existiert weiterhin, leitet aber jetzt clientseitig auf `/e-commerce?tab=<bereich>` weiter
(`window.location.replace`), damit kein bestehender Link (z. B. aus der Master-Zentrale oder ein
Lesezeichen) ins Leere läuft, aber trotzdem nur EINE UI pro Datensatz existiert.

**Neue Tabs, ausschließlich mit bereits bestehenden, echten APIs (keine neue Route-Datei, keine
Fake-Daten):**
- **Produkte** – Katalogsicht auf `listProducts()` (Name, Kategorie, Lieferant, Preis, Pipeline-
  Status), ergänzt die bestehende, workflow-orientierte Produkt-Pipeline-Ansicht um eine reine
  Übersichts-/Such-Ansicht.
- **Zahlungen** – echter Provider-Status aus `GET /api/providers` (`lib/providers.js`, unverändert)
  statt erfundener Zahlungsdaten; PayPal-Status ergänzt aus der Systems-Registry.
- **Finanzen** – `GET/POST /api/master/finance?business_id=ecommerce` (Phase-1-Filter); jede aus
  diesem Tab angelegte Buchung erhält serverseitig zwingend `business_id: "ecommerce"` (im Request
  vom Client mitgesendet, s. Sicherheitsabwägung unten).
- **Systeme** – gefilterte, **schreibgeschützte** Sicht auf `GET /api/master/systems`, beschränkt
  auf die für E-Commerce relevanten Einträge (`supabase`, `stripe`, `paypal`, `shopify`).
  Bearbeitung bleibt bewusst ausschließlich in der Master-Zentrale (`/master` → Systeme), um nicht
  zwei unterschiedliche Bearbeitungsoberflächen für dieselben Datensätze zu betreiben.
- **Quality Gate** – zeigt das eine, zentrale `GET /api/master/quality-gate` (kein zweites,
  paralleles E-Commerce-Quality-Gate, um keine widersprüchlichen Freigabestände zu riskieren).
- **Einstellungen** – E-Commerce-eigene Grundregeln, mit explizitem Verweis, dass Werknetz24-Daten
  hier nie geladen werden.

**Werknetz24-Trennung, jetzt auch im Dashboard-Code strukturell geprüft:** `app/e-commerce/page.jsx`
importiert den Werknetz24-Connector nicht und referenziert `werknetz24.de` an keiner Stelle — dies
ist jetzt Teil von `tests/ecommerce-dashboard.test.js`, nicht nur eine Absicht. Werknetz24 bleibt
ausschließlich über die Master-Zentrale (`/master` → Betriebe → „Öffnen") erreichbar.

**Master-Zentrale-Navigation aktualisiert:** Die Sidebar-Kurzlinks in `app/master/page.jsx`
verlinken jetzt direkt auf `/e-commerce` bzw. `/e-commerce?tab=<bereich>` statt auf die alten,
jetzt weiterleitenden Routen — ein Klick führt ohne Umweg zum richtigen Tab. Ein neuer Test
(`tests/ecommerce-dashboard.test.js`) vergleicht die Betriebs-Links aus `lib/master-store.js`
(Server-Registry) und `app/master/page.jsx` (Client-Fallback vor dem ersten API-Laden) automatisch
gegeneinander, damit beide nie auseinanderlaufen können.

**Bewusste Sicherheitsabwägung (Finanzen-Tab):** `createFinanceEntry` im E-Commerce-Dashboard setzt
`business_id: "ecommerce"` im Request-Body, den der Client sendet — nicht serverseitig erzwungen
(anders als z. B. bei `deriveOrderGateInputs`, wo der Server die Freigabe-Flags selbst ableitet).
Das ist hier vertretbar, weil `POST /api/master/finance` ohnehin durch `MASTER_API_SECRET`
geschützt ist (nur Inhaber des Admin-Secrets können überhaupt buchen) und eine falsch gesetzte
`business_id` durch `isKnownBusinessId()` (Phase 1) höchstens zu einer falschen Zuordnung, nie zu
einer Sicherheitslücke führen kann. Für eine echte Multi-Tenant-Trennung mit nicht
vertrauenswürdigen Aufrufern wäre eine serverseitige Ableitung nötig — hier nicht erforderlich, da
alle Schreibzugriffe ohnehin auf ein einzelnes, geteiltes Admin-Secret beschränkt sind.

## Ziel

Die Master-Zentrale verwaltet mehrere eigenständige Geschäftsbereiche zentral, ohne sie inhaltlich
zu vermischen:

```
MASTER-ZENTRALE
├── Werknetz24        (business_id: "werknetz24")  → eigenes, externes Dashboard
├── E-Commerce        (business_id: "ecommerce")   → eigenes, internes Dashboard
└── Weitere Betriebe  (business_id: "future")      → vorbereitet, noch kein Dashboard (OPEN)
```

Die Master-Zentrale selbst ist **nur** die übergeordnete Zentrale: Sie zeigt Betriebe an,
verlinkt auf deren jeweiliges Dashboard und aggregiert betriebsübergreifende Aufgaben/Finanzen.
Sie besitzt keine eigenen Geschäftsdaten eines Betriebs.

## business_id – die zentrale Trennlinie

Jeder registrierte Geschäftsbereich hat eine eindeutige `business_id`. Registry und Quelle der
Wahrheit: `lib/master-store.js`.

```js
export const BUSINESS_IDS = ["werknetz24", "ecommerce", "future"];
export function isKnownBusinessId(id) { ... }
export function getBusiness(id) { ... }
```

Zusätzlich gibt es den Sonderwert **`"master"`** (kein Betrieb, sondern die Kennzeichnung für
betriebsübergreifende Master-Zentrale-Aufgaben/Buchungen, z. B. interne Infrastruktur). `"master"`
ist bewusst NICHT Teil von `BUSINESS_IDS` – ein Betrieb und der Sonderwert dürfen nicht verwechselt
werden.

Jede relevante Datenstruktur trägt diese Zuordnung:

| Datenstruktur | Feld | Pflicht? | Erlaubte Werte |
|---|---|---|---|
| `lib/master-store.js` Betrieb | `id` (= business_id) | ja | `BUSINESS_IDS` |
| `lib/master-tasks.js` Aufgabe | `business_id` | ja (Default `"master"`) | `BUSINESS_IDS` ∪ `"master"` |
| `lib/master-finance.js` Buchung | `business_id` | nein (`null` = betriebsübergreifend) | `BUSINESS_IDS` oder `null` |
| `lib/ecommerce-store.js` Produkt/Lieferant/Kunde/Bestellung/Retoure | `business_id` | immer, fest `"ecommerce"` | nur `"ecommerce"` |

`createTask`/`createFinance` validieren `business_id` gegen `isKnownBusinessId()` und lehnen
unbekannte/erfundene Werte mit einem klaren Fehler ab (`Unbekannte business_id: ...`) – ein
Tippfehler kann dadurch keinen Betrieb faktisch "verschwinden lassen" oder falsch zuordnen.

## Warum Werknetz24 strukturell nicht vermischt werden kann

Werknetz24 ist **kein Modul dieses Repositories**, sondern ein vollständig separates, bereits
produktives System (`adnan-51-bit/werknetz24-landing`, eigenes Deployment, eigene Datenbank/Redis).
Die Master-Zentrale hält dafür **keine lokalen, mutierbaren Geschäftsdaten** – der einzige Bezug
ist ein read-only, live abgefragter Statusauszug:

```
lib/werknetz24-connector.js  →  fetchWerknetz24Status()
  → GET https://werknetz24.de/api/customers?type=master-zentrale-status
  → nur aggregierte Kennzahlen (Systemstatus, offene Incidents/Aufgaben, offene Rechnungen/
    Ausgaben-Summen) – nie Kundendaten, nie Rechnungspositionen
```

`lib/master-store.js` reichert nur den `werknetz24`-Eintrag in `listBusinesses()` mit diesem
`liveStatus` an. `lib/ecommerce-store.js` importiert den Werknetz24-Connector an keiner Stelle
(technisch geprüft in `tests/multi-business-separation.test.js`) – eine Vermischung ist damit nicht
nur unterlassen, sondern strukturell ausgeschlossen: Es gibt schlicht keinen Codepfad, über den
E-Commerce-Daten in Werknetz24 landen könnten oder umgekehrt.

## E-Commerce-Isolation

`lib/ecommerce-store.js` exportiert `BUSINESS_ID = "ecommerce"` und stempelt dieses Feld auf jeden
Datensatz – sowohl auf die geseedeten Lieferanten/Produkte (echte, vorher recherchierte Daten) als
auch auf jeden über `createProduct/createSupplier/createCustomer/createOrder/createReturn` neu
angelegten Datensatz. Das macht die Zugehörigkeit maschinell nachprüfbar statt nur behauptet.

## API-Zugriff (bestehende Routen erweitert, keine neue Route-Datei)

Das Projekt hatte mit 12 Serverless-Funktionen bereits das Vercel-Hobby-Limit erreicht
(Phase-1-Audit vom 20.09.2026). Multi-Business-Filterung wurde deshalb additiv in bestehende
Routen eingebaut, keine 13. Datei angelegt:

- `GET /api/master/businesses` – weiterhin alle Betriebe; neu: `?id=<business_id>` liefert genau
  einen Betrieb (404 bei unbekannter ID).
- `GET /api/master/tasks?business_id=<id>` – filtert Aufgaben auf einen Betrieb (oder `"master"`
  für betriebsübergreifende Aufgaben). Ohne Parameter weiterhin alle Aufgaben.
- `GET /api/master/finance?business_id=<id>` – filtert Buchungen analog.
- `POST/PATCH /api/master/tasks` – `business_id` ist jetzt ein erlaubtes, validiertes Feld.
- `GET/POST /api/orders?type=products|suppliers|customers|orders|returns` – jeder zurückgegebene
  Datensatz trägt bereits `business_id: "ecommerce"` aus der Datenschicht, keine Routenänderung
  nötig.

## Frontend

- `/master` (Master-Zentrale): Tab **Betriebe** zeigt alle Betriebe mit `Öffnen →` zum jeweils
  eigenen Dashboard (Werknetz24 → `https://werknetz24.de/admin-zentrale`, E-Commerce →
  `/e-commerce`, "Weiterer Betrieb" bewusst ohne Link/`#`, solange kein echter Betrieb dahinter
  steht). Tab **Aufgaben** und **Finanzen** zeigen jetzt einen Geschäftsbereich-Filter und ein
  Badge pro Zeile, damit sichtbar bleibt, welcher Betrieb betroffen ist – keine stille Vermischung
  in der Oberfläche.
- `/e-commerce` (+ `/produkt-pipeline`, `/lieferanten`, `/kunden`, `/bestellungen`, `/retouren`,
  `/shop`): eigenständiges E-Commerce-Dashboard mit eigener Navigation, unverändert seit Phase 3,
  bezieht ausschließlich Daten aus `lib/ecommerce-store.js`.
- Werknetz24 hat **kein eigenes Dashboard in diesem Repository** – es referenziert bewusst das
  bestehende, produktive `werknetz24.de/admin-zentrale`, um das System nicht zu duplizieren oder zu
  ersetzen.

## Tests (`tests/multi-business-separation.test.js`)

| Anforderung aus dem Auftrag | Test |
|---|---|
| Werknetz24 funktioniert weiterhin | `getBusiness("werknetz24")`, `liveStatus`-Anreicherung, unveränderter externer Link |
| E-Commerce ist getrennt | jeder E-Commerce-Datensatz trägt `business_id: "ecommerce"`; struktureller Import-Check, dass `ecommerce-store.js` den Werknetz24-Connector nie importiert |
| Daten werden nicht vermischt | `listTasks({business_id})`/`listFinance({business_id})` filtern strikt; unbekannte `business_id` wird abgelehnt |
| Master-Zentrale erreicht beide Bereiche | `listBusinesses()` liefert beide mit unterschiedlichen, korrekten Dashboard-Links |

## Bewusst nicht umgesetzt (Phase 1)

- Kein eigenes Datenbankschema für `business_id` in Supabase-Migrationen angelegt – die
  Supabase-Tabellen (`master_tasks_v2`, `master_finance_entries`, `ecommerce_*`) besitzen die
  Spalte teils bereits (`master_finance_entries.business_id` existierte schon vor dieser Phase),
  eine vollständige Migrationsprüfung für alle Tabellen ist nicht Teil dieses Schritts, da aktuell
  ohnehin der Fallback-Speicher aktiv ist (kein Supabase-Konto).
- Kein eigenes Dashboard für "Weiterer Betrieb" – es existiert kein realer dritter Betrieb, ein
  Dashboard dafür wäre eine erfundene Funktion.
- Kein Rollen-/Mehrbenutzer-System pro Betrieb (weiterhin ein einzelnes `MASTER_API_SECRET` für
  alle Schreibzugriffe) – unverändert seit Phase 4, nicht Gegenstand dieser Phase.
