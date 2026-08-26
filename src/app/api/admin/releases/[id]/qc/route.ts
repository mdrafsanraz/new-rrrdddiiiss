import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import {
  requestQualityReportRefresh,
  syncReleaseQualityReport,
} from "@/lib/labelgrid/quality-report";
import { writeAuditLog } from "@/lib/admin/audit";
import { logReleaseActivity } from "@/lib/releases/activity";

const schema = z.object({
  action: z.enum(["sync", "refresh"]),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("releases.qc");
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  try {
    const body = schema.parse(await request.json());

    if (body.action === "refresh") {
      const result = await requestQualityReportRefresh(id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }
      await logReleaseActivity({
        releaseId: id,
        type: "qc_refreshed",
        title: "Preflight QC refresh requested",
        actorUserId: gate.admin.id,
      });
      return NextResponse.json({ ok: true });
    }

    const result = await syncReleaseQualityReport(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    await writeAuditLog({
      actorUserId: gate.admin.id,
      action: "labelgrid_sync",
      targetType: "release",
      targetId: id,
      summary: "Fetched Preflight QC report",
      metadata: { qcStatus: result.report?.status },
    });

    return NextResponse.json({ ok: true, report: result.report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[admin/releases/qc]", error);
    return NextResponse.json({ error: "QC request failed" }, { status: 500 });
  }
}
