/** Paths handled by @inneranimalmedia/agentsam-sdk identity worker-router. */
export function isIdentityRoute(pathname: string): boolean {
  if (pathname.startsWith('/api/auth')) return true;
  if (pathname.startsWith('/api/oauth')) return true;
  if (pathname === '/api/company') return true;
  if (pathname === '/auth/login' || pathname === '/auth/signup' || pathname === '/auth/reset') {
    return true;
  }
  if (pathname.startsWith('/shared/')) return true;
  return false;
}
