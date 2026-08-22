import React, { useMemo, useState } from 'react';
import './appShell.css';

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
  section?: string;
};

const Icon = ({ name }: { name: 'home' | 'leads' | 'projects' | 'media' | 'sites' | 'team' | 'more' | 'search' | 'bell' | 'sparkles' }) => {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'home') return <svg {...common}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/></svg>;
  if (name === 'leads') return <svg {...common}><circle cx="12" cy="8" r="3"/><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/><path d="M18 4v4M16 6h4"/></svg>;
  if (name === 'projects') return <svg {...common}><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M8 5V3h8v2M3 10h18"/></svg>;
  if (name === 'media') return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m5 17 4.2-4 3 2.8 2.5-2.3L19 17"/></svg>;
  if (name === 'sites') return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><circle cx="6.5" cy="6.5" r=".7" fill="currentColor" stroke="none"/><circle cx="9" cy="6.5" r=".7" fill="currentColor" stroke="none"/></svg>;
  if (name === 'team') return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.5-3.6 2.4-5.5 5.5-5.5s5 1.9 5.5 5.5"/><circle cx="17.2" cy="9" r="2.2"/><path d="M15.5 15.2c3.2-.4 5 1.1 5.5 4.8"/></svg>;
  if (name === 'more') return <svg {...common}><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>;
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>;
  if (name === 'bell') return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
  return <svg {...common}><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></svg>;
};

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', href: '/', icon: <Icon name="home" /> },
  { id: 'leads', label: 'Leads', href: '/leads', icon: <Icon name="leads" /> },
  { id: 'projects', label: 'Projects', href: '/projects', icon: <Icon name="projects" /> },
  { id: 'sites', label: 'Websites', href: '/cms', icon: <Icon name="sites" /> },
  { id: 'team', label: 'Team', href: '/team', icon: <Icon name="team" /> },
];

function activeNav(pathname: string): string {
  if (pathname === '/cms' || pathname.startsWith('/cms/')) return 'sites';
  if (pathname.startsWith('/leads')) return 'leads';
  if (pathname.startsWith('/projects')) return 'projects';
  if (pathname.startsWith('/team')) return 'team';
  return 'home';
}

export function AppShell({ children, title = 'Websites', section = 'Legendary OS' }: AppShellProps) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const active = useMemo(() => activeNav(window.location.pathname), []);

  const navigate = (href: string) => {
    if (href === window.location.pathname) return;
    window.location.href = href;
  };

  return (
    <div className="los-shell">
      <aside className="los-sidebar" aria-label="Legendary OS navigation">
        <button className="los-brand" type="button" onClick={() => navigate('/')}>
          <span className="los-brand-mark">L</span>
          <span className="los-brand-copy"><strong>Legendary</strong><small>Operating System</small></span>
        </button>

        <nav className="los-sidebar-nav">
          <p className="los-nav-label">Workspace</p>
          {navItems.map((item) => (
            <button key={item.id} type="button" className={`los-nav-item${active === item.id ? ' is-active' : ''}`} onClick={() => navigate(item.href)}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="los-sidebar-bottom">
          <button className="los-agent-card" type="button">
            <span className="los-agent-icon"><Icon name="sparkles" /></span>
            <span><strong>Agent Sam</strong><small>Ask anything</small></span>
          </button>
          <button className="los-user" type="button">
            <span className="los-avatar">RB</span>
            <span><strong>Richard</strong><small>Legendary</small></span>
            <Icon name="more" />
          </button>
        </div>
      </aside>

      <div className="los-stage">
        <header className="los-topbar">
          <div className="los-topbar-title">
            <span className="los-mobile-mark">L</span>
            <div><small>{section}</small><strong>{title}</strong></div>
          </div>

          <button className="los-search" type="button">
            <Icon name="search" /><span>Search Legendary</span><kbd>⌘ K</kbd>
          </button>

          <div className="los-topbar-actions">
            <button className="los-agent-pill" type="button"><Icon name="sparkles" /><span>Ask Sam</span></button>
            <button className="los-icon-button" type="button" aria-label="Notifications"><Icon name="bell" /><i /></button>
            <button className="los-top-avatar" type="button" aria-label="Account">RB</button>
          </div>
        </header>

        <main className="los-content">{children}</main>
      </div>

      <nav className="los-mobile-nav" aria-label="Primary navigation">
        {navItems.slice(0, 4).map((item) => (
          <button key={item.id} type="button" className={active === item.id ? 'is-active' : ''} onClick={() => navigate(item.href)}>
            {item.icon}<span>{item.label}</span>
          </button>
        ))}
        <button type="button" className={mobileMoreOpen ? 'is-active' : ''} onClick={() => setMobileMoreOpen((v) => !v)}>
          <Icon name="more" /><span>More</span>
        </button>
      </nav>

      {mobileMoreOpen ? (
        <div className="los-mobile-sheet-backdrop" onClick={() => setMobileMoreOpen(false)}>
          <section className="los-mobile-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="los-sheet-handle" />
            <div className="los-sheet-head"><strong>Legendary</strong><button onClick={() => setMobileMoreOpen(false)}>Done</button></div>
            <button className="los-sheet-action" onClick={() => navigate('/team')}><Icon name="team" /><span><strong>Team</strong><small>Employees, roles and people operations</small></span></button>
            <button className="los-sheet-action"><Icon name="sparkles" /><span><strong>Agent Sam</strong><small>Ask or take action across Legendary</small></span></button>
            <button className="los-sheet-action"><Icon name="bell" /><span><strong>Notifications</strong><small>Updates that need your attention</small></span></button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
