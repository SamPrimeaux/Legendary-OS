import React, { useMemo } from 'react';
import { ContentStudio } from '@inneranimalmedia/agentsam-content-studio';
import { useSessionUser } from '../auth/useSessionUser';
import { createLegendaryContentRuntime } from './legendaryContentRuntime';

export function ContentStudioPage() {
  const { user, loading } = useSessionUser();
  const runtime = useMemo(
    () => createLegendaryContentRuntime(user?.id || 'legendary-session'),
    [user?.id],
  );

  if (loading) {
    return <div style={{ padding: 24 }}>Loading content workspace…</div>;
  }

  return (
    <div style={{ minHeight: 'calc(100dvh - 56px)', height: 'calc(100dvh - 56px)' }}>
      <ContentStudio runtime={runtime} showAssistant={false} />
    </div>
  );
}
