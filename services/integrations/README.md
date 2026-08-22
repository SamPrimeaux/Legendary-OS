# Integrations service

Provider adapters and synchronization workers for systems Legendary may use underneath the unified OS experience.

## Intended responsibilities

- payroll / HR provider adapters
- accounting / payments adapters
- email / calendar / messaging delivery
- webhook receivers and normalized events
- scheduled synchronization jobs
- provider health and sync receipts

## Boundary law

Provider-specific fields and SDK semantics stop here. Normalize them into backend-owned contracts before they reach Legendary product domains.

A provider can change without forcing the frontend or core customer/employee/project model to change.
