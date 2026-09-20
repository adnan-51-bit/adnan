# Werknetz24 Master-Zentrale

Technische Basis der Master-Zentrale: eine gemeinsame Übersicht/Steuerung für mehrere Geschäftsbereiche
(Werknetz24, E-Commerce, künftig weitere), mit klar getrennten, unabhängig funktionierenden Bereichen.

Ursprünglich als eng gefasstes MVP für zentrale Online-Anfragen-Erfassung gestartet (Workflow unten) —
dieser Kern bleibt bestehen und ist Teil des Automation-Bereichs.

## Status

**Live (technisch, seit 21.09.2026):** `https://adnan-sandy.vercel.app` — Schreibzugriffe bleiben ohne konfiguriertes `MASTER_API_SECRET` gesperrt, echter Geschäftsbetrieb (Verkauf/Zahlungen) ist weiterhin gesperrt (fehlende Rechtstexte, s. `docs/QUALITY-GATE-PHASE-4.md`).

Siehe `docs/STATUS.md` für den aktuellen, verifizierten Stand (Persistenz, Deployment-Gate, Quality Gate).

- Keine produktive Massenansprache
- Keine Secrets im Repository
- Testdaten statt echter Kundendaten
- Datenschutz und zulässige Werbeansprache vor produktivem Einsatz prüfen

## Struktur
- `/master` — vollständiges, API-gestütztes Dashboard (Betriebe, Aufgaben, Systeme, Finanzen, Automation, Audit-Log, Einstellungen)
- `/zentral` — ältere, statische Vorversion (bleibt erreichbar, von `/master` verlinkt)
- `/e-commerce`, `/lieferanten`, `/produkt-pipeline`, `/kunden`, `/bestellungen`, `/retouren` — E-Commerce-Geschäftsbereich
- `/shop` — Margenkalkulation (Testdaten, kein echter Shop)
- `/automation` — Automation Engine

## Ursprünglicher Kern-Workflow (Online-Anfragen)
Eingang -> Lead -> Klassifizierung -> Priorität -> Benachrichtigung -> Follow-up -> Abschluss -> Reporting

## Grundregel
Der Kern muss ohne einen bestimmten KI-Anbieter funktionieren. KI ist eine austauschbare Zusatzschicht.

## Für Claude
CLAUDE.md und docs/STATUS.md zuerst lesen. Änderungen testen und anschließend dokumentieren.
