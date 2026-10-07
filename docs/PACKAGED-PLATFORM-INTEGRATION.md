# Legendary OS — packaged AgentSam platform integration

Status: implementation branch feat/packaged-platform-integration-20261007

## Product boundary

Legendary OS is a **customer/host application** for reusable Inner Animal Media / AgentSam products. It must not become a second authority for generic CMS, content-studio, shell, campaign, Work, or media-product mechanics.

Legendary owns:
- Legendary Contractors + Legendary Scapes business identity/content;
- the existing D1/R2/KV/Worker resources;
- host auth/permissions;
- business-specific domains such as leads, customers, properties, jobs/projects, people, products and communications;
- thin adapters from those authorities into reusable products;
- site-specific presentation while it is being promoted into reusable section/theme packages.

Reusable packages own generic product behavior and UI.

## Proven package consumers

### Websites / CMS

/dashboard/cms mounts the published @inneranimalmedia/ecommerce-cms-agentsam CmsHubPage.

The hub reads existing Legendary authorities:
- /api/cms/sites
- /api/cms/bootstrap
- /api/cms/activity

bootstrap and activity are read models only. They do not create a new persistence model.

The current CmsWorkspace remains the site-specific authoring surface after a hub action because it already has stronger exact-page preview, navigation/theme editing and Legendary media integration than the currently published CMS editor.

The SDK promotion branch feat/cms-host-preview-20261007 adds a host-owned real-preview renderer to @inneranimalmedia/client-cms-editor. Once released, Legendary can move the authoring canvas behind the package without losing site parity.

### Content Studio

/content mounts the published @inneranimalmedia/agentsam-content-studio.

Its ContentStore is LegendaryMediaContentStore, a thin adapter over the existing /api/media/* routes:
- reads media_assets;
- reads media_asset_usages;
- uploads through the existing R2 media service;
- writes metadata back to the same media row;
- stores Content revision receipts inside existing media metadata;
- paginates the media authority by stable cursor/offset.

/media remains the provider/storage/import operations surface. Content Studio and Media operate on the same asset identities.

## Intentionally not mounted yet

Do not present package availability as product integration without a real host authority.

- @inneranimalmedia/agentsam-work: available, but current agentsam_tickets are implementation/remaster tickets and agentsam_project_context is agent runtime context. Neither is the Legendary customer/job/project authority.
- Products/orders: no clean Legendary product/order domain authority exists yet.
- Mailing/campaign execution: campaign intelligence packages exist, but Legendary does not yet have a canonical audience/message/delivery authority.
- shared nav/workbench: evaluated but not mounted in this pass because the current Legendary shell has useful mobile behavior that must be preserved before replacement.

When those domains are introduced, add the business authority first, then mount the reusable product through an adapter. Do not create placeholder data and call it package proof.

## No database migration in this integration

This integration adds no D1 tables and no customer data migrations.

CMS hub compatibility endpoints project existing tables. Content Studio projects existing media tables. Schema changes belong to deliberate domain migrations; customer/site data belongs to import/bootstrap/runtime flows, not migrations.

## Acceptance

A reusable-product proof is valid only when:
1. the installed published package is imported by Legendary;
2. the package reads/writes Legendary's canonical authority;
3. no local shadow store or fixture substitutes for missing data;
4. existing public-site behavior does not regress;
5. package/admin code stays out of the public-site bundle path;
6. build, TypeScript, Worker dry-run, and integration tests pass.
