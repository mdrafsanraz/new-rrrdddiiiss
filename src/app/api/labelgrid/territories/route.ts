import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { listTerritories } from "@/lib/labelgrid";

/**
 * Live LabelGrid territory catalog for Step 2 — manual territory selection
 * offers exactly what GET /territories returns (alpha-2 code + name), never
 * a hardcoded country list.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isLabelGridLive()) {
    return NextResponse.json({
      territories: [],
      note: "LabelGrid token not configured.",
    });
  }

  try {
    const raw = await listTerritories();
    const list = Array.isArray(raw)
      ? raw
      : ((raw as unknown as { data?: unknown[] })?.data ?? []);
    const territories = (list as Array<Record<string, unknown>>)
      .map((t) => ({
        code: String(t.code2 ?? "").toUpperCase(),
        name: String(t.name ?? ""),
      }))
      .filter((t) => /^[A-Z]{2}$/.test(t.code) && t.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ territories });
  } catch (error) {
    console.error("[labelgrid/territories]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load territories",
      },
      { status: 502 }
    );
  }
}
