import type { BrandPack, CollectionItem, Globals, ThemeTokens } from "@inneranimalmedia/site-contracts";

export interface RenderCtx {
  brand: BrandPack;
  tokens: ThemeTokens;
  globals: Globals;
  collections: Record<string, CollectionItem[]>;
  /** Resolve a media key to a URL. Return null when unavailable (renders a placeholder). */
  media: (key: string | undefined) => string | null;
  /** Site-relative route of the page being rendered. */
  route: string;
  siteKey: string;
  /** Where this site is mounted in the deployment: "/" or "" for the root, "/blog", ... */
  basePath: string;
}
