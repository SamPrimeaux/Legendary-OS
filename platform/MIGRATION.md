# Migration: refine the live system area by area (strangler pattern)

Live today: one Worker (`backend/src/index.ts`) serving a React SPA that reads published pages from
`/api/public/sites/:siteKey/page`. Two sites in one D1: `site_contractors` at `/`, `site_scapes` at `/scapes`.
Nothing in `platform/` changes that until a cutover PR.

## The loop (per page, section or area)
1. **Capture** the live state: `npm run live:capture` (read-only GETs; fixtures committed in `fixtures/live-demo/`).
2. **Convert** into the contracts: `npm run live:import` (one-time) or hand-edit `apps/<id>/content/site.json`.
3. **Prove no regression:** `npm run verify` (parity text checks, section counts, legacy URLs, link check, runtime test).
4. **Polish** in a small PR. Parity must stay at 0 problems unless a change is intentional and noted.
5. **Look at it** (`npm run build:demo && npm run preview:demo`) and compare against the live page by eye.
6. **Record** the area as converted in the table below.

## Status
| Area | State |
|---|---|
| Public pages (11 live pages, both sites) | **Converted**, parity 0 problems, 384 text checks, all legacy URLs preserved as redirects |
| Global nav, footer, brand mark, utility link | Converted |
| Theme tokens | Derived from live (`brand`, `surface`, `radius`); needs a design pass |
| Visual parity with the live SPA | **Not automated.** Needs side-by-side review per page |
| Media | 30 legacy `/assets/…` URL references; migrate to media keys when media converges |
| Contact page | Parity only (no form on live). Lead form + popups exist in the library, unused until chosen |
| Before/after slider | In the library; not yet used by demo content |
| Editor / dashboard | Not started. Extract `frontend/src/cms` + `media` into `packages/dashboard-ui` |
| Auth / `/auth/login` | Not started. Known bugs to collect; keep the identity package |
| Database | **Two lineages.** Live keeps `cms_*` tables; platform baseline is for fresh installs. Convergence plan below |
| Cutover | Not started |

## Database convergence (when, not now)
Live tables: `cms_sites`, `cms_pages`, `cms_sections`, `cms_publications`, `media_assets`, … Platform tables:
`sites`, `pages`, `sections`, `publications`, `media_assets`, … `npm run schema-diff` shows the one name collision
(`media_assets`). Options, in order of safety: (a) a read adapter that renders from live tables so the platform
renderer can replace the SPA with no schema change; (b) a rehearsed conversion migration on a **copy** of the D1.
Choose (a) first. Do not combine both schemas in one database before a rehearsal.

## Cutover gates (all required)
Parity 0 problems · side-by-side visual sign-off for every page · editor can publish end-to-end · lead and media paths
tested on staging · rollback = redeploy the previous Worker version and revert the PR · live URLs unchanged
(legacy slugs 301 to clean routes; confirm with the owner before relying on that for SEO).

## Known risks
The platform renders HTML on the server (live is a client-side SPA): good for SEO, but behavior differs, so review.
`/assets/…` images are still served by the live worker; the preview points at it. The page script is inlined (needs
CSP work). `platform-runtime` is verified against SQLite, not yet against real D1/R2.
