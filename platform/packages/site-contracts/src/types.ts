export const ROLES = ["owner", "admin", "editor", "crew", "viewer"] as const;
export type Role = (typeof ROLES)[number];
export type Status = "draft" | "published" | "archived";
export type Surface = "canvas" | "paper" | "muted" | "inverse";
export type Spacing = "none" | "sm" | "md" | "lg";
export type Width = "content" | "wide" | "full";

/** A link, or a button that opens an overlay (popup) by key. */
/** `root: true` = href is relative to the deployment, not the site (e.g. a link to the dashboard). */
export interface Link { label: string; href?: string; overlay?: string; root?: boolean }

export interface SectionSettings { surface?: Surface; spacing?: Spacing; width?: Width; anchor?: string }
export interface Block { key: string; type: string; data: Record<string, unknown> }

/** `key` is a stable slug, unique within its page. It is the idempotency key for seeds and edits. */
export interface Section {
  key: string;
  type: string;
  preset?: string;
  settings?: SectionSettings;
  data: Record<string, unknown>;
  blocks?: Block[];
  visible?: boolean;
}

export interface Page {
  key: string;
  route: string;
  aliases?: string[];
  title: string;
  description?: string;
  seo?: { title?: string; description?: string };
  template?: string;
  sections: Section[];
}

export interface Announcement { enabled: boolean; text: string; href?: string }
export interface Overlay {
  key: string;
  title: string;
  trigger: { type: "click" | "delay"; delayMs?: number };
  sections: Section[];
}
export interface Globals {
  header: { links: Link[]; utility?: Link[]; cta?: Link };
  footer: { links: Link[]; note?: string };
  announcement?: Announcement;
  overlays?: Overlay[];
}

export interface CollectionItem { slug: string; title: string; status?: Status; sortOrder?: number; data: Record<string, unknown> }

/** Portable content bundle: seed input and export format. */
export interface SiteBundle {
  schemaVersion: 1;
  globals: Globals;
  pages: Page[];
  collections: Record<string, CollectionItem[]>;
}

export interface BrandPack {
  name: string;
  mark?: string;
  legalName?: string;
  sublabel?: string;
  tagline?: string;
  logo?: { key: string; alt: string };
  favicon?: string;
  contact: { phone?: string; phoneHref?: string; email?: string; address?: string; serviceArea?: string };
  social?: Link[];
  legal?: { copyright?: string; license?: string };
  seo?: { titleSuffix?: string; defaultDescription?: string };
}
export type ThemeTokens = Record<string, string>;

export interface AppManifest {
  schemaVersion: 1;
  app: { id: string; kind: string };
  /** Stable site key used in the database. Where the site is mounted is decided by the deployment. */
  site: { key: string };
  organization: { id: string };
  identity: { provider: "inneranimalmedia" };
  theme: { base: string; tokens: string };
  brand: string;
  features: string[];
  roles: Role[];
  content: { seed: string };
}

export interface Lead {
  kind: string;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  data?: Record<string, unknown>;
  sourceRoute?: string;
}

/** Where apps run. Today: one deployment, one D1, one R2, many sites. Splitting later = adding a deployment file. */
export interface Deployment {
  schemaVersion: 1;
  id: string;
  cloudflare: { worker: string; d1: string; r2: string };
  domains: string[];
  previewMediaBase?: string;
  sites: { app: string; basePath: string }[];
  /** Live URLs that must keep working: live route -> canonical route, per app. */
  parity?: { liveBase: string; sites: Record<string, { routes: Record<string, string> }> };
}
