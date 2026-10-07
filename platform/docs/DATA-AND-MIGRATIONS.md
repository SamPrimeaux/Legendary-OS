# Data and migrations: how a pre-packaged app ships clean

## Where things live
| Thing | Home | Written by |
|---|---|---|
| Pages, sections, globals, collection items | D1 | dashboard (editor/publish), `los seed-sql` at install |
| Published pages for the public site | D1 `publications` (one snapshot row per page/globals/collection) | publish action |
| Media files | R2 (`media_assets` rows point at them) | dashboard upload |
| Leads, projects, tasks, members | D1 | public form, dashboard |
| Brand, theme tokens, manifest | repo (`apps/<id>/`) | developers |
| Secrets | `wrangler secret` | operator |

The public Worker reads **only** `publications` (a few primary-key lookups per request), so it scales
without joins and can be cached at the edge.

## The three rules that keep it clean
1. **Migrations are schema only.** No INSERT/UPDATE/DELETE, no customer rows, no IDs. `tools/guard.mjs` fails on DML.
2. **Content arrives through seed or the dashboard, never a migration.** `los seed-sql` generates
   `dist/seed.sql` from each mounted app's `content/site.json`. Default mode is insert-only
   (`ON CONFLICT DO NOTHING`), so re-running never overwrites a customer's edits. `--update` opts in
   to overwriting.
3. **Released migrations are immutable.** `packages/platform-db/migrations.lock.json` stores each file's
   hash; the guard fails if a released file changes. Fixes ship as the next numbered file.

## Two lineages (read this before touching a database)
The **live** D1 (`legendary-os-cms`) runs the repo-root `migrations/` (`cms_*`, `auth_*`, `media_*`). The
platform baseline is for **fresh installs** and must never be applied to the live database: it shares the table
name `media_assets` with different columns. `npm run schema-diff` lists every collision. Convergence is planned in
MIGRATION.md and is rehearsed on a copy first.

## Fresh install (the pre-packaged path)
```
wrangler d1 migrations apply <d1>      # baseline schema only (never the live database)
npm run seed:demo                      # writes deployments/<id>/dist/seed.sql (all mounted sites)
wrangler d1 execute <d1> --file deployments/<id>/dist/seed.sql
```

## Release hygiene
Before tagging a release that will be installed fresh, squash the migration history into a new
`0001_baseline.sql`, bump the lock, and keep older files only in git history. A new install then runs
exactly one clean file. Existing installs keep applying forward-only migrations.
