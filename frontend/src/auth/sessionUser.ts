export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

export function userInitials(user: Pick<SessionUser, 'displayName' | 'email'>): string {
  const source = (user.displayName || user.email || '').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function greetingName(user: Pick<SessionUser, 'displayName' | 'email'>): string {
  const name = (user.displayName || '').trim();
  if (name) return name.split(/\s+/)[0] ?? name;
  return (user.email || '').split('@')[0] || 'there';
}

export function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export async function fetchSessionUser(): Promise<SessionUser | null> {
  const response = await fetch('/api/auth/me', { credentials: 'include' });
  const body = await response.json().catch(() => ({})) as {
    ok?: boolean;
    user?: SessionUser;
  };
  if (!response.ok || !body.ok || !body.user?.id) return null;
  return body.user;
}
