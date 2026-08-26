import { NextResponse } from "next/server";
import { getSessionContext, toPublicUser } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/admin";
import { getUserUsage } from "@/lib/entitlements/server";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx.user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const usage = await getUserUsage(ctx.user.id, ctx.user.planId);
  return NextResponse.json({
    user: toPublicUser(ctx.user),
    usage,
    isAdmin: isAdminUser(ctx.user) && !ctx.isImpersonating,
    impersonating: ctx.isImpersonating
      ? {
          admin: ctx.impersonator
            ? { id: ctx.impersonator.id, name: ctx.impersonator.name }
            : null,
        }
      : null,
  });
}
