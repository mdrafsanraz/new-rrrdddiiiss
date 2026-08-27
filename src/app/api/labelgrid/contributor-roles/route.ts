import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { listContributorRoles } from "@/lib/labelgrid";

/**
 * Proxy LabelGrid's real contributor-role catalog for the Credits step.
 * Never hardcode role labels — LabelGrid rejects a `roles.*` key it doesn't
 * recognize (422 "The selected contributor role is invalid"), so the UI
 * must only ever offer roles this endpoint actually returned.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLabelGridLive()) {
    return NextResponse.json({
      roles: [],
      sandbox: false,
      note: "LabelGrid token not configured — no contributor roles available.",
    });
  }

  try {
    const raw = await listContributorRoles();
    const list = Array.isArray(raw)
      ? raw
      : ((raw as { data?: unknown[] })?.data ?? []);
    const roles = (list as Array<Record<string, unknown>>)
      .map((r) => ({
        display_value: String(r.display_value ?? ""),
        category: r.category != null ? String(r.category) : null,
        // Prefer a dedicated identifier if the live response carries one;
        // fall back to display_value itself if it doesn't.
        key: String(r.key ?? r.id ?? r.value ?? r.code ?? r.display_value ?? ""),
      }))
      .filter((r) => r.display_value && r.key);
    return NextResponse.json({ roles, sandbox: true });
  } catch (error) {
    console.error("[labelgrid/contributor-roles]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load contributor roles",
      },
      { status: 502 }
    );
  }
}
