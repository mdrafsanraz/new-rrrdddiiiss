"use client";

/**
 * Real, animated 6-month trend of the user's own catalog activity —
 * "created" vs "submitted" per month, both derived from Release.createdAt /
 * Release.submittedAt (aggregated server-side in the dashboard page).
 * Uses the same charting primitives already proven on the marketing site's
 * hero illustration (src/components/site/illustrations.tsx) — nothing new
 * introduced, no fabricated data.
 */

import { ChartLine } from "@phosphor-icons/react";
import { Area } from "@/components/charts/area";
import { AreaChart } from "@/components/charts/area-chart";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { EmptyState } from "@/components/ui/empty-state";

const SUBMITTED_COLOR = "oklch(0.596 0.145 163)";

export type ReleaseTrendPoint = {
  date: Date;
  created: number;
  submitted: number;
};

export function ReleasesTrendChart({ data }: { data: ReleaseTrendPoint[] }) {
  const total = data.reduce((sum, d) => sum + d.created + d.submitted, 0);

  if (total === 0) {
    return (
      <EmptyState
        icon={<ChartLine size={22} weight="regular" aria-hidden />}
        title="No activity yet"
        description="Created and submitted releases will chart here once you get going."
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 px-1 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 shrink-0 bg-primary" aria-hidden />
          Created
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 shrink-0"
            style={{ background: SUBMITTED_COLOR }}
            aria-hidden
          />
          Submitted for review
        </span>
      </div>
      <div className="mt-3">
        <AreaChart
          data={data}
          aspectRatio="2.6 / 1"
          animationDuration={900}
          margin={{ top: 16, right: 12, bottom: 28, left: 12 }}
        >
          <Grid horizontal />
          <XAxis numTicks={data.length} />
          <Area
            dataKey="created"
            fill="var(--primary)"
            stroke="var(--primary)"
            fillOpacity={0.14}
            strokeWidth={2}
          />
          <Area
            dataKey="submitted"
            fill={SUBMITTED_COLOR}
            stroke={SUBMITTED_COLOR}
            fillOpacity={0.1}
            strokeWidth={2}
          />
          <ChartTooltip />
        </AreaChart>
      </div>
    </div>
  );
}
