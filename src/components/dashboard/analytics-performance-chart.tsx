"use client";

import { ChartLine } from "@phosphor-icons/react";
import { Area } from "@/components/charts/area";
import { AreaChart } from "@/components/charts/area-chart";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { EmptyState } from "@/components/ui/empty-state";

const LISTENER_COLOR = "oklch(0.59 0.15 164)";

export type AnalyticsPoint = {
  date: Date;
  streams: number;
  listeners: number;
};

export function AnalyticsPerformanceChart({ data }: { data: AnalyticsPoint[] }) {
  if (!data.some((point) => point.streams || point.listeners)) {
    return (
      <EmptyState
        icon={<ChartLine size={22} weight="regular" aria-hidden />}
        title="No performance data yet"
        description="Streams and listeners will appear after platforms begin reporting this release."
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" aria-hidden /> Streams
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: LISTENER_COLOR }} aria-hidden />
          Listeners
        </span>
      </div>
      <div className="mt-4">
        <AreaChart
          data={data}
          aspectRatio="2.45 / 1"
          animationDuration={850}
          margin={{ top: 14, right: 12, bottom: 30, left: 12 }}
        >
          <Grid horizontal />
          <XAxis numTicks={6} />
          <Area
            dataKey="streams"
            fill="var(--primary)"
            stroke="var(--primary)"
            fillOpacity={0.14}
            strokeWidth={2}
          />
          <Area
            dataKey="listeners"
            fill={LISTENER_COLOR}
            stroke={LISTENER_COLOR}
            fillOpacity={0.08}
            strokeWidth={2}
          />
          <ChartTooltip />
        </AreaChart>
      </div>
    </div>
  );
}
