declare module '@inneranimalmedia/agentsam-sdk/identity/server/worker-router' {
  export function handleIdentityWorkerRequest(
    request: Request,
    env: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<Response>;
}

declare module '@inneranimalmedia/agentsam-sdk/identity/adapters/cloudflare-d1' {
  export function createCloudflareD1Adapter(db: unknown): unknown;
}

declare module '@inneranimalmedia/agentsam-sdk/identity/server/identity-service' {
  export function createIdentityService(options: { adapter: unknown }): {
    sessionFromRequest(request: Request): Promise<{ user: { id: string; email: string } } | null>;
  };
}
