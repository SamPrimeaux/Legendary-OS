/** HTTP surface shared by the Worker and every frontend. */
export const API = {
  health: "/api/health",
  leads: "/api/leads",
  media: "/media/",
} as const;

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string } };
export type ApiResult<T> = ApiOk<T> | ApiErr;

export const ok = <T>(data: T): ApiOk<T> => ({ ok: true, data });
export const err = (code: string, message: string): ApiErr => ({ ok: false, error: { code, message } });

/** Planned admin surface (not implemented yet). Every route is session + role checked. */
export const ADMIN_ROUTES = [
  "GET /admin/api/pages",
  "PUT /admin/api/pages/:key",
  "POST /admin/api/pages/:key/publish",
  "GET /admin/api/collections/:name",
  "PUT /admin/api/collections/:name/:slug",
  "POST /admin/api/media",
  "GET /admin/api/leads",
  "PATCH /admin/api/leads/:id",
  "GET /admin/api/projects",
  "GET /admin/api/members",
] as const;
