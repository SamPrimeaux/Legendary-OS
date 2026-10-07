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
  export function createIdentityService(options: { adapter: unknown; app: { id: string }; routeRegistry: unknown }): {
    sessionFromRequest(request: Request): Promise<{
      user: { id: string; email: string; display_name?: string | null };
    } | null>;
  };
}

declare module '@inneranimalmedia/agentsam-sdk/identity' {
  export function defineRouteProjection(input: { appId: string; routes: Record<string, string | { path: string; auth?: string }> }): unknown;
  export function createRouteRegistry(projections: unknown[]): {
    resolve(appId: string, routeId: string): string | null;
    resolveReturnTo(options: { appId: string; value?: string | null }): string | null;
  };
}
