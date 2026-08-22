export type CmsSiteSummaryDto = {
  id: string;
  organizationId: string;
  brandId: string;
  name: string;
  domain: string | null;
  themeId: string | null;
};

export type CmsPageSummaryDto = {
  id: string;
  siteId: string;
  title: string;
  route: string;
  pageType: string;
  status: string;
  seo: {
    title: string | null;
    description: string | null;
  };
};

export type CmsSectionDto = {
  id: string;
  type: string;
  name: string;
  zone: string;
  visible: boolean;
  sortOrder: number;
  data: Record<string, unknown>;
  blocks: Array<Record<string, unknown>>;
};

export type CmsThemeDto = {
  id: string;
  name: string;
  tokens: Record<string, string | number>;
};

export type CmsNavLinkDto = { label: string; href: string };

export type GlobalCmsNavDto = {
  id: string;
  siteId: string;
  brand: {
    mark?: string;
    name: string;
    sublabel?: string;
    homeHref: string;
  };
  header: {
    links: CmsNavLinkDto[];
    utilityLinks?: CmsNavLinkDto[];
    cta?: CmsNavLinkDto | null;
  };
  footer: {
    location?: string;
    phone?: string;
    phoneHref?: string;
    links: CmsNavLinkDto[];
    note?: string;
  };
  updatedAt: number;
};

/**
 * Canonical read model used by every storefront renderer.
 * Public websites must render from this contract rather than directly from D1
 * rows or editor-only response shapes.
 */
export type CmsPublishedPageDto = {
  site: CmsSiteSummaryDto;
  page: CmsPageSummaryDto;
  sections: CmsSectionDto[];
  theme: CmsThemeDto | null;
};

export type CmsEditorPageDto = CmsPublishedPageDto & {
  capabilities: string[];
};
