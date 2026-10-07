import type { Role } from "@inneranimalmedia/site-contracts";

export type Action =
  | "content.edit" | "content.publish"
  | "media.upload" | "media.delete"
  | "leads.view" | "leads.assign"
  | "projects.edit"
  | "members.manage" | "site.settings";

const ALL: readonly Action[] = [
  "content.edit", "content.publish", "media.upload", "media.delete",
  "leads.view", "leads.assign", "projects.edit", "members.manage", "site.settings",
];

/** One matrix for every app. Crew can add job photos and update projects, but cannot publish. */
const MATRIX: Record<Role, readonly Action[]> = {
  owner: ALL,
  admin: ALL,
  editor: ["content.edit", "content.publish", "media.upload", "media.delete", "leads.view", "projects.edit"],
  crew: ["media.upload", "projects.edit"],
  viewer: [],
};

export const can = (role: Role, action: Action): boolean => MATRIX[role].includes(action);
export const permissionsFor = (role: Role): readonly Action[] => MATRIX[role];
