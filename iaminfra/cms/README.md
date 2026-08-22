# Legendary CMS infrastructure

This package is the isolated refinement of the strongest CMS work from InnerAnimal Media.

Source reference during extraction: `SamPrimeaux/inneranimalmedia@2488d96513482dceffa97477cd829910e13a3cea`.

## Product law

- One content tree: `Site → Page → Section → Block`.
- CMS core owns meaning, validation, lifecycle, preview, revision, and publish behavior.
- Frontend, Worker routes, D1, R2, and Agent Sam are hosts/adapters — never second CMS implementations.
- Human UI and Agent Sam use the same capability vocabulary.
- Normal CMS work must remain possible without AI.
- Provider and Cloudflare details stop at adapter boundaries.

## Package shape

```text
iaminfra/cms/
├── src/
│   ├── domain.ts          canonical entities
│   ├── registry.ts        section/block field registry + validation
│   ├── store.ts           persistence contracts + request context
│   ├── service.ts         permission-aware CMS operations
│   ├── preview.ts         portable preview model
│   ├── memory-store.ts    zero-infra demo/test adapter
│   └── index.ts           public package surface
├── contracts/
│   └── capabilities.ts    shared human/Agent Sam capabilities
├── editor/
│   ├── model.ts           IAM bootstrap normalization + selection helpers
│   └── types.ts           editor-facing types
├── adapters/cloudflare/
│   ├── d1-store.ts        D1 implementation of CmsStore
│   └── schema.sql         focused CMS relational schema
├── package.json
└── tsconfig.json
```

## Current vertical slice

Legendary OS backend consumes this package and currently exposes a seeded demo API:

- `GET /api/cms/sites`
- `GET /api/cms/sites/:siteId/pages`
- `GET /api/cms/pages/:pageId/preview`
- `GET /api/cms/registry`

The frontend exposes a focused CMS workspace at `/cms` with:

- Legendary Contractors / Legendary Scapes site switching
- page selection
- structural section outline
- portable page preview
- schema-derived property surface starter
- responsive/mobile fallback

The current runtime uses `MemoryCmsStore` intentionally. This proves the product/domain loop without prematurely locking a database. `D1CmsStore` + `schema.sql` are ready as the Cloudflare persistence path once the Legendary D1 binding is intentionally created.

## Capability law

Reads/writes/destructive/publish actions are named capabilities. Destructive and publish capabilities require explicit approval at the canonical service boundary. The same rules apply whether an action came from the CMS UI or Agent Sam.

## What was deliberately not copied

- the ~80 KB IAM `CmsEditor.tsx` monolith
- IAM dashboard routing and compatibility facades
- IAM-specific D1 table names
- IAM workspace/customer inference
- Agent Sam model/spawn persistence
- client-worker bridge compatibility
- legacy mega-file imports
- IAM deployment/operator machinery

We keep the learned architecture and useful primitives; Legendary gets the clean implementation.

## Next promotion steps

1. Create/bind Legendary D1 and apply `adapters/cloudflare/schema.sql`.
2. Replace the demo request context with real organization/brand membership + capabilities.
3. Add mutation HTTP routes using `CmsService` rather than route-owned business logic.
4. Make the inspector fully registry-driven and editable.
5. Add R2 asset storage behind an asset adapter.
6. Add draft autosave, revision UI, preview/publish confirmation, and public-site rendering.
7. Expose the same CMS capabilities to Agent Sam through `@inneranimalmedia/agentsam-sdk`.
