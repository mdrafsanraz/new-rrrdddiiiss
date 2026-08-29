import { requirePermissionApi } from "@/lib/auth/admin";
import { getStatementForAdmin, statementCsv, statementXlsx } from "@/lib/royalties/exports";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requirePermissionApi("royalties.read");
  if ("error" in gate) return Response.json({ error: gate.error }, { status: gate.status });
  const { id } = await context.params;
  const statement = await getStatementForAdmin(id);
  if (!statement) return Response.json({ error: "Statement not found." }, { status: 404 });
  const format = new URL(request.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const body = format === "xlsx" ? await statementXlsx(statement) : statementCsv(statement);
  return new Response(typeof body === "string" ? body : new Uint8Array(body), { headers: { "content-type": format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv; charset=utf-8", "content-disposition": `attachment; filename="RDISTRO-${statement.royaltyPeriod.period}-${statement.user.email}.${format}"`, "cache-control": "private, no-store" } });
}
