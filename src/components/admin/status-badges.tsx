import { cn } from "@/lib/utils";
import { getAdminStatusLabel, normalizeReleaseStatus } from "@/lib/releases/status";

const tones: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_internal_review: "bg-sky-500/12 text-sky-950",
  internal_changes_required: "bg-amber-500/15 text-amber-950",
  labelgrid_changes_required: "bg-amber-500/15 text-amber-950",
  on_hold: "bg-violet-500/12 text-violet-950",
  labelgrid_in_review: "bg-primary/10 text-primary",
  labelgrid_approved: "bg-emerald-600/10 text-emerald-900",
  delivering: "bg-primary/10 text-primary",
  live: "bg-emerald-600/12 text-emerald-900",
  internal_rejected: "bg-red-500/10 text-red-900",
  labelgrid_rejected: "bg-red-500/10 text-red-900",
  takedown_pending: "bg-amber-500/15 text-amber-950",
  taken_down: "bg-muted text-muted-foreground",
  sync_error: "bg-red-500/10 text-red-900",
};

export function AdminStatusBadge({ status }: { status: string }) {
  const s = normalizeReleaseStatus(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tones[s] ?? "bg-muted text-muted-foreground"
      )}
    >
      {getAdminStatusLabel(status)}
    </span>
  );
}

export function QcBadge({ status }: { status: string | null | undefined }) {
  if (!status || status === "not_run") {
    return (
      <span className="text-[11px] text-muted-foreground">Not run</span>
    );
  }
  if (status === "not_enabled") {
    return (
      <span className="text-[11px] text-muted-foreground">N/A</span>
    );
  }
  if (status === "passed") {
    return (
      <span className="text-[11px] font-medium text-emerald-800">✓ Passed</span>
    );
  }
  if (status === "pending") {
    return (
      <span className="text-[11px] font-medium text-muted-foreground">
        Pending
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="text-[11px] font-medium text-amber-900">⚠ Warning</span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-red-800">
      ● Review required
    </span>
  );
}
