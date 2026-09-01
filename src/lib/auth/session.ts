import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PlanId, SubscriptionStatus, User, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "rdistro_session";
/** Holds the real admin session while impersonating a user. */
export const ADMIN_RESTORE_COOKIE = "rdistro_admin_restore";

export type SessionPayload = {
  sub: string;
  email: string;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string, email: string) {
  const token = await signSession({ sub: userId, email });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(ADMIN_RESTORE_COOKIE);
}

export async function getSessionUser() {
  const ctx = await getSessionContext();
  return ctx.user;
}

export type SessionContext = {
  user: User | null;
  impersonator: User | null;
  isImpersonating: boolean;
};

export async function getSessionContext(): Promise<SessionContext> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    return { user: null, impersonator: null, isImpersonating: false };
  }
  const payload = await verifySessionToken(token);
  if (!payload) {
    return { user: null, impersonator: null, isImpersonating: false };
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.suspended || user.terminated) {
    return { user: null, impersonator: null, isImpersonating: false };
  }

  const restore = jar.get(ADMIN_RESTORE_COOKIE)?.value;
  if (!restore) {
    return { user, impersonator: null, isImpersonating: false };
  }

  const adminPayload = await verifySessionToken(restore);
  if (!adminPayload || adminPayload.sub === user.id) {
    return { user, impersonator: null, isImpersonating: false };
  }

  const impersonator = await prisma.user.findUnique({
    where: { id: adminPayload.sub },
  });
  if (!impersonator) {
    return { user, impersonator: null, isImpersonating: false };
  }

  return { user, impersonator, isImpersonating: true };
}

/**
 * Start impersonating `target` while preserving the current admin session
 * in ADMIN_RESTORE_COOKIE so the admin can return.
 */
export async function startImpersonation(admin: User, target: User) {
  const jar = await cookies();
  const current = jar.get(SESSION_COOKIE)?.value;
  if (current) {
    jar.set(ADMIN_RESTORE_COOKIE, current, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  }
  await setSessionCookie(target.id, target.email);
}

/** Restore the admin session saved during impersonation. */
export async function stopImpersonation(): Promise<boolean> {
  const jar = await cookies();
  const restore = jar.get(ADMIN_RESTORE_COOKIE)?.value;
  if (!restore) return false;
  const payload = await verifySessionToken(restore);
  if (!payload) {
    jar.delete(ADMIN_RESTORE_COOKIE);
    return false;
  }
  jar.set(SESSION_COOKIE, restore, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  jar.delete(ADMIN_RESTORE_COOKIE);
  return true;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  planId: PlanId;
  role: UserRole;
  stripeStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
};

export function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  planId: PlanId;
  role: UserRole;
  stripeStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    planId: user.planId,
    role: user.role,
    stripeStatus: user.stripeStatus,
    stripeCustomerId: user.stripeCustomerId,
  };
}
