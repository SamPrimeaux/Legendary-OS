# @inneranimalmedia-client/backend

Legendary OS is a host/implementation of reusable InnerAnimal Media client infrastructure.

## Package ownership

`@inneranimalmedia-client/backend` owns portable client-side business/domain infrastructure that should work for Legendary and future IAM customers without importing a customer-specific host.

CMS is the first fully-developed domain inside this package. The intended direction is to transplant and refine the proven architecture from `inneranimalmedia/src/core/agentsam/cms/` rather than invent a second CMS.

Expected domain shape:

```text
@inneranimalmedia-client/backend
  cms/
    routing/
    context/
    domain/
    storage/
    registry/
    pages/
    sections/
    blocks/
    assets/
    theme/
    preview/
    pipeline/
    lifecycle/
    bootstrap/
    contracts/
    agents/
    ai/
    adapters/cloudflare/

  identity/      future
  people/        future
  customers/     future
  leads/         future
  projects/      future
```

## Host boundary

`@legendary-os/backend` is the Legendary Cloudflare Worker composition root. It owns Legendary-specific bindings, organization/brand configuration, HTTP routing, authentication composition, and host policy.

It must delegate reusable business rules into `@inneranimalmedia-client/backend`.

```text
Legendary frontend / public site
            ↓
@legendary-os/backend
            ↓
@inneranimalmedia-client/backend
            ↓
portable contracts + Cloudflare adapters
            ↓
D1 / R2 / KV / Queues as required
```

## CMS rule

Draft editing and public rendering share one CMS domain.

```text
editor → draft tree → validate → publish snapshot → public renderer
```

The public website reads publication snapshots only. Editing a draft must never mutate the public website until publish succeeds.

Agent Sam and human users execute the same canonical CMS capabilities and authorization rules.

## Upstream source

The architectural upstream is `SamPrimeaux/inneranimalmedia/src/core/agentsam/cms/`.

Its key rules remain valid here:

- one canonical CMS implementation
- Site → Page → Section → Block
- thin HTTP hosts
- portable core; provider/Cloudflare mechanics behind adapters
- no customer identity hardcoded in core
- preview and public rendering share semantics
- publish/lifecycle/revisions are canonical operations
- AI is provider-neutral and proposal-first
- Agent Sam executes CMS capabilities rather than bypassing the domain

Legendary isolation is where these boundaries can be simplified without legacy monorepo compatibility pressure.
