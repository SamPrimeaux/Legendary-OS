# Cloudflare architecture direction

Legendary OS uses Cloudflare as the preferred demo and production host.

This direction borrows selectively from `cloudflare/cloudflare-os` and its deployment starter. The goal is not to clone Cloudflare OS; it is to reuse the runtime ideas that fit a multi-user business operating system.

## Patterns adopted

### 1. Thin edge entrypoint

One Worker is the public application entrypoint. It serves the frontend and owns `/api/*` routing.

The entrypoint should remain thin. Business rules belong in backend domain modules; specialized capabilities can move into service-bound Workers as they become independently useful.

### 2. Frontend and backend develop independently

Development uses two processes:

- Vite frontend on `:3000`
- Wrangler Worker on `:8787`

Vite proxies `/api` to the Worker. Production serves the built frontend through the Worker's assets binding.

### 3. Service bindings over accidental monoliths

When Agent Sam, integrations, media processing, notifications, or another capability deserves an independent runtime, expose it through a Cloudflare service binding rather than importing provider logic into the core backend.

Do not split a service merely because a folder exists. Start inside the core Worker when the behavior is small; extract once the boundary has operational value.

### 4. Backend as trust kernel

The backend owns authorization and business truth.

Every meaningful read or mutation resolves:

- organization / tenant
- brand or business-unit scope where relevant
- user membership
- role / capabilities
- resource relationship

Agent Sam and provider services never bypass this layer.

### 5. Runtime-editable product settings are not trust settings

Legendary can eventually expose admin-editable branding, navigation, content, workflows, guides, and other safe product configuration.

Authentication, privileged administrator identities, secrets, infrastructure bindings, and other trust-boundary settings stay deployment-controlled.

### 6. Provider adapters are capabilities, not product models

Payroll, accounting, email, calendars, storage, AI providers, and other vendors may sit underneath Legendary OS.

Legendary users should see Legendary concepts. Provider-specific APIs and data shapes terminate in `/services` and normalize into backend-owned contracts.

### 7. Cloudflare-native primitives are selected by workload

Potential primitives include:

- Workers for application and capability runtimes
- Static Assets for the frontend bundle
- D1 for relational operational data when appropriate
- R2 for media/documents
- Durable Objects for stateful coordination where a real coordination requirement exists
- Queues for asynchronous work
- KV for appropriate low-write configuration/cache cases
- Workers AI / AI Gateway where useful for Agent Sam transport and observability
- Cloudflare Access where appropriate for protected internal/admin surfaces

No binding is added merely because Cloudflare offers it. A domain/workload must justify the primitive.

## Patterns deliberately not copied from Cloudflare OS

Legendary OS does not currently need:

- per-user Dynamic Worker gadgets
- arbitrary user-generated application sandboxes
- a general-purpose Gatekeeper ecosystem
- blueprint/executable semantics
- Cloudflare OS's full capability-based agent runtime

Those solve Cloudflare OS's general AI-workspace problem. Legendary OS has a narrower job: make Legendary easier to operate.

## Current repository shape

```text
Legendary-OS/
├── frontend/            # Vite + React product UI
│   └── src/
├── backend/             # Core Worker / trust kernel / domain APIs
│   └── src/
├── services/            # Extractable capability workers and adapters
│   ├── agent/
│   ├── integrations/
│   └── media/
├── docs/
├── package.json
├── pnpm-workspace.yaml
└── wrangler.jsonc
```

## Extraction rule

Start simple. A capability moves from backend code into `/services/<capability>` when at least one of these becomes true:

1. it needs separate scaling or execution limits;
2. it has its own secrets/provider credentials;
3. it needs asynchronous or long-running lifecycle management;
4. multiple product surfaces consume it through a stable contract;
5. separating it materially improves security or failure isolation.

This keeps Legendary OS Cloudflare-native without reproducing a large distributed system before the business workflows require one.
