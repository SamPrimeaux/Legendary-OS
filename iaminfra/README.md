# IAM Infrastructure

`/iaminfra` is a curated transplant area for proven InnerAnimal Media infrastructure that can accelerate Legendary OS without coupling this repository back to the IAM monorepo.

## Rules

- Copy reusable primitives, contracts, models, and patterns — not whole IAM feature trees.
- Keep provenance clear: every transplanted artifact should name its IAM source path and source commit when practical.
- Treat files here as staging/reference material. Production code should be promoted deliberately into `/frontend`, `/backend`, or `/services` once Legendary-specific ownership is clear.
- Do not import from the IAM repository at runtime.
- Do not copy compatibility hosts, legacy shims, monolith files, deployment assumptions, customer-specific seeds, or IAM-only operator tooling unless a Legendary requirement proves they belong here.
- **Do not import CPAS / Companions harness trees** (`companionscpas-agentsam`, `tenant_companionscpas`, etc.). Branch `chore/import-companions-agentsam-harness` is historical reference only — never merge. Promote portable Agent Sam patterns into `backend/src/agentsam/` instead.
- Prefer portable domain logic over provider/runtime-specific implementation.

## Initial transplant

`iaminfra/cms/` contains the reusable seam from the canonical Agent Sam CMS work:

- Site → Page → Section → Block content model
- editor-facing normalized types/model mapping
- human + agent capability vocabulary
- CMS architecture notes adapted for Legendary OS

This is intentionally not the full IAM CMS. The current IAM editor component is large and carries dashboard-specific composition concerns, so Legendary should reuse its model/contracts first and build a cleaner customer-facing editor around those primitives.
