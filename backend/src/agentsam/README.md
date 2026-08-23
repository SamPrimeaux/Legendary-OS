# Agent Sam — Workers AI lane (`AGENTSAM_WAI`)

Portable inference harness for Legendary OS and future CF customer workers.

## Binding

```ts
// env.AGENTSAM_WAI — Workers AI catalog (wrangler.jsonc → "ai": { "binding": "AGENTSAM_WAI" })
```

See `AGENTSAM.md` § Worker bindings for dashboard-verified names.

## Design intent

- **Repurposable package** — extract to `@legendary-os/agentsam-wai` (or agentsam-sdk subpath) so customers get a standard Workers AI harness without IAM monolith imports.
- **D1-driven routing later** — mirror IAM `agentsam_routing_arms` pattern when Legendary needs multi-model selection.
- **Session-gated HTTP** — chat endpoints resolve the human via `resolveIdentitySession` (same cookie as CMS), never the bridge key.

## Status

| Piece | State |
|-------|-------|
| CF binding `AGENTSAM_WAI` | ✅ provisioned |
| `env` typing | ✅ `backend/src/env.ts` |
| Chat / tool loop route | ⏳ not wired |
| Model catalog sync | ⏳ not wired |

## Related

- Machine trust: `backend/src/auth/bridge-key-auth.ts` (`AGENTSAM_BRIDGE_KEY`)
- Identity session: `backend/src/identity/resolve-identity-session.ts`
- Project context table: `migrations/0004_agentsam_project_context.sql`
