import { NextResponse } from "next/server";

/** Liveness probe — no DB required. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "rdistro" });
}
