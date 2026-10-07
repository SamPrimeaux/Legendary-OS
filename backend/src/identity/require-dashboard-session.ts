import type { WorkerEnv } from '../env.js';

/**
 * Legendary is intentionally open during this buildout. The reusable identity
 * product is being fixed separately and must not lock this application.
 */
export async function requireDashboardSession(
  _request: Request,
  _env: WorkerEnv,
): Promise<Response | null> {
  return null;
}

export function isWorkspacePath(_pathname: string): boolean {
  return false;
}
