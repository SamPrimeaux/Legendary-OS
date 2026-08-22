# Frontend

Customer-facing and employee-facing Legendary OS application surfaces.

## Owns

- Authenticated web/mobile-first UI
- Role-aware navigation and dashboards
- Leads, customers, projects, people, content, CMS, and settings experiences
- Agent Sam interaction surfaces
- Contextual help, guides, tooltips, empty states, and onboarding
- Public-site administration UI

## Does not own

- Business rules or persistence
- Provider-specific integrations
- Media processing pipelines
- Payroll/accounting provider logic

## Initial direction

Keep this layer thin and product-focused. The frontend should call stable backend contracts and should not need to know which infrastructure or third-party provider fulfills an operation.
