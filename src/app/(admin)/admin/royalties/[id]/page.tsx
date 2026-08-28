import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Warning,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getReconciliation } from "@/lib/royalties/calculation";
import { RoyaltyPeriodActions } from "@/components/admin/royalty-workflow-actions";
import { RoyaltyAdjustmentForm } from "@/components/admin/royalty-adjustment-form";
import { RoyaltyManualMatch } from "@/components/admin/royalty-manual-match";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";
const money = (value: { toString(): string }) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(Number(value.toString()));
const month = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);

export default async function RoyaltyPeriodPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const admin = await requirePermission("royalties.read");
  const canWrite = hasPermission(admin.role, "royalties.write");
  const { id } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const selectedStatus = [
    "matched",
    "unmatched",
    "conflict",
    "manual_match",
    "unallocated",
  ].includes(query.status ?? "")
    ? query.status
    : undefined;
  const period = await prisma.royaltyPeriod.findUnique({
    where: { id },
    include: {
      imports: true,
      _count: { select: { transactions: true, statements: true } },
    },
  });
  if (!period) notFound();
  const where = {
    royaltyPeriodId: id,
    ...(selectedStatus
      ? {
          matchStatus: selectedStatus as
            | "matched"
            | "unmatched"
            | "conflict"
            | "manual_match"
            | "unallocated",
        }
      : {}),
  };
  const [groups, rows, filteredCount, reconciliation] = await Promise.all([
    prisma.royaltyTransaction.groupBy({
      by: ["matchStatus"],
      where: { royaltyPeriodId: id },
      _count: true,
      _sum: { sourceNetRevenueUsd: true },
    }),
    prisma.royaltyTransaction.findMany({
      where,
      orderBy: { sourceRowNumber: "asc" },
      skip: (page - 1) * 50,
      take: 50,
      select: {
        id: true,
        sourceRowNumber: true,
        retailer: true,
        territory: true,
        upc: true,
        releaseTitle: true,
        isrc: true,
        artistName: true,
        trackTitle: true,
        quantity: true,
        sourceNetRevenueUsd: true,
        userPayableUsd: true,
        matchStatus: true,
        matchMethod: true,
        matchNotes: true,
      },
    }),
    prisma.royaltyTransaction.count({ where }),
    getReconciliation(id),
  ]);
  const count = (statuses: string[]) =>
    groups
      .filter((group) => statuses.includes(group.matchStatus))
      .reduce((sum, group) => sum + group._count, 0);
  const matched = count(["matched", "manual_match"]);
  const unmatched = count(["unmatched", "unallocated"]);
  const conflicts = count(["conflict"]);
  const statusHref = (status?: string) =>
    `/admin/royalties/${id}${status ? `?status=${status}` : ""}`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-col gap-5 border-b border-border pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link
            href="/admin/royalties"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft />
            Royalty ledger
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {month(period.startDate)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            LabelGrid · {period._count.transactions.toLocaleString()} source
            transactions · {period.status.replaceAll("_", " ")}
          </p>
        </div>
        {canWrite ? <RoyaltyPeriodActions periodId={id} status={period.status} unresolved={unmatched} /> : null}
      </header>
      <section className="grid overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Source net" value={money(reconciliation.sourceNet)} />
        <Metric
          label="RDISTRO deductions"
          value={money(reconciliation.deductions)}
          border
        />
        <Metric
          label="Unallocated"
          value={money(reconciliation.unallocated)}
          border
        />
        <Metric
          label="User payable"
          value={money(reconciliation.userPayable)}
          border
        />
      </section>
      <section className="rounded-2xl border border-border bg-foreground p-5 text-background">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold">Reconciliation</p>
            <p className="mt-1 text-xs text-background/55">
              Source gross − LabelGrid fees = source net. Source net − RDISTRO
              deductions − unallocated = user payable.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-xs">
            <span>
              Gross{" "}
              <b className="ml-1 text-sm">
                {money(reconciliation.sourceGross)}
              </b>
            </span>
            <span>
              Fees{" "}
              <b className="ml-1 text-sm">
                {money(reconciliation.sourceFees.abs())}
              </b>
            </span>
            <span>
              Statements{" "}
              <b className="ml-1 text-sm">{period._count.statements}</b>
            </span>
          </div>
        </div>
      </section>
      <nav className="flex flex-wrap gap-2">
        <Filter
          href={statusHref()}
          active={!selectedStatus}
          label="All"
          count={period._count.transactions}
        />
        <Filter
          href={statusHref("matched")}
          active={selectedStatus === "matched"}
          label="Matched"
          count={matched}
          icon={<CheckCircle />}
        />
        <Filter
          href={statusHref("unmatched")}
          active={selectedStatus === "unmatched"}
          label="Unmatched"
          count={unmatched}
          icon={<Warning />}
        />
        <Filter
          href={statusHref("conflict")}
          active={selectedStatus === "conflict"}
          label="Conflicts"
          count={conflicts}
          icon={<XCircle />}
        />
      </nav>
      {canWrite && period.status !== "published" ? (
        <RoyaltyAdjustmentForm periodId={id} />
      ) : null}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="border-b border-border bg-muted/45 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Row</th>
                <th className="px-4 py-3">Source recording</th>
                <th className="px-4 py-3">ISRC / UPC</th>
                <th className="px-4 py-3">Store / territory</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Source net</th>
                <th className="px-4 py-3 text-right">Payable</th>
                <th className="px-4 py-3">Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-4 font-mono text-muted-foreground">
                    {row.sourceRowNumber}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold">
                      {row.trackTitle || "Untitled track"}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {row.artistName} · {row.releaseTitle}
                    </p>
                  </td>
                  <td className="px-4 py-4 font-mono">
                    <p>{row.isrc || "—"}</p>
                    <p className="mt-1 text-muted-foreground">
                      {row.upc || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p>{row.retailer || "—"}</p>
                    <p className="mt-1 text-muted-foreground">
                      {row.territory || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums">
                    {row.quantity.toString()}
                  </td>
                  <td className="px-4 py-4 text-right font-medium tabular-nums">
                    {money(row.sourceNetRevenueUsd)}
                  </td>
                  <td className="px-4 py-4 text-right font-medium tabular-nums">
                    {money(row.userPayableUsd)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${["matched", "manual_match"].includes(row.matchStatus) ? "bg-emerald-50 text-emerald-700" : row.matchStatus === "conflict" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {row.matchStatus.replaceAll("_", " ")}
                    </span>
                    {row.matchNotes ? (
                      <p className="mt-2 max-w-52 leading-4 text-muted-foreground">
                        {row.matchNotes}
                      </p>
                    ) : null}
                    {["unmatched", "conflict"].includes(row.matchStatus) &&
                    canWrite && period.status !== "published" ? (
                      <RoyaltyManualMatch
                        transactionId={row.id}
                        initialQuery={
                          row.isrc || row.upc || row.trackTitle || ""
                        }
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No transactions match this filter.
          </p>
        ) : null}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>{filteredCount.toLocaleString()} results</span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
                href={`${statusHref(selectedStatus)}${selectedStatus ? "&" : "?"}page=${page - 1}`}
              >
                Previous
              </Link>
            ) : null}
            {page * 50 < filteredCount ? (
              <Link
                className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
                href={`${statusHref(selectedStatus)}${selectedStatus ? "&" : "?"}page=${page + 1}`}
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  border = false,
}: {
  label: string;
  value: string;
  border?: boolean;
}) {
  return (
    <div
      className={`p-5 ${border ? "border-t border-border sm:border-l sm:border-t-0" : ""}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
function Filter({
  href,
  active,
  label,
  count,
  icon,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-muted"}`}
    >
      {icon}
      {label}
      <span className={active ? "text-background/55" : "text-muted-foreground"}>
        {count}
      </span>
    </Link>
  );
}
