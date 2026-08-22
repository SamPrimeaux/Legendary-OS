export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        ok: true,
        service: "legendary-os",
        runtime: "cloudflare-workers",
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { error: "not_found", path: url.pathname },
        { status: 404 },
      );
    }

    return env.ASSETS.fetch(request);
  },
};
