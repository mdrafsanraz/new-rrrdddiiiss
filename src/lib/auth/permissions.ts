import type { UserRole } from "@prisma/client";

/** Staff roles that may access /admin (not `user`). */
export const STAFF_ROLES = [
  "super_admin",
  "admin",
  "reviewer",
  "support",
  "finance",
] as const satisfies readonly UserRole[];

export type StaffRole = (typeof STAFF_ROLES)[number];

export type AdminPermission =
  | "admin.access"
  | "releases.read"
  | "releases.moderate"
  | "releases.qc"
  | "releases.takedown"
  | "documents.manage"
  | "users.read"
  | "users.write"
  | "users.impersonate"
  | "artists.read"
  | "support.manage"
  | "subscriptions.manage"
  | "royalties.read"
  | "royalties.write"
  | "analytics.read"
  | "system.read"
  | "system.write"
  | "audit.read"
  | "staff.manage"
  | "settings.manage";

const ALL: AdminPermission[] = [
  "admin.access",
  "releases.read",
  "releases.moderate",
  "releases.qc",
  "releases.takedown",
  "documents.manage",
  "users.read",
  "users.write",
  "users.impersonate",
  "artists.read",
  "support.manage",
  "subscriptions.manage",
  "royalties.read",
  "royalties.write",
  "analytics.read",
  "system.read",
  "system.write",
  "audit.read",
  "staff.manage",
  "settings.manage",
];

const ROLE_PERMISSIONS: Record<StaffRole, AdminPermission[]> = {
  super_admin: ALL,
  admin: [
    "admin.access",
    "releases.read",
    "releases.moderate",
    "releases.qc",
    "releases.takedown",
    "documents.manage",
    "users.read",
    "users.write",
    "users.impersonate",
    "artists.read",
    "support.manage",
    "subscriptions.manage",
    "royalties.read",
    "analytics.read",
    "system.read",
    "audit.read",
  ],
  reviewer: [
    "admin.access",
    "releases.read",
    "releases.moderate",
    "releases.qc",
    "documents.manage",
    "users.read",
    "artists.read",
    "analytics.read",
  ],
  support: [
    "admin.access",
    "releases.read",
    "users.read",
    "users.impersonate",
    "artists.read",
    "support.manage",
    "documents.manage",
  ],
  finance: [
    "admin.access",
    "users.read",
    "subscriptions.manage",
    "royalties.read",
    "royalties.write",
    "analytics.read",
    "audit.read",
  ],
};

export function isStaffRole(role: UserRole): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function permissionsForRole(role: UserRole): AdminPermission[] {
  if (!isStaffRole(role)) return [];
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(
  role: UserRole,
  permission: AdminPermission
): boolean {
  return permissionsForRole(role).includes(permission);
}

export function hasAnyPermission(
  role: UserRole,
  permissions: AdminPermission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/** Nav item → required permission (first matching wins visibility). */
export const NAV_PERMISSION: Record<string, AdminPermission> = {
  "/admin": "admin.access",
  "/admin/releases": "releases.read",
  "/admin/users": "users.read",
  "/admin/artists": "artists.read",
  "/admin/documents": "documents.manage",
  "/admin/takedowns": "releases.takedown",
  "/admin/support": "support.manage",
  "/admin/royalties": "royalties.read",
  "/admin/subscriptions": "subscriptions.manage",
  "/admin/analytics": "analytics.read",
  "/admin/system": "system.read",
  "/admin/audit": "audit.read",
  "/admin/settings": "settings.manage",
  "/admin/admins": "staff.manage",
};
