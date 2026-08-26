import { NextResponse } from "next/server";
import { stopImpersonation } from "@/lib/auth/session";

export async function POST() {
  const ok = await stopImpersonation();
  if (!ok) {
    return NextResponse.json(
      { error: "Not currently impersonating" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
