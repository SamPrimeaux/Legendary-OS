import React, { useEffect, useRef, useState } from 'react';

export function DemoNavigation({ brandId }: { brandId: string }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="lc-demo-nav" ref={container}>
    <button ref={trigger} className="lc-demo-trigger" type="button" aria-label="Switch Legendary website or open dashboard" aria-expanded={open} aria-controls="legendary-demo-links" onClick={() => setOpen(value => !value)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
      <span>Legendary</span>
    </button>
    {open ? <nav id="legendary-demo-links" className="lc-demo-links" aria-label="Legendary websites">
      <span className="lc-demo-caption">Explore Legendary</span>
      <a href="/" aria-current={brandId === 'contractors' ? 'page' : undefined}><strong>Contractors</strong><small>Homes & construction</small></a>
      <a href="/scapes/" aria-current={brandId === 'scapes' ? 'page' : undefined}><strong>Scapes</strong><small>Landscape & outdoor living</small></a>
      <a className="lc-demo-dashboard" href={`/dashboard/cms?site=${brandId === 'scapes' ? 'site_scapes' : 'site_contractors'}`}><strong>Dashboard</strong><small>Sign in to your workspace</small></a>
    </nav> : null}
  </div>;
}
