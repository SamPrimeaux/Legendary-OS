# Legendary OS — Initial Product Brief

## Mission

Legendary OS is a custom-tailored operating system for Legendary Contractors and Legendary Scapes. It should make the business easier to run by consolidating employee support, customer care, projects, communication, content, websites, CMS, and operational workflows into one clean experience.

The product should feel bespoke to Legendary while using reusable InnerAnimal Media platform primitives underneath.

## Primary users

### Owner / executive
Needs one place to understand what requires attention across both businesses: leads, follow-ups, customer issues, employee actions, approvals, content, website changes, and operational exceptions.

### Manager
Needs team visibility, project context, requests/approvals, customer information, employee support, and a clear way to escalate what actually needs owner attention.

### Sales / office
Needs leads, customers, follow-ups, project history, communication, forms, documents, and next actions without hunting across tools.

### Field employee
Needs an extremely simple mobile experience: today's job, project details, job-site updates, photo/video upload, company guidance, requests, and answers to routine questions.

### Marketing / content
Needs project assets, field uploads, project context, drafts, approvals, portfolio publishing, and website CMS access without touching source code.

### Customer
Future customer-facing surfaces may include project updates, documents, selections, approvals, messages, warranty/service, or account history. Customer access should be introduced only where it removes real friction.

## Experience model

Legendary OS should own the user experience even when underlying providers perform specialized regulated or commodity functions.

Examples:

- A payroll provider may calculate and move payroll, but employees should be able to access relevant pay information, status, guidance, and actions through Legendary OS.
- Email/SMS providers may deliver messages, but communication should remain attached to the customer, employee, project, or workflow that gives it meaning.
- Storage may live elsewhere, but employees should upload to the relevant project rather than choose storage buckets or folders.
- Website deployments may use developer infrastructure, but CMS users should edit and publish through a safe front end.

The principle is: **Legendary users operate Legendary; the platform handles the plumbing.**

## Core domains

### 1. Organization and brands

Legendary is the parent operational account. Legendary Contractors and Legendary Scapes are business units/brands within it.

Users may have access to one brand, multiple brands, or the full organization. Shared customers, people, properties, projects, and content should not be duplicated merely because multiple brands are involved.

### 2. People

Minimum durable model:

- person / employee identity
- employment status
- business unit memberships
- role
- manager
- permissions / capabilities
- contact information
- job/project assignments
- onboarding state
- payroll-provider linkage
- PTO / requests
- documents
- training / policies
- certifications / expirations
- assigned assets/equipment where useful

V1 does not need every People feature surfaced at once. The domain should be able to grow without a rewrite.

### 3. Leads and customers

Minimum durable model:

- person/company
- source
- brand/business unit
- service/project interest
- property/location
- budget/timeline where relevant
- assigned owner
- stage/status
- communication/activity history
- next action
- attachments
- conversion to customer/project

A customer should be able to participate in multiple Legendary relationships without duplicate identities.

### 4. Properties, projects, and jobs

Properties are useful shared anchors for Contractors + Scapes work.

A property may contain multiple projects. A project may involve one or more Legendary brands. Jobs/work assignments are operational slices of a project.

Project context should be the home for:

- customer
- property
- participating brands
- team members
- scope/services
- status
- timeline
- notes
- files
- photos/video
- communication
- content assets
- related leads/opportunities

### 5. Communication

Do not build a generic chat clone first. Communication should be contextual.

Messages and updates may belong to:

- project
- customer
- lead
- employee
- team/crew
- company announcement
- request/approval workflow

This allows Agent Sam to understand communication as business context instead of an isolated message stream.

### 6. Content and assets

Field capture must be extremely simple.

Example employee action:

1. Open today's project.
2. Tap **Add update**.
3. Select/upload photos or video.
4. Add an optional note.
5. Submit.

The system can then categorize and route those assets behind the scenes.

Content states may include raw, organized, in production, draft, awaiting approval, approved, and published.

### 7. CMS / websites

CMS is a baseline product requirement, not a developer feature.

Authorized users should be able to manage common website content such as:

- pages
- service descriptions
- project/portfolio entries
- available homes
- galleries/media
- calls to action
- team information
- reviews/testimonials
- SEO fields
- publish state

Manual editing must work without Agent Sam. Agent Sam may accelerate drafting, organization, retrieval, and publishing but cannot be required for ordinary CMS operation.

### 8. People operations / HR / payroll experience

Legendary OS should be able to serve as the employee front door for:

- pay information and payroll status
- PTO and requests
- onboarding
- policies
- documents
- certifications
- training
- manager actions
- employee questions

Do not confuse owning the employee experience with replacing regulated payroll or tax infrastructure. Specialized providers can remain underneath while Legendary OS provides the unified workflow and context.

