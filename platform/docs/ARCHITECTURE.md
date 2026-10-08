# Architecture

One codebase, many white-label apps. An app is configuration + content. Everything else is shared.

```
packages/
  site-contracts/    SSOT types + manifest/brand validators (roles, sections, pages, collections, leads)
  platform-protocol/ HTTP route table + response envelope shared by Worker and frontends
  platform-db/       D1 schema (baseline) + migration lock
  cms-core/          section/collection registry, bundle validation, role permissions
  site-renderer/     contract -> HTML. One renderer, every app
  platform-runtime/  Worker factory: public pages, /api/leads, /media
  media-core/        media key + storage helpers
  identity/          session + member contract (provider: inneranimalmedia)
  dashboard-ui/      shared admin UI modules (to be extracted from the existing CMS frontend)
apps/<id>/           white-label site pack
  app.manifest.json  identity, site key, features, roles
  brand/             brand pack + theme tokens
  content/site.json  pages, sections, globals, collections
deployments/<id>/    where apps run: Worker, D1, R2, domains, mounts, live-parity routes
fixtures/live-demo/  captured live pages (regression baseline)
tools/               los CLI + guard
```

## Content model
Site -> Pages -> Sections -> Blocks, plus Globals (header, footer, announcement, overlays) and
Collections (services, portfolio, reviews, listings, team, process-steps).

- A section either carries inline data or **binds to a collection** (`data.source.collection`).
  The same `portfolio` collection feeds a home teaser, a gallery page and a before/after slider.
- Popups are **overlays** (`globals.overlays`): a trigger plus a list of ordinary sections.
  Any section type can live in a page or a popup; any CTA can open an overlay (`{ overlay: "key" }`).
- Pages may declare `aliases` (old URLs). The Worker 301s aliases to the canonical route.

## One deployment, many sites
The demo is one Worker + one D1 + one R2 hosting two white-label sites (this mirrors the live system:
`site_contractors` at `/`, `site_scapes` at `/scapes`). A deployment (`deployments/<id>/deployment.json`)
only says which apps are mounted where and which Cloudflare resources they use. Links in content are
site-relative; the renderer prefixes the mount path. When a paying customer needs isolation, add a second
deployment file; nothing in a package changes.

## What is not built yet
Dashboard UI extraction, media import, identity adapter, projects/tasks UI, Turnstile/rate limiting on
`/api/leads`, external (CSP-friendly) enhance script.
