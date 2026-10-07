import React from 'react';
import { createHttpWorkHost } from '@inneranimalmedia/agentsam-work/client';
import { WorkProduct } from '@inneranimalmedia/agentsam-work/frontend';
import type { WorkSurfaceId } from '@inneranimalmedia/agentsam-work/contracts';
import '@inneranimalmedia/agentsam-work/theme.css';

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

export function LegendaryWorkPage() {
  const state = routeState();

  return (
    <div style={{ minHeight: '100dvh', height: '100dvh' }}>
      <WorkProduct
        host={host}
        surface={state.surface}
        projectId={state.projectId}
        ticketId={state.ticketId}
        onNavigate={(href) => window.location.assign(href)}
      />
    </div>
  );
}
