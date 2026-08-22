# Services

External systems, infrastructure adapters, and asynchronous/background capabilities used by Legendary OS.

## Owns

- Provider adapters for payroll, accounting, email, calendar, payments, storage, analytics, and other external systems
- Media ingestion and processing adapters
- Agent Sam/model/provider integrations
- Notification delivery
- Search/indexing adapters
- Background jobs, sync workers, and webhooks

## Does not own

- Legendary business rules
- User-facing product semantics
- Authorization decisions that belong to the backend domain layer

## Initial direction

Services are replaceable plumbing. Normalize provider behavior behind narrow interfaces so Legendary users experience one coherent system even when multiple vendors operate underneath it.

MovieMode and IAM's internal production machinery remain separate products/systems; Legendary OS may exchange approved assets or jobs with those systems through explicit service contracts without exposing their internals to Legendary users.
