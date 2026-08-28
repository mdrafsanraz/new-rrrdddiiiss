import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { importRoyaltyStatement } from "@/lib/royalties/import";

export async function POST(request: Request) {
  const gate = await requirePermissionApi("royalties.write");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const form = await request.formData();
    const file = form.get("statement");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a CSV statement." }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".csv")) return NextResponse.json({ error: "Only CSV statements are accepted." }, { status: 415 });
    if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: "The statement exceeds the 50 MB upload limit." }, { status: 413 });
    const result = await importRoyaltyStatement({ buffer: Buffer.from(await file.arrayBuffer()), fileName: file.name, uploadedById: gate.admin.id });
    await writeAuditLog({ actorUserId: gate.admin.id, action: "other", targetType: "royalty_import", targetId: result.importId, summary: `Imported ${file.name} with ${result.rowCount} royalty transactions`, metadata: { periodId: result.periodId, matched: result.matchedCount, unmatched: result.unmatchedCount, conflicts: result.conflictCount } });
    return NextResponse.json({ ok: true, ...result, totals: Object.fromEntries(Object.entries(result.totals).map(([key, value]) => [key, value.toString()])) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Statement import failed." }, { status: 422 });
  }
}
