import { cmsCapabilityRequiresApproval, isCmsCapabilityAllowed } from '../contracts/capabilities';
import type { CmsBlock, CmsPage, CmsPageTree, CmsSection } from './domain';
import { createLegendaryCmsRegistry, type CmsRegistry } from './registry';
import { randomCmsIds, systemCmsClock, type CmsClock, type CmsIdFactory, type CmsRequestContext, type CmsStore } from './store';

export class CmsForbiddenError extends Error {}
export class CmsApprovalRequiredError extends Error {}
export class CmsNotFoundError extends Error {}
export class CmsValidationError extends Error {
  constructor(public readonly errors: string[]) { super(errors.join('; ')); }
}

export type CmsServiceOptions = {
  registry?: CmsRegistry;
  ids?: CmsIdFactory;
  clock?: CmsClock;
};

export class CmsService {
  readonly registry: CmsRegistry;
  readonly ids: CmsIdFactory;
  readonly clock: CmsClock;

  constructor(readonly store: CmsStore, options: CmsServiceOptions = {}) {
    this.registry = options.registry ?? createLegendaryCmsRegistry();
    this.ids = options.ids ?? randomCmsIds;
    this.clock = options.clock ?? systemCmsClock;
  }

  require(ctx: CmsRequestContext, capability: string, approved = false) {
    if (!isCmsCapabilityAllowed(capability) || !ctx.capabilities.includes(capability)) {
      throw new CmsForbiddenError(`Missing CMS capability: ${capability}`);
    }
    if (cmsCapabilityRequiresApproval(capability) && !approved) {
      throw new CmsApprovalRequiredError(`Approval required: ${capability}`);
    }
  }

  async listPages(ctx: CmsRequestContext, siteId: string) {
    this.require(ctx, 'page.list');
    const site = await this.store.getSite(siteId);
    if (!site || site.organizationId !== ctx.organizationId || !ctx.brandIds.includes(site.brandId)) {
      throw new CmsNotFoundError('Site not found');
    }
    return this.store.listPages(siteId);
  }

  async createPage(ctx: CmsRequestContext, siteId: string, input: Pick<CmsPage, 'title' | 'route' | 'pageType'> & Partial<Pick<CmsPage, 'seoTitle' | 'seoDescription' | 'parentId'>>) {
    this.require(ctx, 'page.create');
    const site = await this.store.getSite(siteId);
    if (!site || site.organizationId !== ctx.organizationId || !ctx.brandIds.includes(site.brandId)) throw new CmsNotFoundError('Site not found');
    const now = this.clock.now();
    const page: CmsPage = {
      id: this.ids.id('page'), siteId, title: input.title.trim(), route: normalizeRoute(input.route), pageType: input.pageType || 'standard',
      status: 'draft', parentId: input.parentId ?? null, seoTitle: input.seoTitle ?? input.title, seoDescription: input.seoDescription ?? '', createdAt: now, updatedAt: now,
    };
    if (!page.title) throw new CmsValidationError(['Page title is required']);
    return this.store.createPage(page);
  }

  async updatePage(ctx: CmsRequestContext, pageId: string, patch: Partial<Pick<CmsPage, 'title' | 'route' | 'pageType' | 'seoTitle' | 'seoDescription' | 'parentId'>>) {
    this.require(ctx, 'page.update');
    const current = await this.authorizedPage(ctx, pageId);
    const next: CmsPage = { ...current, ...patch, route: patch.route ? normalizeRoute(patch.route) : current.route, updatedAt: this.clock.now() };
    if (!next.title.trim()) throw new CmsValidationError(['Page title is required']);
    return this.store.updatePage(next);
  }

  async archivePage(ctx: CmsRequestContext, pageId: string, approved = false) {
    this.require(ctx, 'page.archive', approved);
    const current = await this.authorizedPage(ctx, pageId);
    return this.store.updatePage({ ...current, status: 'archived', updatedAt: this.clock.now() });
  }

