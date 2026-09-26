# Database Plan

## Decision

The application gets a provider-independent persistence facade. The current runtime remains process-memory-only until a database is explicitly configured.

## Candidate

Supabase Free is currently a viable $0 development option: it includes a Postgres database with a 500 MB database quota and two active free projects. Free projects can pause after inactivity. citeturn0search0turn0search1

No Supabase project is created or activated by this code change. No paid plan is approved.

## Production gate

A persistent database becomes 🟢 only after:
1. project/account exists;
2. credentials are stored as deployment secrets;
3. schema/migrations are applied;
4. read/write smoke test succeeds;
5. restart test confirms data survives;
6. access control and backup strategy are documented.

Until then: 🟡.


## Security
Current Supabase documentation recommends the newer `sb_secret_...` secret key for server-side code; secret keys must remain server-side and never enter GitHub or browser code. citeturn0search0turn0search1


## Master Tables
The schema now includes `master_systems` and `master_settings` in addition to businesses, tasks, and audit log. Public roles receive no access; server-side service access is required.

## Update 26.09.2026 — Supabase Free verbunden, Persistenz verifiziert

- **Anbieter/Tarif:** Supabase **Free Plan** über den Vercel Marketplace (Ressource `master-zentrale-db`, Region **Frankfurt / fra1**), im Vercel-Dashboard als „Supabase Free Plan“ bestätigt. Keine Zahlungsdaten hinterlegt. Nur mit dem Projekt `adnan` verbunden – `werkbot24-landing` hat **keine** Supabase-/Postgres-Variablen.
- **Env:** `SUPABASE_URL` und `SUPABASE_SECRET_KEY` (vom Marketplace gesetzt) = genau die Namen, die der vorhandene Adapter nutzt; kein Adapter-Umbau nötig.
- **Migrationen:** alle vier Dateien angewandt (Protokoll-Tabelle `schema_migrations_applied`). Neu: `20260926120000_persistenz_ecommerce_trennung.sql`:
  - fehlende `ecommerce_*`-Tabellen
  - `business_id` bei `master_tasks_v2`
  - Startdaten wie bisher im Code (3 Betriebe, 4 Aufgaben, 6 Lieferanten, 6 Produkte aus der echten Recherche; keine Kunden/Bestellungen)
  - Famulor-Korrektur 🟢 → 🟡
- **Datentrennung in der DB erzwungen:** `ecommerce_*.business_id` per CHECK fest `'ecommerce'`; `master_tasks_v2`/`master_finance_entries` nur bekannte IDs. Werknetz24 hat hier keine Tabellen. Geprüft: Einfügen eines Werknetz24- bzw. erfundenen Datensatzes wird von der DB abgelehnt.
- **Zugriff:** RLS auf allen Tabellen aktiv, keine öffentlichen Policies; `anon`/Publishable-Key → 401 auf allen geprüften Tabellen. Server nutzt `SUPABASE_SECRET_KEY`.
- **Lesesperre:** Kunden, Bestellungen, Retouren, Finanzen und Audit-Log sind über die API nur noch mit `MASTER_API_SECRET` lesbar (`tests/leseschutz.test.js`).
- **Persistenztest (echt, lokaler Produktions-Build gegen die echte DB):** Aufgabe, Finanzbuchung, Produkt und Kunde angelegt → nach Neuladen vorhanden → nach komplettem Server-Neustart vorhanden → Trennung ok → Testdatensätze inkl. ihrer Audit-Einträge wieder gelöscht (Bestand danach: 4 Aufgaben, 0 Finanzen, 6 Produkte, 0 Kunden, 0 Audit).
- **Offen:** Production nutzt die Datenbank erst nach dem nächsten Deploy (Env-Variablen gelten nur für neue Deployments). Supabase Free pausiert Projekte nach längerer Inaktivität. Backup-Strategie noch nicht festgelegt (Free-Plan ohne Point-in-Time-Recovery).
