import { requirePermission } from "@/lib/auth/admin";
import { listAuditLogs } from "@/lib/admin/audit";
import { formatDistanceToNow } from "@/lib/admin/format";

export const metadata = { title: "Audit Logs · Admin" };

type Props = { searchParams: Promise<{ page?: string }> };

export default async function AdminAuditPage({ searchParams }: Props) {
  await requirePermission("audit.read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 50;
  const { rows, total } = await listAuditLogs({
    take: pageSize,
    skip: (page - 1) * pageSize,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Append-only staff actions · {total.toLocaleString()} events. Not
          editable.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  No audit events yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(row.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {row.actor?.email ?? "System"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px]">
                    {row.action}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {row.targetType}
                    {row.targetId ? ` · ${row.targetId.slice(0, 10)}…` : ""}
                  </td>
                  <td className="px-3 py-2.5">{row.summary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
