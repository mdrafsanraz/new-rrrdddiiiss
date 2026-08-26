import { NextResponse } from "next/server";
import { getSessionUser, toPublicUser } from "@/lib/auth/session";
import { getUserUsage } from "@/lib/entitlements/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const usage = await getUserUsage(user.id, user.planId);
  return NextResponse.json({ user: toPublicUser(user), usage });
}
