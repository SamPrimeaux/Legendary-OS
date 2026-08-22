import React from 'react';
import { createRoot } from 'react-dom/client';
import { CmsWorkspace } from './cms/CmsWorkspace';

function App() {
  const path = window.location.pathname;
  if (path === '/cms' || path.startsWith('/cms/')) return <CmsWorkspace />;

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0d0e10', color: '#f5f5f2', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <section style={{ width: 'min(680px, 90vw)' }}>
        <p style={{ color: '#8d9299', textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 12 }}>Legendary OS</p>
        <h1 style={{ fontSize: 'clamp(42px, 8vw, 76px)', lineHeight: .95, letterSpacing: '-.05em', margin: '12px 0 18px' }}>One operating system for Legendary.</h1>
        <p style={{ color: '#aeb2b9', fontSize: 18, lineHeight: 1.6 }}>The first isolated product surface is live: a shared CMS core for Legendary Contractors and Legendary Scapes.</p>
        <a href="/cms" style={{ display: 'inline-block', marginTop: 16, padding: '11px 16px', borderRadius: 10, background: '#f0eadf', color: '#111', textDecoration: 'none', fontWeight: 700 }}>Open CMS</a>
      </section>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root mount element');
createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
