import type { CmsAsset, CmsBlock, CmsPage, CmsPageTree, CmsRevision, CmsSection, CmsSite, CmsTheme } from './domain';
import type { CmsStore } from './store';

export class MemoryCmsStore implements CmsStore {
  sites = new Map<string, CmsSite>();
  pages = new Map<string, CmsPage>();
  sections = new Map<string, CmsSection>();
  blocks = new Map<string, CmsBlock>();
  assets = new Map<string, CmsAsset>();
  themes = new Map<string, CmsTheme>();
  revisions = new Map<string, CmsRevision>();
  published = new Map<string, CmsPageTree>();

  seed(input: { sites?: CmsSite[]; pages?: CmsPage[]; sections?: CmsSection[]; blocks?: CmsBlock[]; assets?: CmsAsset[]; themes?: CmsTheme[] }) {
    input.sites?.forEach((x) => this.sites.set(x.id, structuredClone(x)));
    input.pages?.forEach((x) => this.pages.set(x.id, structuredClone(x)));
    input.sections?.forEach((x) => this.sections.set(x.id, structuredClone(x)));
    input.blocks?.forEach((x) => this.blocks.set(x.id, structuredClone(x)));
    input.assets?.forEach((x) => this.assets.set(x.id, structuredClone(x)));
    input.themes?.forEach((x) => this.themes.set(x.siteId, structuredClone(x)));
    return this;
  }

  async getSite(id: string) { return clone(this.sites.get(id)); }
  async listPages(siteId: string) { return [...this.pages.values()].filter((x) => x.siteId === siteId).map(copy); }
  async getPage(id: string) { return clone(this.pages.get(id)); }
  async getPageTree(pageId: string) {
    const page = this.pages.get(pageId); if (!page) return null;
    const sections = [...this.sections.values()].filter((x) => x.pageId === pageId).sort(byOrder).map((section) => ({ ...copy(section), blocks: [...this.blocks.values()].filter((x) => x.sectionId === section.id).sort(byOrder).map(copy) }));
    return { ...copy(page), sections };
  }
  async createPage(page: CmsPage) { this.assertRouteUnique(page); this.pages.set(page.id, copy(page)); return copy(page); }
  async updatePage(page: CmsPage) { this.assertRouteUnique(page); this.pages.set(page.id, copy(page)); return copy(page); }
  async listSections(pageId: string) { return [...this.sections.values()].filter((x) => x.pageId === pageId).sort(byOrder).map(copy); }
  async createSection(section: CmsSection) { this.sections.set(section.id, copy(section)); return copy(section); }
  async updateSection(section: CmsSection) { this.sections.set(section.id, copy(section)); return copy(section); }
  async deleteSection(id: string) { this.sections.delete(id); for (const [blockId, block] of this.blocks) if (block.sectionId === id) this.blocks.delete(blockId); }
  async listBlocks(sectionId: string) { return [...this.blocks.values()].filter((x) => x.sectionId === sectionId).sort(byOrder).map(copy); }
  async createBlock(block: CmsBlock) { this.blocks.set(block.id, copy(block)); return copy(block); }
  async updateBlock(block: CmsBlock) { this.blocks.set(block.id, copy(block)); return copy(block); }
  async deleteBlock(id: string) { this.blocks.delete(id); }
  async listAssets(siteId: string) { return [...this.assets.values()].filter((x) => x.siteId === siteId).map(copy); }
  async getAsset(id: string) { return clone(this.assets.get(id)); }
  async getTheme(siteId: string) { return clone(this.themes.get(siteId)); }
  async saveTheme(theme: CmsTheme) { this.themes.set(theme.siteId, copy(theme)); return copy(theme); }
  async createRevision(revision: CmsRevision) { this.revisions.set(revision.id, copy(revision)); return copy(revision); }
  async listRevisions(pageId: string) { return [...this.revisions.values()].filter((x) => x.pageId === pageId).sort((a,b) => b.createdAt-a.createdAt).map(copy); }
  async setPublishedPage(pageId: string, tree: CmsPageTree) { this.published.set(pageId, copy(tree)); }
  async getPublishedPage(pageId: string) { return clone(this.published.get(pageId)); }

  private assertRouteUnique(page: CmsPage) {
    for (const other of this.pages.values()) {
      if (other.id !== page.id && other.siteId === page.siteId && other.route === page.route && other.status !== 'archived') throw new Error(`CMS route already exists: ${page.route}`);
    }
  }
}

function byOrder(a: { sortOrder: number }, b: { sortOrder: number }) { return a.sortOrder - b.sortOrder; }
function copy<T>(value: T): T { return structuredClone(value); }
function clone<T>(value: T | undefined): T | null { return value === undefined ? null : copy(value); }
