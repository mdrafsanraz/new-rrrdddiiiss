import { formatLimit, usagePercent } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function UsageMeter({
  label,
  used,
  limit,
  hint,
}: {
  label: string;
  used: number;
  limit: number | null;
  hint?: string;
}) {
  const pct = usagePercent(used, limit);
  const capped = limit !== null && used >= limit;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span
          className={cn(
            "tabular-nums text-muted-foreground",
            capped && "font-semibold text-amber-700"
          )}
        >
          {used} / {formatLimit(limit)}
          {limit === null ? "" : " used"}
        </span>
      </div>
      {limit !== null ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              capped ? "bg-amber-600" : "bg-primary"
            )}
            style={{ width: `${Math.max(pct, used > 0 ? 6 : 0)}%` }}
          />
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">No cap on this plan</p>
      )}
      {hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
