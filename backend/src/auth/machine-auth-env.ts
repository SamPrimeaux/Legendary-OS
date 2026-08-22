/**
 * Machine auth env — AGENTSAM_BRIDGE_KEY only (fleet SSOT).
 * Inbound verify: backend/src/auth/bridge-key-auth.ts
 * Platform canonical: inneranimalmedia/backend/auth/bridge-key-auth.js
 */

export type MachineAuthEnv = {
  AGENTSAM_BRIDGE_KEY?: string;
};

export function trimSecret(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

export function isBridgeKeyProvisioned(env: MachineAuthEnv): boolean {
  return trimSecret(env.AGENTSAM_BRIDGE_KEY).length > 0;
}
