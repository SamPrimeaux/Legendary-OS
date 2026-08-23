/**
 * Reference types for IAM dashboard baseline transplant.
 * Legendary runtime CMS lives in frontend/src/cms/ — not these files.
 */
export type CmsWorkspaceSite = {
  slug: string;
  name?: string | null;
  domain?: string | null;
  hub_priority?: number | null;
  is_featured?: boolean | null;
};

export type CmsWorkspaceContext = {
  siteSlug?: string | null;
  siteName?: string | null;
};

export function useCmsWorkspaceContext(_opts?: unknown): {
  context: CmsWorkspaceContext | null;
  loading: boolean;
  error: string | null;
  persistSite: (site: CmsWorkspaceSite) => Promise<void>;
  reload: () => Promise<void>;
} {
  throw new Error('inneranimalmedia_baseline_reference_only');
}

export function normalizeCmsSitesList(sites: CmsWorkspaceSite[]): CmsWorkspaceSite[] {
  return sites;
}
