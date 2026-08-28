import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { publishRoyaltyPeriod } from "@/lib/royalties/calculation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requirePermissionApi("royalties.write");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const result = await publishRoyaltyPeriod(id, gate.admin.id, body.approveUnresolved === true);
    await writeAuditLog({ actorUserId: gate.admin.id, action: "other", targetType: "royalty_period", targetId: id, summary: `Published royalty period with ${result.statements} user statements`, metadata: result });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Publishing failed." }, { status: 422 });
  }
}
