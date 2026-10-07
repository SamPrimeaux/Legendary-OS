import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { greetingName, timeGreeting } from './auth/sessionUser';
import { useSessionUser } from './auth/useSessionUser';
import { AppShell } from './shell/AppShell';
import { PublicCmsPage } from './site/PublicCmsPage';

// Public visitors should not download the CMS and media editor to view a site.
const LegendaryCmsApp = lazy(() => import('./cms/LegendaryCmsApp').then(module => ({ default: module.LegendaryCmsApp })));
const ContentStudioPage = lazy(() => import('./content/ContentStudioPage').then(module => ({ default: module.ContentStudioPage })));
const MediaWorkspace = lazy(() => import('./media/pages/MediaWorkspace').then(module => ({ default: module.MediaWorkspace })));
const MediaAssetPage = lazy(() => import('./media/pages/MediaAssetPage').then(module => ({ default: module.MediaAssetPage })));

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <section style={{ padding: 'clamp(18px, 4vw, 38px)', maxWidth: 960 }}>
      <p style={{ margin: 0, color: '#0f8f83', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' }}>Legendary OS</p>
      <h1 style={{ margin: '8px 0 10px', fontSize: 'clamp(28px, 5vw, 44px)', letterSpacing: '-.04em' }}>{title}</h1>
      <p style={{ margin: 0, maxWidth: 620, color: '#6d726f', fontSize: 15, lineHeight: 1.6 }}>{description}</p>
    </section>
  );
}

function DashboardHome() {
  const { user } = useSessionUser();
  const greeting = user ? `${timeGreeting()}, ${greetingName(user)}.` : `${timeGreeting()}.`;
  return (
    <AppShell title="Home">
      <Placeholder title={greeting} description="Legendary OS surfaces the work, customers, people and follow-ups that need attention without making you hunt through separate systems." />
    </AppShell>
  );
}

function CadWorkspace() {
  return (
    <AppShell title="CAD Lab" section="Legendary OS">
      <iframe
        className="los-cad-frame"
        src="/cad-lab/index.html?embedded=1"
        title="Legendary OS CAD Lab"
      />
    </AppShell>
  );
}

function App() {
  const path = window.location.pathname;

  if (path === '/') {
    return <PublicCmsPage siteKey="site_contractors" route="/" />;
  }

  if (path === '/dashboard' || path === '/dashboard/') {
    window.location.replace('/dashboard/cms');
    return null;
  }

  const publicSite = path.match(/^\/site\/([^/]+)(\/.*)?$/);
  if (publicSite) {
    const siteKey = decodeURIComponent(publicSite[1]);
    const route = publicSite[2] || '/';
    return <PublicCmsPage siteKey={siteKey} route={route} basePath={`/site/${encodeURIComponent(siteKey)}`} />;
  }

  if (path === '/scapes' || path.startsWith('/scapes/')) {
    const route = path.slice('/scapes'.length) || '/';
    return <PublicCmsPage siteKey="site_scapes" route={route} />;
  }

  if (path === '/cms' || path.startsWith('/cms/')) {
    const suffix = path.slice('/cms'.length);
    window.location.replace(`/dashboard/cms${suffix}`);
    return null;
  }

  if (path === '/dashboard/cms' || path.startsWith('/dashboard/cms/')) {
    return (
      <AppShell title="Websites" section="Legendary OS">
        <LegendaryCmsApp />
      </AppShell>
    );
  }

  if (path === '/dashboard/cad' || path.startsWith('/dashboard/cad/')) {
    return <CadWorkspace />;
  }

  if (path === '/content' || path === '/content/') {
    return <AppShell title="Content" section="Legendary OS"><ContentStudioPage /></AppShell>;
  }

  if (path === '/media' || path === '/media/') {
    return <AppShell title="Media"><MediaWorkspace /></AppShell>;
  }

  const mediaAsset = path.match(/^\/media\/([^/]+)$/);
  if (mediaAsset) {
    return <AppShell title="Media"><MediaAssetPage assetId={decodeURIComponent(mediaAsset[1])} /></AppShell>;
  }

  if (path.startsWith('/leads')) {
    return <AppShell title="Leads"><Placeholder title="Leads" description="Lead intake, ownership, follow-up and conversion will live here." /></AppShell>;
  }

  if (path.startsWith('/projects')) {
    return <AppShell title="Projects"><Placeholder title="Projects" description="Jobs, field updates, files, media and customer progress will live here." /></AppShell>;
  }

  if (path.startsWith('/team')) {
    return <AppShell title="Team"><Placeholder title="Team" description="Employees, roles, requests, guidance and people operations will live here." /></AppShell>;
  }

  return <PublicCmsPage siteKey="site_contractors" route={path} />;
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root mount element');
createRoot(root).render(<React.StrictMode><Suspense fallback={<div role="status" style={{ padding: 24 }}>Loading workspace…</div>}><App /></Suspense></React.StrictMode>);
