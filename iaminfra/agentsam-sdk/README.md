# Agent Sam SDK infrastructure

Legendary OS treats Agent Sam as **first-class SDK infrastructure**, not an embedded one-off helper.

## Installed SDK

- npm package: `@inneranimalmedia/agentsam-sdk`
- pinned version: `1.9.0`

The package is intentionally pinned so Legendary OS upgrades Agent Sam through explicit SDK releases rather than silently drifting with IAM internals.

## Boundary

Legendary OS should consume Agent Sam through stable SDK contracts for:

- sessions and conversations
- streaming/events
- tool/action invocation
- approvals
- artifacts
- auth/context propagation
- tenant/workspace/user scope
- typed errors and receipts
- agent capabilities
- provider-neutral model/runtime access

Do **not** import IAM implementation files directly into Legendary runtime code.

## Direction

This directory is the Legendary-side home for Agent Sam SDK integration and future generated surfaces. As the SDK matures, it should support real generated/typed infrastructure for browser, Worker, server, and protocol clients instead of ad-hoc fetch wrappers.

Expected future shape:

```text
iaminfra/agentsam-sdk/
├── package.json
├── README.md
├── generated/        # generated clients/types when available
├── adapters/         # Legendary-specific SDK adapters only
└── fixtures/         # local/demo contract fixtures when needed
```

The canonical SDK remains independently versioned. Legendary-specific business rules do not belong in the SDK.

## Rule

If Legendary needs a new Agent Sam primitive that is generally useful, improve/publish the SDK first, then consume the released contract here. Do not bypass the SDK by reaching into the IAM monorepo.
