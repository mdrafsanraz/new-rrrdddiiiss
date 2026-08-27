import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The one shared visual system for status/tone badges across the user
 * dashboard (square, 11px semibold, tinted background, dark-mode aware).
 * `StatusBadge` (release status) and the release-view `Badge` (LabelGrid
 * review status) both render through this — they keep their own
 * status→tone mapping logic, only the visual shell is shared. The tone
 * set intentionally matches `Tone`/`TONE_CLASSES` in
 * `@/lib/labelgrid/state-labels` so both systems stay byte-identical.
 * (Admin's separate `AdminStatusBadge` is out of scope — different surface.)
 */
const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 px-2 py-0.5 text-[11px] font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        info: "bg-primary/10 text-primary",
        success: "bg-emerald-600/10 text-emerald-800 dark:text-emerald-400",
        warning: "bg-amber-500/15 text-amber-900 dark:text-amber-400",
        danger: "bg-red-500/10 text-red-800 dark:text-red-400",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
);

function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      role="status"
      aria-atomic="true"
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
