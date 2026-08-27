import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Tone-mapped banner extracted from the release detail page's four ad hoc
 * colored-border notice blocks ("Sent back to draft", "Changes Required",
 * "Rejected", "Action required") — same colors/dark-mode pairs, now a
 * reusable shell so those call sites keep their own conditional logic and
 * copy but share one visual component.
 */
const calloutVariants = cva("border p-4 text-sm", {
  variants: {
    tone: {
      info: "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200",
      warning:
        "border-amber-500/40 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200",
      danger:
        "border-red-200 bg-red-50 text-red-950 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200",
      success:
        "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200",
    },
  },
  defaultVariants: {
    tone: "info",
  },
});

function Callout({
  tone,
  icon,
  title,
  className,
  children,
}: React.PropsWithChildren<{
  tone?: VariantProps<typeof calloutVariants>["tone"];
  icon?: React.ReactNode;
  title?: string;
  className?: string;
}>) {
  return (
    <section role="status" className={cn(calloutVariants({ tone }), className)}>
      <div className="flex gap-3">
        {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          {title ? <p className="font-semibold">{title}</p> : null}
          <div className={cn("leading-relaxed", title && "mt-1")}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export { Callout, calloutVariants };
