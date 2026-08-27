import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { listContributorRoles } from "@/lib/labelgrid";

/**
 * Proxy LabelGrid's real contributor-role catalog for the Credits step.
 * Never hardcode role labels — LabelGrid rejects a `roles.*` key it doesn't
 * recognize (422 "The selected contributor role is invalid"), so the UI
 * must only ever offer roles this endpoint actually returned, grouped by
 * the `category` LabelGrid itself assigns to each one.
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
    console.log("[labelgrid/contributor-roles] raw GET response", JSON.stringify(raw));

    const list = Array.isArray(raw)
      ? raw
      : ((raw as { data?: unknown[] })?.data ?? []);
    const roles = (list as Array<Record<string, unknown>>)
      .map((r) => ({
        display_value: String(r.display_value ?? "").trim(),
        category:
          r.category != null ? String(r.category).trim() || null : null,
        description:
          r.description != null ? String(r.description).trim() || null : null,
        position: typeof r.position === "number" ? r.position : null,
      }))
      .filter((r) => r.display_value)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    console.log(
      "[labelgrid/contributor-roles] categories",
      JSON.stringify(
        [...new Set(roles.map((r) => r.category))].map((category) => ({
          category,
          roles: roles
            .filter((r) => r.category === category)
            .map((r) => r.display_value),
        }))
      )
    );

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