  async createSection(ctx: CmsRequestContext, pageId: string, input: Pick<CmsSection, 'type' | 'name' | 'zone' | 'data'>) {
    this.require(ctx, 'section.create');
    await this.authorizedPage(ctx, pageId);
    const validation = this.registry.validate('section', input.type, input.data);
    if (!validation.ok) throw new CmsValidationError(validation.errors);
    const siblings = await this.store.listSections(pageId);
    return this.store.createSection({ id: this.ids.id('section'), pageId, type: input.type, name: input.name, zone: input.zone, visible: true, sortOrder: siblings.length, data: input.data });
  }

  async updateSection(ctx: CmsRequestContext, section: CmsSection) {
    this.require(ctx, 'section.update');
    await this.authorizedPage(ctx, section.pageId);
    const validation = this.registry.validate('section', section.type, section.data);
    if (!validation.ok) throw new CmsValidationError(validation.errors);
    return this.store.updateSection(section);
  }

  async removeSection(ctx: CmsRequestContext, section: CmsSection, approved = false) {
    this.require(ctx, 'section.remove', approved);
    await this.authorizedPage(ctx, section.pageId);
    await this.store.deleteSection(section.id);
  }

  async createBlock(ctx: CmsRequestContext, section: CmsSection, input: Pick<CmsBlock, 'type' | 'data'>) {
    this.require(ctx, 'block.create');
    await this.authorizedPage(ctx, section.pageId);
    const validation = this.registry.validate('block', input.type, input.data);
    if (!validation.ok) throw new CmsValidationError(validation.errors);
    const siblings = await this.store.listBlocks(section.id);
    return this.store.createBlock({ id: this.ids.id('block'), sectionId: section.id, type: input.type, visible: true, sortOrder: siblings.length, data: input.data });
  }

  async updateBlock(ctx: CmsRequestContext, section: CmsSection, block: CmsBlock) {
    this.require(ctx, 'block.update');
    await this.authorizedPage(ctx, section.pageId);
    const validation = this.registry.validate('block', block.type, block.data);
    if (!validation.ok) throw new CmsValidationError(validation.errors);
    return this.store.updateBlock(block);
  }

  async removeBlock(ctx: CmsRequestContext, section: CmsSection, blockId: string, approved = false) {
    this.require(ctx, 'block.remove', approved);
    await this.authorizedPage(ctx, section.pageId);
    await this.store.deleteBlock(blockId);
  }

  async publishPage(ctx: CmsRequestContext, pageId: string, approved = false): Promise<CmsPageTree> {
    this.require(ctx, 'publish.page', approved);
    const page = await this.authorizedPage(ctx, pageId);
    const tree = await this.store.getPageTree(pageId);
    if (!tree) throw new CmsNotFoundError('Page tree not found');
    this.validateTree(tree);
    const current = await this.store.getPublishedPage(pageId);
    await this.store.createRevision({ id: this.ids.id('revision'), siteId: page.siteId, pageId, kind: 'publish', snapshot: current, actorId: ctx.actorId, createdAt: this.clock.now() });
    await this.store.setPublishedPage(pageId, { ...tree, status: 'published' });
    await this.store.updatePage({ ...page, status: 'published', updatedAt: this.clock.now() });
    return { ...tree, status: 'published' };
  }

  private validateTree(tree: CmsPageTree) {
    const errors: string[] = [];
    for (const section of tree.sections) {
      const sectionCheck = this.registry.validate('section', section.type, section.data);
      if (!sectionCheck.ok) errors.push(...sectionCheck.errors.map((e) => `${section.name}: ${e}`));
      for (const block of section.blocks) {
        const blockCheck = this.registry.validate('block', block.type, block.data);
        if (!blockCheck.ok) errors.push(...blockCheck.errors.map((e) => `${block.type}: ${e}`));
      }
    }
    if (errors.length) throw new CmsValidationError(errors);
  }

  private async authorizedPage(ctx: CmsRequestContext, pageId: string) {
    const page = await this.store.getPage(pageId);
    if (!page) throw new CmsNotFoundError('Page not found');
    const site = await this.store.getSite(page.siteId);
    if (!site || site.organizationId !== ctx.organizationId || !ctx.brandIds.includes(site.brandId)) throw new CmsNotFoundError('Page not found');
    return page;
  }
}

export function normalizeRoute(value: string) {
  const route = `/${String(value || '').trim().replace(/^\/+|\/+$/g, '')}`;
  return route === '/' ? route : route.toLowerCase().replace(/\s+/g, '-');
}
