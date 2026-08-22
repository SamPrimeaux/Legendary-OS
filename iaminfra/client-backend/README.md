# InnerAnimal Media Client Backend

This directory is the extraction/refinement workspace for reusable IAM client infrastructure.

Target package identity: `@inneranimalmedia-client/backend`.

Legendary OS is the first isolated host, not the owner of these reusable primitives.

## Migration rule

The architectural upstream is:

`SamPrimeaux/inneranimalmedia/src/core/agentsam/cms/`

Transplant proven core behavior first, preserve provenance, then simplify it here without IAM monorepo compatibility pressure.

The currently live `iaminfra/cms` workspace package remains a temporary build-safe compatibility surface while Cloudflare uses a frozen pnpm lockfile. New/refined core work belongs here and will replace that compatibility package deliberately.

## Domains

```text
client-backend/
  cms/
  identity/      future
  people/        future
  customers/     future
  leads/         future
  projects/      future
```
