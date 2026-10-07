# Legendary OS: two-business platform audit and implementation plan

Audited baseline: `main` at `f374a50`. Audit performed October 6, 2026 America/Chicago (October 7 UTC). Businesses: Legendary Contractors and Legendary Scapes. This is a source audit with local type checks, builds, and regression tests, not a verified production walkthrough.

## Decision

Keep this repository and its existing CMS, media, identity, and Cloudflare deployment. The product brief already describes the correct business architecture. Complete its working workflows before expanding modules or packaging another editor.

For Legendary, the useful CoStar pattern is verified information about customers, properties, projects, services, and media, presented through straightforward interfaces and a contextual assistant. Richard needs operational visibility and customers need guided discovery and consultation intake. A conversational UI alone cannot provide either without reliable records and actions behind it.

## What exists

| Area | Evidence | Assessment |
|---|---|---|
| Two brands | `frontend/src/main.tsx`, `backend/src/cms-api.ts` | Contractors at `/`; Scapes at `/scapes`; explicit `/site/:key` paths. Host-based custom-domain routing is not implemented. |
| CMS | `backend/src/cms/domain/`, `frontend/src/cms/CmsWorkspace.tsx` | Structured pages, sections, validation, drafts, revisions, publishing and rollback. Preserve and finish this editor. |
| Published delivery | `backend/src/cms/published-store.ts` | R2 snapshots, KV pointers, publication jobs, hashes and artifact records. There are consistency and invalidation gaps to address. |
| Media | `backend/src/media/`, `frontend/src/media/` | Originals, metadata, imports, deduplication, usage links, image variants and dedicated asset pages. |
| Identity | `backend/src/identity/` | Existing SDK cookie-session integration; machine bridge remains a separate lane. |
| Agent Sam | `backend/src/agentsam/README.md`, shell buttons | Workers AI binding configured; no chat HTTP route, inference handler, tool loop or model discovery implementation. Shell buttons have no action handlers; CMS send is disabled. |
| Leads / projects / team | `frontend/src/main.tsx` | Explicit placeholder pages. Migrations do not create their business records. |
| Owner home | `frontend/src/main.tsx` | `DashboardHome` exists but is never routed; `/dashboard` redirects to CMS. No attention queue. |
| CAD Lab | `frontend/public/cad-lab/index.html`, Worker entry | Standalone canvas/localStorage UI. Calls `/api/ai/generate-plan`, `/api/cad/upload-image`, `/api/cad/download-plan/:id`, absent from this Worker. Uses a legacy localStorage token path. |

## Findings and repairs

| Priority | Finding at baseline | Change / remaining work |
|---|---|---|
| Critical | Media routes read library records, upload/import, edit metadata and delete assets without authenticating the caller. | This branch adds the existing CMS session/bridge authentication before library storage access. Public GET variants and `/assets/` delivery remain available. Membership authorization is still needed. |
| High | Bridge auth permits requests when the bridge secret is absent, and accepts an email header without verifying an Access identity. | This branch removes those bypasses; bridge mode fails closed. This intentionally changes behavior for deployments relying on those bypasses. |
| High | Any valid session receives all CMS capabilities and both brands. Login is treated as authorization. | Implement organization membership, brand scope and server-derived capabilities before employee/customer onboarding or private AI retrieval. Do not introduce guessed owner emails or grant rules. |
| High | Some direct CMS reads/settings handlers bypass the domain's organization/brand checks. `/api/cms/sites` lists all sites. | Apply one resolved authorization context to every site/page/preview/theme/navigation/revision path. Do this together with membership, including negative authorization tests. |
| High | Public endpoint falls back to draft navigation and mutable editor theme. | This branch serves separately published settings or a publish-time page theme. Legacy D1 fallback without a published theme now uses renderer defaults. Publish navigation/theme explicitly for legacy sites. |
| High | Scapes root-relative CTAs and navigation can lead into Contractors. | This branch scopes section/header/footer links to `/scapes` or the explicit `/site/:key` mount. Preserves external, anchor, account and explicit cross-site links; rejects unsafe URL schemes. |
| High | `/assets/:key` serves arbitrary known R2 keys; variants remain public. | Current media is a public-website rail. Add explicit public/private visibility and protected delivery before storing customer documents, job-site records or employee media. Authentication on management endpoints alone does not make originals private. |
| Medium | Public page includes CMS and media editor code. | This branch loads workspaces on demand. Initial JS: 258.19 → 215.00 kB (gzip 77.82 → 66.90 kB). Initial CSS: 48.75 → 19.39 kB. These are build sizes, not measured load-time improvements. |
| Medium | Main public navigation is hidden under the tablet breakpoint with no replacement menu. | Add an accessible mobile menu and verify both brands on a phone. Preserve the visual direction. |
| Medium | Public HTML is a generic SPA document; fetched SEO only updates `document.title`. | Publish/render per-route title, description, canonical, Open Graph, structured data and meaningful HTML for indexing and sharing. Treat the two sites/domains explicitly. |
| Medium | CMS loads previews and revision histories for every page to derive summary counts. | Return scoped summary metadata from the list endpoint; load only the selected page's complete preview/history. |
| Medium | Publishing updates D1, R2, KV and receipts in separate steps; public settings are separate artifacts. | Define durable successful-publication authority, cache propagation behavior and recovery for failed jobs. Verify route changes, archive behavior and stale pointers. |
| Medium | Broad `/assets/` suffix routing can treat media SVG/font/icon files as Vite static files. | Give built frontend assets and media distinct namespaces or an exact emitted-asset manifest. |
| Low | Agent context schema source declares a ticket foreign key absent from migration 0004. | Reconcile schema documentation and migration intent; do not invent a ticket subsystem. All four existing migrations apply in a fresh SQLite check. |

