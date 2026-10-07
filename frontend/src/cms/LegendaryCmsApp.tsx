import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CmsHubPage } from '@inneranimalmedia/ecommerce-cms-agentsam/cms';
import type { CmsWorkspaceSite } from '@inneranimalmedia/client-cms-editor';
import { CmsWorkspace } from './CmsWorkspace';
import './iamShell.css';

type LegendarySiteRow = {
  id?: string;
  name?: string;
  domain?: string | null;
  brand_id?: string;
  brandId?: string;
};

type HubState = {
  sites: CmsWorkspaceSite[];
  loading: boolean;
  error: string | null;
};

function siteRowToWorkspace(row: LegendarySiteRow): CmsWorkspaceSite {
  const slug = String(row.id || row.brand_id || row.brandId || '').trim();
  const brand = String(row.brand_id || row.brandId || '').trim();
  return {
    slug,
    name: String(row.name || slug),
    domain: row.domain ? String(row.domain) : undefined,
    project_id: slug,
    storefront_url:
      brand === 'scapes' ? '/scapes/' :
      brand === 'contractors' ? '/' :
      undefined,
    status: 'active',
  };
}

function normalizeActiveSite(sites: CmsWorkspaceSite[], requested: string | null) {
  if (requested && sites.some((site) => site.slug === requested)) return requested;
  const stored = window.localStorage.getItem('legendary.cms.site');
  if (stored && sites.some((site) => site.slug === stored)) return stored;
  return sites.find((site) => site.slug === 'site_contractors')?.slug || sites[0]?.slug || null;
}

function packagePathToLegendary(path: string) {
  const url = new URL(path, window.location.origin);
  const site = url.searchParams.get('site') || 'site_contractors';
  const panel = url.pathname.split('/').filter(Boolean).at(-1) || '';

  const view =
    panel === 'pages' ? 'content' :
    panel === 'media' ? 'media' :
    panel === 'theme-editor' ? 'theme' :
    panel === 'templates' ? 'templates' :
    panel === 'online-store' ? 'overview' :
    '';

  const query = new URLSearchParams();
  query.set('site', site);
  if (view) query.set('view', view);
  return `/dashboard/cms?${query.toString()}`;
}

export function LegendaryCmsApp() {
  const initial = useMemo(() => new URLSearchParams(window.location.search), []);
  const requestedView = initial.get('view');

  // Existing Legendary authoring remains the stronger editor until the shared
  // CMS package's host-renderer extension ships. The root hub is already the
  // published reusable AgentSam CMS product.
  if (requestedView) return <CmsWorkspace />;

  const [hub, setHub] = useState<HubState>({ sites: [], loading: true, error: null });
  const [activeSiteSlug, setActiveSiteSlug] = useState<string | null>(initial.get('site'));

  const load = useCallback(async () => {
    setHub((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await fetch('/api/cms/sites');
      const body = await response.json().catch(() => ({})) as { sites?: LegendarySiteRow[]; error?: string };
      if (!response.ok) throw new Error(body.error || `CMS sites failed (${response.status})`);
      const sites = (body.sites || []).map(siteRowToWorkspace).filter((site) => site.slug);
      setHub({ sites, loading: false, error: null });
      setActiveSiteSlug((current) => normalizeActiveSite(sites, current));
    } catch (error) {
      setHub({
        sites: [],
        loading: false,
        error: error instanceof Error ? error.message : 'CMS sites unavailable',
      });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectSite = useCallback((slug: string) => {
    setActiveSiteSlug(slug);
    window.localStorage.setItem('legendary.cms.site', slug);
    const query = new URLSearchParams(window.location.search);
    query.set('site', slug);
    query.delete('view');
    window.history.replaceState(null, '', `/dashboard/cms?${query.toString()}`);
  }, []);

  return (
    <CmsHubPage
      context={{
        project_id: 'legendary-os',
        project_slug: 'legendary-os',
        project_name: 'Legendary OS',
        ui_label: 'Websites',
      }}
      sites={hub.sites}
      activeSiteSlug={activeSiteSlug}
      loading={hub.loading}
      error={hub.error}
      onRetry={() => { void load(); }}
      onSelectSite={(slug) => { selectSite(slug); }}
      onNavigate={(path) => { window.location.assign(packagePathToLegendary(path)); }}
    />
  );
}
