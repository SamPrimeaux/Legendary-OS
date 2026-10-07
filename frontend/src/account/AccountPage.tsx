import React, { useEffect, useState } from 'react';

type Me = {
  id: string;
  email: string;
  displayName: string;
  hasPassword?: boolean;
};

export default function AccountPage() {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch('/api/auth/me', { credentials: 'include' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as { user?: Me };
        if (response.ok && body.user) setUser(body.user);
      })
      .finally(() => setLoading(false));
  }, []);

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setStatus('');
    if (password.length < 8) {
      setStatus('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setStatus('The new passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(user?.hasPassword ? { currentPassword } : {}),
          password,
          confirmPassword: confirm,
        }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; hasPassword?: boolean };
      if (!response.ok) {
        const messages: Record<string, string> = {
          current_password_required: 'Enter your current password.',
          current_password_invalid: 'Your current password is incorrect.',
          password_too_short: 'Use at least 8 characters.',
          passwords_do_not_match: 'The new passwords do not match.',
          session_required: 'Your session expired. Sign in again.',
        };
        setStatus(messages[body.error || ''] || body.error || 'Could not update the password.');
        return;
      }
      setUser((current) => current ? { ...current, hasPassword: true } : current);
      setCurrentPassword('');
      setPassword('');
      setConfirm('');
      setStatus(user?.hasPassword ? 'Password updated.' : 'Local password created. You can now use email + password to sign in.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section style={{ padding: 28 }}>Loading account…</section>;
  }

  return (
    <section style={{ width: 'min(760px, 100%)', padding: 'clamp(18px, 4vw, 38px)', display: 'grid', gap: 22 }}>
      <div>
        <p style={{ margin: 0, color: '#0f8f83', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' }}>Legendary OS</p>
        <h1 style={{ margin: '8px 0 8px', fontSize: 'clamp(28px, 5vw, 42px)', letterSpacing: '-.04em' }}>Account</h1>
        <p style={{ margin: 0, color: '#6d726f' }}>Your identity and sign-in settings.</p>
      </div>

      <div style={{ border: '1px solid #e1e6e3', borderRadius: 18, background: '#fff', padding: 20, display: 'grid', gap: 10 }}>
        <strong>{user?.displayName || 'Account'}</strong>
        <span style={{ color: '#6d726f' }}>{user?.email}</span>
        <span style={{ fontSize: 13, color: user?.hasPassword ? '#087f5b' : '#a15c00' }}>
          {user?.hasPassword ? 'Email + password sign-in is configured.' : 'This account currently uses connected identity sign-in and has no local password.'}
        </span>
      </div>

      <form onSubmit={savePassword} style={{ border: '1px solid #e1e6e3', borderRadius: 18, background: '#fff', padding: 20, display: 'grid', gap: 14 }}>
        <div>
          <strong>{user?.hasPassword ? 'Change password' : 'Create a local password'}</strong>
          <p style={{ margin: '6px 0 0', color: '#6d726f', fontSize: 13, lineHeight: 1.5 }}>
            {user?.hasPassword
              ? 'Confirm your current password before replacing it.'
              : 'Because you authenticated through your connected identity, you can establish an email + password credential here.'}
          </p>
        </div>

        {user?.hasPassword ? (
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Current password
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ padding: '11px 12px', border: '1px solid #d6dcda', borderRadius: 10 }} />
          </label>
        ) : null}

        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          New password
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '11px 12px', border: '1px solid #d6dcda', borderRadius: 10 }} />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          Confirm new password
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ padding: '11px 12px', border: '1px solid #d6dcda', borderRadius: 10 }} />
        </label>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="submit" disabled={saving} style={{ border: 0, borderRadius: 10, padding: '11px 16px', background: '#111814', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            {saving ? 'Saving…' : user?.hasPassword ? 'Update password' : 'Create password'}
          </button>
          {status ? <span style={{ fontSize: 13, color: status.includes('created') || status.includes('updated') ? '#087f5b' : '#9b2c2c' }}>{status}</span> : null}
        </div>
      </form>
    </section>
  );
}