## Target experience

### Customer: understand the service and request a consultation

A visitor chooses Contractors or Scapes, describes the goal, and sees appropriate services and approved project examples. The assistant narrows the request using the selected brand, actual service area, verified services, published portfolio content and approved FAQs. It names its sources and does not invent pricing, availability, qualifications or schedules. The normal form works independently.

Consultation intake creates one durable lead with business scope, contact, property/location, project interest, optional budget/timeline, consent, assignee, next action and activity history. A request involving both businesses links to one customer/property rather than duplicating the relationship. Sending external messages is a separately permissioned action.

### Richard: know what requires attention

The owner home shows real overdue follow-ups, unassigned inquiries, approvals and missing project updates. Each item opens the record and an available action. Agent Sam explains the queue using record references and timestamps, and can propose assignment, a follow-up draft or a task. Approved actions call the same validated handlers used by the manual UI and produce an audit record.

### Field team: turn work into useful content

An employee opens an assigned project on a phone, adds photos and a note, and submits an update. Files inherit the project, property, customer and relevant brands. Marketing chooses approved assets and creates a portfolio draft; an authorized reviewer publishes it through the existing CMS. Private operational notes never silently become public portfolio material.

## Build sequence and acceptance

1. **Secure the shared foundation.** Membership and capability resolution; complete scope checks; public/private media delivery; coherent public-route and publication behavior. Acceptance: unrelated signed-in users cannot read/change records, brand-limited staff cannot cross brands, public visitors cannot obtain private content, and draft edits stay private until publishing.
2. **Complete one inquiry-to-follow-up loop.** Implement shared customer/property identity and scoped lead records only as needed by intake, assignment and activity history. Build the public consultation form and office queue. Acceptance: submissions survive reloads, cannot duplicate on retries, have an owner/next action, and retain origin across both brands.
3. **Launch grounded public assistance.** Retrieve only approved published content; bind the assistant to the current site/service/project context. Configure a verified available model through the existing `AGENTSAM_WAI` lane; no invented model catalog or hidden provider fallback. Add citations, incomplete-information handling, limits and evaluations. Acceptance: it retrieves relevant real portfolio examples and prepares a consultation with consent; unavailable pricing and schedules are handled honestly.
4. **Deliver project/field-to-portfolio.** Add assignment, updates and approval using the existing asset/CMS primitives. Acceptance: a phone upload remains attached to its project and can be deliberately approved into a published portfolio entry.
5. **Add owner assistance and attention queues.** Deterministic queue queries first, conversational summaries second. Acceptance: Richard can inspect source records, delegate or resolve an item manually, and permitted assistant actions produce the same recorded result. Broaden to People/payroll only after a real required workflow is identified.

## Validation and limits

- Seven new regression tests pass: brand/mount links, unsafe schemes, source immutability, bridge fail-closed behavior, anonymous media reads/writes, published settings and legacy draft isolation.
- `pnpm check` and `pnpm build` pass, including TypeScript and Worker deployment dry run.
- All four migrations apply to an empty SQLite database. No production migrations were applied.
- Normal install hit an environment-specific native `node-pty` extraction failure. Dependencies were installed with scripts skipped for validation; Vite and Wrangler dry-run worked. Native SDK PTY functionality was not verified.
- Live Worker health/public/API/dashboard requests all returned HTTP 403 here. This does not establish the cause or production availability. No signed-in live review, mobile visual QA, Lighthouse measurement, AI inference or production publishing was performed.
- This branch does not implement membership, a lead pipeline, chat inference or the CAD endpoints. It repairs verified foundation issues and makes the remaining product work reviewable without pretending those features exist.
