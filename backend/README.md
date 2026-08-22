# Backend

Core Legendary OS application/domain layer.

## Owns

- API contracts used by the frontend
- Authentication/session enforcement
- Organization, brand, membership, role, and permission rules
- Core domains: people, leads, customers, properties, projects, jobs, content, assets, CMS, communication, tasks, and workflows
- Persistence boundaries and audit trails
- Agent Sam action authorization and business-context assembly

## Does not own

- UI rendering
- Third-party/provider-specific SDK logic
- Heavy media/content processing implementations

## Initial direction

Business truth belongs here. Provider changes should not force frontend rewrites, and services should enter through explicit backend-owned contracts rather than leaking vendor semantics into the product model.
