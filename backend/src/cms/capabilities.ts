// Adapted from inneranimalmedia/src/core/agentsam/cms/contracts/capabilities.js
// Source commit observed during transplant: 2488d96513482dceffa97477cd829910e13a3cea

export type CmsCapabilityRisk = 'read' | 'write' | 'destructive' | 'publish';
export type CmsCapabilityDefinition = { key: string; risk: CmsCapabilityRisk; resource: string };

const DEFINITIONS: Array<[string, CmsCapabilityRisk, string]> = [
  ['site.read', 'read', 'site'],
  ['page.list', 'read', 'page'],
  ['page.read', 'read', 'page'],
  ['page.create', 'write', 'page'],
  ['page.update', 'write', 'page'],
  ['page.archive', 'destructive', 'page'],
  ['page.restore', 'write', 'page'],
  ['section.list', 'read', 'section'],
  ['section.read', 'read', 'section'],
  ['section.create', 'write', 'section'],
  ['section.update', 'write', 'section'],
  ['section.reorder', 'write', 'section'],
  ['section.remove', 'destructive', 'section'],
  ['block.list', 'read', 'block'],
  ['block.read', 'read', 'block'],
  ['block.create', 'write', 'block'],
  ['block.update', 'write', 'block'],
  ['block.reorder', 'write', 'block'],
  ['block.remove', 'destructive', 'block'],
  ['asset.list', 'read', 'asset'],
  ['asset.read', 'read', 'asset'],
  ['theme.read', 'read', 'theme'],
  ['theme.update', 'write', 'theme'],
  ['preview.read', 'read', 'preview'],
  ['revision.list', 'read', 'revision'],
  ['revision.restore', 'destructive', 'revision'],
  ['publish.page', 'publish', 'page'],
  ['publish.verify', 'read', 'page'],
];

export const CMS_CAPABILITIES = Object.freeze(Object.fromEntries(
  DEFINITIONS.map(([key, risk, resource]) => [key, Object.freeze({ key, risk, resource })]),
) as Record<string, CmsCapabilityDefinition>);

export const CMS_CAPABILITY_KEYS = Object.freeze(Object.keys(CMS_CAPABILITIES));

export function getCmsCapability(key: string) {
  return CMS_CAPABILITIES[String(key || '').trim()] || null;
}

export function isCmsCapabilityAllowed(key: string) {
  return getCmsCapability(key) != null;
}

export function cmsCapabilityRequiresApproval(key: string) {
  const risk = getCmsCapability(key)?.risk;
  return risk === 'destructive' || risk === 'publish';
}

export function buildCmsCapabilityManifest() {
  return CMS_CAPABILITY_KEYS.map((key) => CMS_CAPABILITIES[key]);
}
