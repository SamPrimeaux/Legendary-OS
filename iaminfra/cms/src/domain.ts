export type CmsId = string;
export type CmsStatus = 'draft' | 'published' | 'archived';
export type CmsZone = 'HEADER' | 'BODY' | 'FOOTER' | 'TEMPLATE';

export type CmsSite = {
  id: CmsId;
  organizationId: string;
  brandId: string;
  name: string;
  domain: string | null;
  themeId: CmsId | null;
  createdAt: number;
  updatedAt: number;
};

export type CmsPage = {
  id: CmsId;
  siteId: CmsId;
  title: string;
  route: string;
  pageType: string;
  status: CmsStatus;
  parentId: CmsId | null;
  seoTitle: string;
  seoDescription: string;
  createdAt: number;
  updatedAt: number;
};

export type CmsSection = {
  id: CmsId;
  pageId: CmsId;
  type: string;
  name: string;
  zone: CmsZone;
  visible: boolean;
  sortOrder: number;
  data: Record<string, unknown>;
  r2Url?: string | null;
};

export type CmsBlock = {
  id: CmsId;
  sectionId: CmsId;
  type: string;
  visible: boolean;
  sortOrder: number;
  data: Record<string, unknown>;
};

export type CmsAsset = {
  id: CmsId;
  siteId: CmsId;
  filename: string;
  mimeType: string;
  size: number;
  altText: string;
  storageKey: string;
  labels: string[];
  createdAt: number;
};

export type CmsTheme = {
  id: CmsId;
  siteId: CmsId;
  name: string;
  tokens: Record<string, string | number>;
  updatedAt: number;
};

export type CmsRevision = {
  id: CmsId;
  siteId: CmsId;
  pageId: CmsId | null;
  kind: 'draft' | 'publish' | 'restore';
  snapshot: CmsPageTree | null;
  actorId: string;
  createdAt: number;
};

export type CmsPageTree = CmsPage & {
  sections: Array<CmsSection & { blocks: CmsBlock[] }>;
};

export type CmsSiteSnapshot = {
  site: CmsSite;
  pages: CmsPageTree[];
  theme: CmsTheme | null;
};
