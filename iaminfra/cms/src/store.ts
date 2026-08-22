import type { CmsAsset, CmsBlock, CmsPage, CmsPageTree, CmsRevision, CmsSection, CmsSite, CmsTheme } from './domain';

export type CmsRequestContext = {
  organizationId: string;
  brandIds: string[];
  actorId: string;
  capabilities: string[];
};

export interface CmsStore {
  getSite(siteId: string): Promise<CmsSite | null>;
  listPages(siteId: string): Promise<CmsPage[]>;
  getPage(pageId: string): Promise<CmsPage | null>;
  getPageTree(pageId: string): Promise<CmsPageTree | null>;
  createPage(page: CmsPage): Promise<CmsPage>;
  updatePage(page: CmsPage): Promise<CmsPage>;
  listSections(pageId: string): Promise<CmsSection[]>;
  createSection(section: CmsSection): Promise<CmsSection>;
  updateSection(section: CmsSection): Promise<CmsSection>;
  deleteSection(sectionId: string): Promise<void>;
  listBlocks(sectionId: string): Promise<CmsBlock[]>;
  createBlock(block: CmsBlock): Promise<CmsBlock>;
  updateBlock(block: CmsBlock): Promise<CmsBlock>;
  deleteBlock(blockId: string): Promise<void>;
  listAssets(siteId: string): Promise<CmsAsset[]>;
  getAsset(assetId: string): Promise<CmsAsset | null>;
  getTheme(siteId: string): Promise<CmsTheme | null>;
  saveTheme(theme: CmsTheme): Promise<CmsTheme>;
  createRevision(revision: CmsRevision): Promise<CmsRevision>;
  listRevisions(pageId: string): Promise<CmsRevision[]>;
  setPublishedPage(pageId: string, tree: CmsPageTree): Promise<void>;
  getPublishedPage(pageId: string): Promise<CmsPageTree | null>;
}

export interface CmsIdFactory {
  id(prefix: 'page' | 'section' | 'block' | 'revision'): string;
}

export interface CmsClock {
  now(): number;
}

export const systemCmsClock: CmsClock = { now: () => Date.now() };
export const randomCmsIds: CmsIdFactory = {
  id: (prefix) => `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`,
};
