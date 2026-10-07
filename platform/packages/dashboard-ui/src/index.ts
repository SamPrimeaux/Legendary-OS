/** Stub. Extract shell, CMS and media workspaces from the existing CMS frontend into this package. */
export const DASHBOARD_MODULES = ["pages", "collections", "media", "leads", "projects", "members", "settings"] as const;
export type DashboardModule = (typeof DASHBOARD_MODULES)[number];
