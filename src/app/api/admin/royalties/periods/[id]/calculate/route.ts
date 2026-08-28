import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { calculateRoyaltyPeriod } from "@/lib/royalties/calculation";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requirePermissionApi("royalties.write");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const { id } = await context.params;
    const result = await calculateRoyaltyPeriod(id);
    await writeAuditLog({ actorUserId: gate.admin.id, action: "other", targetType: "royalty_period", targetId: id, summary: "Royalty calculations completed", metadata: Object.fromEntries(Object.entries(result).map(([key, value]) => [key, value.toString()])) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Calculation failed." }, { status: 422 });
  }
}
