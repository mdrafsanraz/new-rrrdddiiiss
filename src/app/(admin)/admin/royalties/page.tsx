import { requirePermission } from "@/lib/auth/admin";
import { getLabelGridToken } from "@/lib/labelgrid/config";

export const metadata = { title: "Royalties & Payouts · Admin" };

export default async function AdminRoyaltiesPage() {
  await requirePermission("royalties.read");
  const configured = Boolean(getLabelGridToken());

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Royalties & Payouts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Finance ops surface. LabelGrid exposes{" "}
          <code className="text-xs">/royalties/breakdown</code> and{" "}
          <code className="text-xs">/royalties/artificial-streams</code> at the
          shared account level — not per RDISTRO user until we map statements
          locally.
        </p>
      </div>

      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Status</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            LabelGrid API: {configured ? "Token configured" : "Not configured"}
          </li>
          <li>Per-user balances: local model not wired yet</li>
          <li>Payout requests / holds: architecture reserved</li>
          <li>
            Do not invent store/territory earnings without provider rows
          </li>
        </ul>
      </div>
    </div>
  );
}
