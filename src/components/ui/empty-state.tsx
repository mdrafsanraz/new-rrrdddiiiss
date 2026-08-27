import * as React from "react";
import { cn } from "@/lib/utils";

/** Extracted from the releases list's empty block — same visual shape. */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-5 py-14 text-center", className)}>
      {icon ? (
        <div className="mx-auto flex size-12 items-center justify-center border border-border bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <p className="mt-4 font-semibold">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
