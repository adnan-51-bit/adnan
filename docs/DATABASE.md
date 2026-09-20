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
