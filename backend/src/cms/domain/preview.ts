import type { CmsPageTree, CmsTheme } from './domain';

export type CmsPreviewModel = {
  page: CmsPageTree;
  theme: CmsTheme | null;
  inspector: {
    pageId: string;
    sections: Array<{ id: string; blockIds: string[] }>;
  };
};

export function buildCmsPreviewModel(page: CmsPageTree, theme: CmsTheme | null): CmsPreviewModel {
  return {
    page: {
      ...page,
      sections: page.sections
        .filter((section) => section.visible)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((section) => ({
          ...section,
          blocks: section.blocks.filter((block) => block.visible).sort((a, b) => a.sortOrder - b.sortOrder),
        })),
    },
    theme,
    inspector: {
      pageId: page.id,
      sections: page.sections.map((section) => ({ id: section.id, blockIds: section.blocks.map((block) => block.id) })),
    },
  };
}

export function cmsPreviewCacheHeaders(mode: 'draft' | 'published') {
  return mode === 'draft'
    ? { 'cache-control': 'private, no-store' }
    : { 'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400' };
}
