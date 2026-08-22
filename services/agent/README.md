# Agent service

Cloudflare-hosted capability boundary for Agent Sam integrations used by Legendary OS.

## Intended responsibilities

- model/provider transport
- agent session orchestration
- tool/capability exposure
- context retrieval adapters
- usage/cost telemetry

## Boundary law

This service does not decide whether a Legendary user is allowed to perform a business action. The backend resolves tenant, brand, membership, role, and capability before an Agent Sam action is authorized.

Keep the user-facing product model in `/backend`; keep model/provider plumbing here.
