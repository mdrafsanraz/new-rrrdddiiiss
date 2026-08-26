import type { ReleaseStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  getUserFacingReleaseStatus,
  getUserFacingStatusLabel,
  type UserFacingStatusKey,
} from "@/lib/releases/status";

const tones: Record<UserFacingStatusKey, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-primary/10 text-primary",
  changes_required: "bg-amber-500/15 text-amber-950",
  rejected: "bg-red-500/10 text-red-800",
  approved: "bg-emerald-600/10 text-emerald-800",
  delivering: "bg-primary/10 text-primary",
  live: "bg-emerald-600/10 text-emerald-800",
  takedown_pending: "bg-amber-500/15 text-amber-950",
  taken_down: "bg-muted text-muted-foreground",
  action_required: "bg-red-500/10 text-red-800",
};

export function StatusBadge({ status }: { status: ReleaseStatus | string }) {
  const key = getUserFacingReleaseStatus(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center px-2 py-0.5 text-[11px] font-semibold",
        tones[key]
      )}
      role="status"
      aria-atomic="true"
    >
      {getUserFacingStatusLabel(status)}
    </span>
  );
}

export function statusLabel(status: ReleaseStatus | string) {
  return getUserFacingStatusLabel(status);
}
