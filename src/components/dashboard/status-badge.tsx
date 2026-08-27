import type { ReleaseStatus } from "@prisma/client";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import {
  getUserFacingReleaseStatus,
  getUserFacingStatusLabel,
  type UserFacingStatusKey,
} from "@/lib/releases/status";

type Tone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

const tones: Record<UserFacingStatusKey, Tone> = {
  draft: "neutral",
  in_review: "info",
  changes_required: "warning",
  rejected: "danger",
  approved: "success",
  delivering: "info",
  live: "success",
  takedown_pending: "warning",
  taken_down: "neutral",
  action_required: "danger",
};

export function StatusBadge({ status }: { status: ReleaseStatus | string }) {
  const key = getUserFacingReleaseStatus(status);
  return <Badge tone={tones[key]}>{getUserFacingStatusLabel(status)}</Badge>;
}

export function statusLabel(status: ReleaseStatus | string) {
  return getUserFacingStatusLabel(status);
}
