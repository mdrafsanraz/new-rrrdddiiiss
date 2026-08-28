import Link from "next/link";
import {
  ArrowRight,
  DownloadSimple,
  MusicNotes,
  Receipt,
} from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const metadata = { title: "Royalties" };
export const dynamic = "force-dynamic";
const money = (value: { toString(): string }) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value.toString()),
  );
const month = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);

export default async function RoyaltiesPage() {
  const user = await requireUser();
  const statements = await prisma.userRoyaltyStatement.findMany({
    where: { userId: user.id, royaltyPeriod: { status: "published" } },
    include: { royaltyPeriod: true },
    orderBy: { royaltyPeriod: { startDate: "desc" } },
  });
  const lifetime = statements.reduce(
    (sum, statement) => sum + Number(statement.userPayableTotal),
    0,
  );
  return (
    <div className="mx-auto max-w-[1120px] space-y-8">
      <header className="grid gap-5 border-b border-border pb-7 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <MusicNotes size={18} weight="duotone" />
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">
              Earnings detail
            </p>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            Royalties
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            See where your earnings came from and export each published
            statement.
          </p>
        </div>
        <Link
          href="/dashboard/wallet"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold transition hover:bg-muted"
        >
          Open Wallet <ArrowRight />
        </Link>
      </header>
      <section className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Published earnings</p>
          <p className="mt-2 text-2xl font-semibold">
            {money({ toString: () => String(lifetime) })}
          </p>
        </div>
        <div className="border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <p className="text-xs text-muted-foreground">Statements</p>
          <p className="mt-2 text-2xl font-semibold">{statements.length}</p>
        </div>
        <div className="border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <p className="text-xs text-muted-foreground">Latest period</p>
          <p className="mt-2 text-lg font-semibold">
            {statements[0] ? month(statements[0].royaltyPeriod.startDate) : "—"}
          </p>
        </div>
      </section>
      <section>
        <div className="pb-4">
          <h2 className="text-xl font-semibold">Statements</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Store, territory, release, track and usage detail lives here.
          </p>
        </div>
        {statements.length ? (
          <div className="divide-y divide-border border-y border-border">
            {statements.map((statement) => (
              <div
                key={statement.id}
                className="grid gap-4 py-5 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-muted">
                  <Receipt size={18} weight="duotone" />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {month(statement.royaltyPeriod.startDate)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statement.transactionCount.toLocaleString()} royalty rows ·
                    Published
                  </p>
                </div>
                <p className="text-lg font-semibold">
                  {money(statement.userPayableTotal)}
                </p>
                <div className="flex gap-2">
                  <a
                    href={`/api/royalties/statements/${statement.id}/export?format=csv`}
                    aria-label="Export CSV"
                    className="grid size-9 place-items-center rounded-lg border border-border hover:bg-muted"
                  >
                    <DownloadSimple />
                  </a>
                  <Link
                    href={`/dashboard/royalties/${statement.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-semibold text-background"
                  >
                    View <ArrowRight />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border">
            <div className="max-w-sm text-center">
              <Receipt className="mx-auto text-muted-foreground" size={30} />
              <h2 className="mt-3 font-semibold">No published statements</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Your royalty detail will appear after RDISTRO publishes a
                statement.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
