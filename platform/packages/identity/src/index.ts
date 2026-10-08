import type { Role } from "@inneranimalmedia/site-contracts";

export const PROVIDER = "inneranimalmedia" as const;

export interface Session { provider: typeof PROVIDER; subject: string; email?: string; displayName?: string }
export interface Member { id: string; role: Role; status: "invited" | "active" | "disabled" }

/** Implemented by an adapter over the inneranimalmedia identity service. */
export interface SessionResolver { resolve(req: Request): Promise<Session | null> }
