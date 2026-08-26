import type { ReleaseStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const labels: Record<ReleaseStatus, string> = {
  draft: "Draft",
  incomplete: "Incomplete",
  ready_to_submit: "Ready to submit",
  syncing: "Syncing",
  submitted: "Submitted",
  in_review: "Admin review",
  changes_required: "Changes required",
  rejected: "Rejected (final)",
  approved: "Approved",
  delivering: "Delivering",
  live: "Live",
  takedown_pending: "Takedown pending",
  taken_down: "Taken down",
  error: "Sync error",
};

const tones: Partial<Record<ReleaseStatus, string>> = {
  live: "bg-emerald-600/10 text-emerald-800",
  approved: "bg-emerald-600/10 text-emerald-800",
  changes_required: "bg-amber-500/15 text-amber-900",
  rejected: "bg-red-500/10 text-red-800",
  error: "bg-red-500/10 text-red-800",
  submitted: "bg-primary/10 text-primary",
  in_review: "bg-primary/10 text-primary",
  syncing: "bg-amber-500/15 text-amber-900",
  delivering: "bg-primary/10 text-primary",
};

export function StatusBadge({ status }: { status: ReleaseStatus }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold",
        tones[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {labels[status]}
    </span>
  );
}

export function statusLabel(status: ReleaseStatus) {
  return labels[status];
}
