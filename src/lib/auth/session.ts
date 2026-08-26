import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PlanId, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "rdistro_session";

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
}

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return prisma.user.findUnique({ where: { id: payload.sub } });
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
  stripeStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
};

export function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  planId: PlanId;
  stripeStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    planId: user.planId,
    stripeStatus: user.stripeStatus,
    stripeCustomerId: user.stripeCustomerId,
  };
}
