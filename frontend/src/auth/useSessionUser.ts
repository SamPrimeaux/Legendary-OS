import type { SessionUser } from './sessionUser';

export function useSessionUser(): { user: SessionUser | null; loading: boolean } {
  return { user: null, loading: false };
}
