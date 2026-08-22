import React from 'react';
import { createRoot } from 'react-dom/client';
import { CmsWorkspace } from './cms/CmsWorkspace';
import { AppShell } from './shell/AppShell';
import { PublicCmsPage } from './site/PublicCmsPage';

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <section style={{ padding: 'clamp(18px, 4vw, 38px)', maxWidth: 960 }}>
      <p style={{ margin: 0, color: '#0f8f83', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' }}>Legendary OS</p>
      <h1 style={{ margin: '8px 0 10px', fontSize: 'clamp(28px, 5vw, 44px)', letterSpacing: '-.04em' }}>{title}</h1>
      <p style={{ margin: 0, maxWidth: 620, color: '#6d726f', fontSize: 15, lineHeight: 1.6 }}>{description}</p>
    </section>
  );
}

function App() {
  const path = window.location.pathname;

  const publicSite = path.match(/^\/site\/([^/]+)(\/.*)?$/);
  if (publicSite) {
    const siteKey = decodeURIComponent(publicSite[1]);
    const route = publicSite[2] || '/';
    return <PublicCmsPage siteKey={siteKey} route={route} />;
  }

  if (path === '/cms' || path.startsWith('/cms/')) {
    return (
      <AppShell title="Websites" section="Legendary OS">
        <CmsWorkspace />
      </AppShell>
    );
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

  return (
    <AppShell title="Home">
      <Placeholder title="Good evening, Richard." description="Legendary OS will surface the work, customers, people and follow-ups that need attention without making you hunt through separate systems." />
    </AppShell>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root mount element');
createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
