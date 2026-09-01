import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { isAcrCloudConfigured } from "@/lib/acrcloud/client";
import { isAuddConfigured } from "@/lib/audd/client";
import { runReleaseAcrScan } from "@/lib/acrcloud/release-scan";

type Params = { params: Promise<{ id: string }> };
export const maxDuration = 300;

export async function POST(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("releases.qc");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = await request.json().catch(() => null) as { provider?: unknown } | null;
  const provider = body?.provider;
  if (provider !== "acrcloud" && provider !== "audd") {
    return NextResponse.json({ error: "Choose ACRCloud or AudD." }, { status: 400 });
  }
  if ((provider === "acrcloud" && !isAcrCloudConfigured()) || (provider === "audd" && !isAuddConfigured())) {
    return NextResponse.json({ error: `${provider === "audd" ? "AudD" : "ACRCloud"} is not configured.` }, { status: 503 });
  }

  const { id } = await params;
  try {
    const report = await runReleaseAcrScan({
      releaseId: id,
      actorUserId: gate.admin.id,
      source: "manual_refresh",
      provider,
    });
    return NextResponse.json(
      { report, results: report.results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recognition scan failed." },
      { status: 502 },
    );
  }
}