### 9. Agent Sam

Agent Sam is both a conversational interface and an action layer.

It must be context-aware and permission-aware.

Example employee questions/actions:

- Where am I working tomorrow?
- What is our policy for job-site photos?
- How do I request Friday off?
- Upload these photos to this project.

Example manager questions/actions:

- Who has outstanding onboarding tasks?
- Which certifications expire soon?
- What jobs have no field update today?

Example owner questions/actions:

- What needs my attention today?
- Which leads are overdue for follow-up?
- What is happening with the Broussard project?
- Which customer issues are unresolved?
- What content is waiting for approval?

Agent Sam should surface likely next actions before users have to ask where appropriate.

## UX principles

### Role-first home

The home screen should answer **what matters to me now?**

A field employee may see today's job, crew notes, upload, PTO/help, and announcements.

An owner may see overdue leads, customer escalations, approvals, employee actions, payroll/HR reminders, content approvals, and website activity.

### Progressive complexity

Do not expose enterprise-scale configuration to routine users. Common actions should be one or two obvious taps. Advanced configuration belongs behind appropriately permissioned settings.

### Guidance before support

The product should reduce repetitive questions with:

1. clear labels and UX;
2. contextual helper text/tooltips;
3. task-specific empty states and guides;
4. Agent Sam when the answer/action requires broader context.

### Mobile-first

Field and manager workflows must be designed for phone use first. Uploading media, checking jobs, answering a request, or finding project/customer information should not require desktop navigation.

## Initial demo / MVP proof

The ideal demo is an end-to-end story, not a feature tour.

### Loop A — field to content

Employee logs in on a phone → sees assigned job → uploads job-site photos and note → project updates immediately → assets become available for the content workflow.

### Loop B — owner attention

Richard opens Legendary OS → sees actionable priorities → asks Agent Sam what needs attention → opens an overdue lead → follows up / delegates.

### Loop C — customer/project context

Open a customer → see property → see Contractors and/or Scapes projects → see updates, files, communication, team, and history in one place.

### Loop D — content to website

Authorized user opens a project → prepares a portfolio/content draft from project data/assets → reviews → publishes through CMS → public site updates without code.

### Loop E — employee operations

Employee asks a routine people/HR question or submits a request → system answers/guides or creates workflow → manager resolves it → resolution is recorded.

These five loops prove the product thesis without pretending every future module is already complete.

## MovieMode boundary

MovieMode remains an InnerAnimal Media production system.

Legendary OS should expose only the customer-relevant workflow:

- capture/upload
- project organization
- production status
- draft preview
- comments/change request
- approval
- published result

Editing timelines, model orchestration, rendering pipelines, and other production internals belong to IAM.

## Architecture rules

### Reusable platform primitives

Prefer reusable primitives for:

- tenant / organization
- business unit / brand
- user / membership
- role / capability
- person / employee
- customer
- property
- lead / opportunity
- project / job
- task / request / approval
- message / activity
- document / asset
- content item
- website / page / CMS entity
- workflow
- agent tool/action

### Legendary configuration

Keep Legendary-specific behavior primarily in configuration and domain composition:

- brands
- terminology
- navigation
- roles
- services
- forms
- policies
- dashboards
- workflows
- integrations
- branding

### Custom module threshold

Create a Legendary-specific module only when the business behavior is genuinely unique and cannot be expressed cleanly through reusable primitives/configuration.

### Permission law

Every user-facing read/action and every Agent Sam action must resolve tenant, business-unit scope, membership, and capabilities before access.

### AI law

AI improves speed and usability; it must not be the only path for ordinary business operations. Core workflows require deterministic UI/action paths.

## Deliberate non-goals for the first build

The first build should not attempt to fully replace every specialized provider or implement every possible ERP function. It should establish the unified Legendary experience and the data/workflow primitives that let those capabilities be added intentionally.

Avoid:

- giant permission matrices before roles are understood;
- speculative modules with no Richard/employee workflow behind them;
- developer-facing controls in the customer UI;
- exposing IAM/MovieMode infrastructure;
- disconnected features that do not participate in an end-to-end loop;
- brand-specific duplication of shared customer/person/property records.

## Product test

Before adding a feature, ask:

1. What real interruption, delay, duplicate entry, question, or administrative burden does this remove?
2. Who uses it?
3. What business object should it belong to?
4. Can Agent Sam understand and act on it safely?
5. Can the workflow be completed without AI?
6. Is the underlying primitive reusable beyond Legendary?
7. Does this make the owner/employee/customer experience meaningfully simpler?

If those answers are unclear, the feature probably is not ready to build.
