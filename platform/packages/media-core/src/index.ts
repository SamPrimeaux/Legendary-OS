export interface MediaAsset {
  key: string;
  filename: string;
  mime: string;
  bytes: number;
  alt: string;
  storageKey: string;
  checksumSha256?: string;
}

export const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Stable, human-readable media key: `<folder>/<name>`. Referenced from content by key, never by URL. */
export const mediaKey = (folder: string, name: string): string => `${slugify(folder)}/${slugify(name)}`;

/** R2 object key. Prefixed by site so one bucket can never mix tenants. */
export const storageKey = (siteKey: string, key: string, checksum?: string): string =>
  `sites/${siteKey}/${key}${checksum ? `.${checksum.slice(0, 12)}` : ""}`;
