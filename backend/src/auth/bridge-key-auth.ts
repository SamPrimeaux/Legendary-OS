/**
 * Inbound verify — AGENTSAM_BRIDGE_KEY + legacy request header aliases only.
 * SSOT: inneranimalmedia/backend/auth/bridge-key-auth.js
 */
import { isBridgeKeyProvisioned, trimSecret, type MachineAuthEnv } from './machine-auth-env.js';

export type { MachineAuthEnv } from './machine-auth-env.js';

export function presentedMachineAuthCredentials(request: Request): string[] {
  const auth = request.headers.get('Authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const vals = [
    bearer,
    request.headers.get('X-Internal-Secret'),
    request.headers.get('X-Ingest-Secret'),
    request.headers.get('X-IAM-Service-Key'),
    request.headers.get('X-ExecOS-Key'),
  ]
    .map(trimSecret)
    .filter(Boolean);
  return [...new Set(vals)];
}

export function verifyBridgeKey(request: Request, env: MachineAuthEnv): boolean {
  const expected = trimSecret(env.AGENTSAM_BRIDGE_KEY);
  if (!expected) return false;
  const presented = presentedMachineAuthCredentials(request);
  if (!presented.length) return false;
  return presented.includes(expected);
}

export { isBridgeKeyProvisioned };
