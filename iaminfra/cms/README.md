# IAM CMS transplant

This directory stages the strongest reusable pieces of the InnerAnimal Media CMS for Legendary OS.

## Source

Primary IAM source observed during transplant:

- `src/core/agentsam/cms/`
- `src/dashboard/cms/`
- source commit: `2488d96513482dceffa97477cd829910e13a3cea`

The IAM CMS already converged on several useful product laws:

1. **One canonical content tree:** `Site → Page → Section → Block`.
2. **Core owns CMS meaning/lifecycle; hosts only expose it.** UI, Worker routes, and Cloudflare storage should not become second CMS implementations.
3. **Provider/runtime adapters stay outside portable CMS behavior.**
4. **Human and Agent Sam actions share one capability vocabulary.**
5. **AI is proposal/acceleration, not the only mutation path.**
6. **Preview, publish, revisions, theme, assets, routing, and lifecycle are separate concerns.**

## Transplanted now

```text
iaminfra/cms/
├── contracts/
│   └── capabilities.ts
├── editor/
│   ├── model.ts
│   └── types.ts
└── README.md
```

These are intentionally small, portable seams.

## Not copied

The IAM `CmsEditor.tsx` is currently ~80 KB and carries substantial dashboard composition/UI behavior. It is useful reference material, but copying it wholesale would start Legendary with a monolith we would immediately need to peel apart.

Also excluded:

- IAM-specific dashboard routing and compatibility facades
- IAM workspace/site resolution
- IAM D1 table names and migrations
- Agent Sam spawn/model-routing persistence
- legacy CMS mega-file compatibility
- client-worker bridge assumptions
- storefront/customer-specific adapters
- deployment/operator tooling

## Promotion plan

`/iaminfra` is not intended to become a fourth production architecture layer.

As Legendary CMS work begins:

- editor types/model → promote into `/frontend/src/cms/` or a shared package when consumed;
- capability manifest → promote into backend-owned CMS contracts and Agent Sam authorization;
- Cloudflare persistence → implement under `/backend` or `/services` using Legendary data contracts;
- reusable UI concepts from IAM → rewrite as focused Legendary components instead of copying the monolithic editor.

## Legendary CMS target

The customer-facing CMS should stay simple:

```text
Websites
  ├── Legendary Contractors
  └── Legendary Scapes

Site
  └── Pages
       └── Sections
            └── Blocks

Assets
Theme
Preview
Revisions
Publish
```

An authorized user should be able to edit normal content, preview it, and publish it without code, Git, deployment knowledge, or Agent Sam. Agent Sam can use the same capability contract to assist safely.
