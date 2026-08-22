# Legendary OS

**One operating system for Legendary.**

Legendary OS is the tailored digital operating layer for the Legendary businesses. It is not a generic SaaS dashboard and it is not a collection of disconnected integrations.

The goal is simple: **reduce the time, questions, handoffs, logins, follow-ups, and administrative friction required to run the business.**

Legendary employees should open one product and see what matters to their job. Richard and managers should open the same product and see what needs attention across the business. Customers should get a clean, high-trust experience. Agent Sam handles complexity underneath the interface rather than exposing it.

## Product principles

1. **Sell efficiency, not software.** Every feature must remove work, confusion, delay, or duplication.
2. **One Legendary experience.** Payroll, HR, communication, customer care, projects, content, CMS, and operations should feel like one system even when specialized providers remain underneath.
3. **Role-aware by default.** Owners, managers, sales, office staff, field employees, marketing, and customers should see only the information and actions relevant to them.
4. **Mobile-first field usability.** A job-site employee must be able to use the system cleanly from a phone without training on developer or AI tooling.
5. **CMS is baseline infrastructure.** Website and portfolio content must be editable through a simple front end. Git, code, deployments, schemas, and Agent Sam must never be prerequisites for routine updates.
6. **Agent Sam is the intelligence and action layer.** It should answer business questions, guide users, perform allowed actions, and proactively surface what needs attention.
7. **Complexity lives in the background.** Employees should never need to understand IAM internals, model routing, storage systems, repositories, or automation infrastructure.
8. **Custom-tailored, reusable underneath.** Legendary should feel bespoke while the underlying primitives remain reusable for future InnerAnimal Media customers.
9. **Do not build complexity for its own sake.** A 40-person organization is the proving ground; usefulness and clarity beat feature count.

## Core product domains

- **Home / Today** — role-specific priorities, alerts, quick actions, guidance
- **People** — employees, roles, permissions, onboarding, PTO, payroll access, documents, training, certifications
- **Leads & Customers** — inquiries, qualification, follow-up, customer history, properties, cross-brand relationships
- **Projects & Jobs** — assignments, updates, files, media, status, communication, customer context
- **Communication** — contextual messages, announcements, project/customer conversations, manager-to-team communication
- **Content** — field uploads, project assets, drafts, approvals, published content
- **Websites / CMS** — services, pages, projects, portfolio, available homes, calls to action, SEO, publishing
- **Operations** — tasks, approvals, requests, schedules, recurring administrative workflows
- **Agent Sam** — natural-language access to the business within each user's permissions

## Business model

Legendary OS should support multiple Legendary businesses without fragmenting shared people, customers, properties, or projects.

```text
Legendary
├── Legendary Contractors
├── Legendary Scapes
└── future / adjacent brands

Shared operating layer
├── People
├── Customers
├── Properties
├── Leads
├── Projects
├── Content & Assets
├── Communication
├── Websites / CMS
└── Agent Sam
```

A customer may interact with more than one Legendary business. A property may have a Contractors project and later a Scapes project. The system must preserve that relationship instead of creating isolated duplicate records.

## Initial proof loops

The first useful implementation should prove a small number of complete loops rather than dozens of disconnected screens:

1. **Employee:** log in → see today's work → upload job content → ask for help.
2. **Lead:** website inquiry → assigned lead → follow-up → status/history.
3. **Customer/project:** customer → property/project → updates/files/messages → completion.
4. **Content/CMS:** field media → project assets → content/portfolio draft → approval → website publish.
5. **People/operations:** employee → role → request/question → manager action → recorded resolution.
6. **Owner:** open dashboard → see what needs attention → ask Agent Sam → take action without hunting across systems.

## MovieMode boundary

MovieMode is an **InnerAnimal Media production capability**, not a full editing suite inside Legendary OS.

Legendary employees capture/upload media and Legendary stakeholders review or approve finished content. IAM can route the assets through Agent Sam + MovieMode behind the scenes for editing, repurposing, and content operations.

```text
Legendary field upload
        ↓
Legendary project / asset record
        ↓
IAM content queue
        ↓
Agent Sam + MovieMode
        ↓
Draft / finished content
        ↓
Legendary review & approval
        ↓
Website / social / campaign
```

## Definition of success

Legendary OS succeeds when:

- employees ask fewer routine questions because the product answers them first;
- managers spend less time chasing information and approvals;
- Richard can understand what needs his attention from one place;
- leads and customers do not fall through gaps;
- project media becomes reusable business content instead of disappearing into camera rolls;
- both websites can be safely maintained without codebase knowledge;
- Agent Sam can answer and act across the business while respecting role and tenant boundaries;
- the same underlying platform primitives can serve the next InnerAnimal Media customer without cloning Legendary-specific code.

See [`docs/PRODUCT-BRIEF.md`](docs/PRODUCT-BRIEF.md) for the initial product and architecture brief.
