# platform-db
Baseline schema and migration lock. Read `docs/DATA-AND-MIGRATIONS.md` before adding a migration.
- `migrations/NNNN_name.sql` — schema only, forward-only
- `migrations.lock.json` — hashes of released migrations (`node tools/los.mjs db-lock`)
