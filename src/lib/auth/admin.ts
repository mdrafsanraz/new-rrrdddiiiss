import type { User, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/** Comma-separated emails promoted to admin (also sets role=admin on login). */
const DEFAULT_ADMIN_EMAILS = ["rafsan@rdistro.net"];

export function adminEmailsFromEnv(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ADMIN_EMAILS, ...fromEnv])];
}

export function isAdminUser(user: {
  role: UserRole;
  email: string;
}): boolean {
  if (user.role === "admin") return true;
  return adminEmailsFromEnv().includes(user.email.toLowerCase());
}

/** Ensure env-listed admins get role=admin persisted. */
export async function ensureAdminRole(user: User): Promise<User> {
  if (user.role === "admin") return user;
  if (!adminEmailsFromEnv().includes(user.email.toLowerCase())) return user;
  return prisma.user.update({
    where: { id: user.id },
    data: { role: "admin" },
  });
}

/**
 * Require a real admin session (not while impersonating a user).
 * Impersonation must be stopped before accessing /admin.
 */
export async function requireAdmin() {
  const ctx = await getSessionContext();
  if (!ctx.user) redirect("/login");
  if (ctx.isImpersonating) redirect("/dashboard");
  if (!isAdminUser(ctx.user)) redirect("/dashboard");
  const user = await ensureAdminRole(ctx.user);
  return user;
}

export async function requireAdminApi() {
  const ctx = await getSessionContext();
  if (!ctx.user) return { error: "Unauthorized" as const, status: 401 as const };
  if (ctx.isImpersonating) {
    return {
      error: "Stop impersonation before using admin APIs" as const,
      status: 403 as const,
    };
  }
  if (!isAdminUser(ctx.user)) {
    return { error: "Forbidden" as const, status: 403 as const };
  }
  const user = await ensureAdminRole(ctx.user);
  return { admin: user };
}
