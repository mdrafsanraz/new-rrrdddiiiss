import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Presentational tone-driven badge matching the shape already established
 * by `StatusBadge` (square, 11px semibold, tinted background) — for
 * non-release-status usages (plan tier, generic labels). Does not replace
 * StatusBadge/AdminStatusBadge, which keep their own status→tone mapping
 * logic; this is the shared shell those already match visually.
 */
const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 px-2 py-0.5 text-[11px] font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        primary: "bg-primary/10 text-primary",
        warning:
          "bg-amber-500/15 text-amber-950 dark:bg-amber-500/20 dark:text-amber-200",
        danger:
          "bg-red-500/10 text-red-800 dark:bg-red-500/15 dark:text-red-300",
        success:
          "bg-emerald-600/10 text-emerald-800 dark:bg-emerald-600/15 dark:text-emerald-300",
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
