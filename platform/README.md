# platform

The refined, white-label system being built **beside** the live Legendary OS app. Read `AGENTS.md` and
`MIGRATION.md` first. Nothing here deploys or touches live code or data.

```
packages/     site-contracts · platform-protocol · platform-db · cms-core · site-renderer
              platform-runtime · media-core · identity · dashboard-ui
apps/         contractors · scapes        white-label site packs: manifest + brand + tokens + content
deployments/  legendary-os                one Worker + D1 + R2 mounting both sites (contractors at /, scapes at /scapes)
fixtures/     live-demo                   captured live page JSON (the regression baseline)
tools/        los.mjs (CLI) · guard.mjs
tests/        runtime.test.mjs            real deployment entry + real SQLite, both sites in one database
```

```
npm install
npm run verify          # guard, validate, typecheck, deployment drift, live parity, demo build + link check, runtime test
npm run build:demo && npm run preview:demo      # http://127.0.0.1:4390/  and  /scapes
npm run live:capture    # refresh fixtures from the live public API (read-only)
npm run schema-diff     # live vs platform table names (shows collisions)
```
