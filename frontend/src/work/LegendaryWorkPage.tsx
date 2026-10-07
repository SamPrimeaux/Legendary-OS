import React from 'react';
import { createHttpWorkHost } from '@inneranimalmedia/agentsam-work/client';
import { WorkProduct } from '@inneranimalmedia/agentsam-work/frontend';
import type { WorkSurfaceId } from '@inneranimalmedia/agentsam-work/contracts';
import '@inneranimalmedia/agentsam-work/theme.css';
import { AppShell } from '../shell/AppShell';
import './legendaryWork.css';

const host = createHttpWorkHost();

function routeState(): {
  surface: WorkSurfaceId;
  projectId?: string;
  ticketId?: string;
} {
  const pathname = window.location.pathname;
  const query = new URLSearchParams(window.location.search);

  if (pathname === '/collaborate' || pathname === '/collaborate/') {
    return {
      surface: query.get('seg') === 'tickets' ? 'tickets' : 'calendar',
    };
  }

  const ticket = pathname.match(/^\/artifacts\/tickets\/([^/]+)$/);
  if (ticket) {
    return {
      surface: 'artifact-tickets',
      ticketId: decodeURIComponent(ticket[1]),
    };
  }

  if (pathname === '/artifacts/tickets' || pathname === '/artifacts/tickets/') {
    return { surface: 'artifact-tickets' };
  }

  if (pathname === '/artifacts' || pathname === '/artifacts/') {
    return { surface: 'artifacts' };
  }

  if (pathname === '/mail' || pathname === '/mail/') {
    return { surface: 'mail' };
  }

  const project = pathname.match(/^\/projects\/([^/]+)$/);
  if (project) {
    return {
      surface: 'project-detail',
      projectId: decodeURIComponent(project[1]),
    };
  }

  return { surface: 'projects' };
}

function pageTitle(surface: WorkSurfaceId) {
  switch (surface) {
    case 'calendar': return 'Work';
    case 'tickets':
    case 'artifact-tickets': return 'Tickets';
    case 'mail': return 'Mail';
    case 'artifacts': return 'Artifacts';
    case 'project-detail': return 'Project';
    case 'projects':
    default: return 'Projects';
  }
}

export function LegendaryWorkPage() {
  const state = routeState();

  return (
    <AppShell title={pageTitle(state.surface)} section="Legendary OS">
      <div className="legendary-work-surface">
        <WorkProduct
          host={host}
          surface={state.surface}
          projectId={state.projectId}
          ticketId={state.ticketId}
          presentation="embedded"
          onNavigate={(href) => window.location.assign(href)}
        />
      </div>
    </AppShell>
  );
}
