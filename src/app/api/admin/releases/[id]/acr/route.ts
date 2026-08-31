import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { isAcrCloudConfigured } from "@/lib/acrcloud/client";
import { runReleaseAcrScan } from "@/lib/acrcloud/release-scan";

type Params = { params: Promise<{ id: string }> };
export const maxDuration = 300;

export async function POST(_request: Request, { params }: Params) {
  const gate = await requirePermissionApi("releases.qc");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!isAcrCloudConfigured()) {
    return NextResponse.json({ error: "ACRCloud is not configured." }, { status: 503 });
  }

  const { id } = await params;
  try {
    const report = await runReleaseAcrScan({
      releaseId: id,
      actorUserId: gate.admin.id,
      source: "manual_refresh",
    });
    return NextResponse.json(
      { report, results: report.results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ACRCloud scan failed." },
      { status: 502 },
    );
  }
}
