import Link from "next/link";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { formatDistanceToNow } from "@/lib/admin/format";
import { getLabelGridEnv, getLabelGridToken } from "@/lib/labelgrid/config";
import { getRateLimit } from "@/lib/labelgrid";
import { HealthDot } from "@/components/admin/home-widgets";

export const metadata = { title: "LabelGrid / System · Admin" };

export default async function AdminSystemPage() {
  await requirePermission("system.read");

  const configured = Boolean(getLabelGridToken());
  const env = getLabelGridEnv();

  let rateLimit: unknown = null;
  let rateLimitError: string | null = null;
  if (configured) {
    try {
      rateLimit = await getRateLimit();
    } catch (e) {
      rateLimitError = e instanceof Error ? e.message : "Probe failed";
    }
  }

  const [lastWebhook, failedWebhooks, syncErrors, recentAudits] =
    await Promise.all([
      prisma.providerWebhookEvent.findFirst({
        orderBy: { createdAt: "desc" },
      }),
      prisma.providerWebhookEvent.count({
        where: { OR: [{ processed: false }, { error: { not: null } }] },
      }),
      prisma.release.count({
        where: { status: { in: ["sync_error", "error"] } },
      }),
      prisma.auditLog.findMany({
        where: { action: "labelgrid_sync" },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { actor: { select: { name: true } } },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          LabelGrid / System
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Distributor-level health. Secrets are never shown.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Environment" value={String(env).toUpperCase()} />
        <Card
          title="API token"
          value={configured ? "Configured" : "Missing"}
        />
        <Card title="Failed syncs" value={String(syncErrors)} />
        <Card title="Webhook issues" value={String(failedWebhooks)} />
        <Card
          title="Last webhook"
          value={
            lastWebhook
              ? formatDistanceToNow(lastWebhook.createdAt)
              : "None"
          }
        />
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Connection
          </p>
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium capitalize">
            <HealthDot
              state={
                !configured
                  ? "unknown"
                  : rateLimitError
                    ? "degraded"
                    : "operational"
              }
            />
            {!configured
              ? "unknown"
              : rateLimitError
                ? "degraded"
                : "operational"}
          </p>
        </div>
      </div>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Rate limit budgets</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          From GET /rate-limit — request ceilings, not catalog capacity.
        </p>
        {rateLimitError ? (
          <p className="mt-3 text-sm text-amber-900">{rateLimitError}</p>
        ) : (
          <pre className="mt-3 overflow-x-auto rounded-md bg-muted/50 p-3 text-[11px]">
            {JSON.stringify(rateLimit, null, 2)}
          </pre>
        )}
      </section>

      <section className="rounded-md border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">Recent sync audits</h2>
        </div>
        <ul className="divide-y divide-border">
          {recentAudits.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted-foreground">
              No sync audit events yet.
            </li>
          ) : (
            recentAudits.map((a) => (
              <li key={a.id} className="px-4 py-2.5 text-sm">
                <p className="font-medium">{a.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {a.actor?.name ?? "System"} ·{" "}
                  {formatDistanceToNow(a.createdAt)}
                  {a.targetId ? (
                    <>
                      {" · "}
                      <Link
                        href={`/admin/releases/${a.targetId}`}
                        className="underline-offset-2 hover:underline"
                      >
                        Open
                      </Link>
                    </>
                  ) : null}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
