import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal loading placeholder — fills the gap identified in the current
 * codebase (no skeleton/loading-state system exists anywhere yet).
 * `motion-safe:` keeps the pulse off for prefers-reduced-motion, matching
 * the rest of the app's reduced-motion-aware animation conventions.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("motion-safe:animate-pulse bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
