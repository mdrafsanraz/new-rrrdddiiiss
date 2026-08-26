"use client";

import { CheckCircle, MusicNote, Play, TrendUp } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { AsciiEqualizer } from "@/components/site/ascii-art";
import { AreaChart } from "@/components/charts/area-chart";
import { Area } from "@/components/charts/area";
import { Grid } from "@/components/charts/grid";
import { cn } from "@/lib/utils";

/* Deterministic stream data for the analytics chart */
const streamData = [
  4200, 5100, 4800, 6400, 7200, 6900, 8600, 9800, 9200, 11400, 12800, 12100,
  14600, 16200, 15400, 18800,
].map((value, index) => ({
  date: new Date(2026, 0, index * 7 + 1),
  streams: value,
}));

const releaseCovers = [
  { from: "oklch(0.65 0.2 300)", to: "oklch(0.5 0.22 260)", title: "Midnight Run", artist: "KIYO" },
  { from: "oklch(0.75 0.16 60)", to: "oklch(0.6 0.2 25)", title: "Golden Hour", artist: "Ayla Reyes" },
  { from: "oklch(0.7 0.15 180)", to: "oklch(0.5 0.18 230)", title: "Deep Water", artist: "North Ave" },
];

function ReleaseCover({
  from,
  to,
  className,
}: {
  from: string;
  to: string;
  className?: string;
}) {
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-lg", className)}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <MusicNote
        className="absolute right-1.5 bottom-1.5 size-3.5 text-white/70"
        weight="fill"
      />
    </div>
  );
}

/**
 * Hero illustration: a floating dashboard mockup with a live streams chart
 * and release cards. Product-forward, inspired by distributor dashboards.
 */
export function HeroIllustration({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("relative", className)} aria-hidden="true">
      {/* Main dashboard card */}
      <motion.div
        className="relative z-10 rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/5"
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Total streams
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight">1,284,410</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <TrendUp className="size-3.5" weight="bold" />
            +32%
          </span>
        </div>
        <div className="mt-4">
          <AreaChart
            data={streamData}
            aspectRatio="5 / 2"
            animationDuration={900}
          >
            <Grid horizontal />
            <Area
              dataKey="streams"
              fill="var(--primary)"
              stroke="var(--primary)"
              fillOpacity={0.14}
              strokeWidth={2}
            />
          </AreaChart>
        </div>
        <div className="mt-5 grid gap-2.5">
          {releaseCovers.slice(0, 2).map((release, index) => (
            <motion.div
              key={release.title}
              className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
              initial={reduceMotion ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.4 + index * 0.15,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <ReleaseCover
                from={release.from}
                to={release.to}
                className="size-9"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {release.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {release.artist}
                </p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-emerald-600/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <CheckCircle className="size-3" weight="fill" />
                Live
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Floating now-playing chip */}
      <motion.div
        className="absolute -left-4 top-10 z-20 hidden items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-lg md:flex"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={
          reduceMotion
            ? { opacity: 1 }
            : { opacity: 1, y: [0, -8, 0] }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                opacity: { delay: 0.7, duration: 0.4 },
                y: {
                  delay: 1,
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }
        }
      >
        <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
          <Play className="size-3.5" weight="fill" />
        </span>
        <div>
          <p className="text-xs font-semibold">On Spotify</p>
          <p className="text-[11px] text-muted-foreground">in 24-48 hours</p>
        </div>
        <AsciiEqualizer bars={6} className="text-sm text-[#a855f7]" />
      </motion.div>

      {/* Floating royalty chip */}
      <motion.div
        className="absolute -right-3 bottom-14 z-20 hidden rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-lg md:block"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={
          reduceMotion
            ? { opacity: 1 }
            : { opacity: 1, y: [0, 8, 0] }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                opacity: { delay: 0.9, duration: 0.4 },
                y: {
                  delay: 1.2,
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }
        }
      >
        <p className="text-xs font-medium text-muted-foreground">
          Royalty payout
        </p>
        <p className="text-lg font-bold tracking-tight text-emerald-700">
          $2,841.20
        </p>
        <p className="text-[11px] font-semibold text-emerald-700">
          100% yours
        </p>
      </motion.div>
    </div>
  );
}

/** Analytics panel: chart in a dashboard frame */
export function AnalyticsIllustration({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-6",
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Streams by week</p>
        <span className="flex items-center gap-1 rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <TrendUp className="size-3.5" weight="bold" />
          +32%
        </span>
      </div>
      <div className="mt-4">
        <AreaChart data={streamData} aspectRatio="2 / 1" animationDuration={900}>
          <Grid horizontal />
          <Area
            dataKey="streams"
            fill="var(--primary)"
            stroke="var(--primary)"
            fillOpacity={0.14}
            strokeWidth={2}
          />
        </AreaChart>
      </div>
    </div>
  );
}

/** Release queue rows animating in */
export function ReleaseQueueIllustration({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const statuses = [
    { label: "Live", tone: "text-emerald-700 bg-emerald-600/10" },
    { label: "In review", tone: "text-amber-600 bg-amber-500/10" },
    { label: "Scheduled", tone: "text-primary bg-primary/10" },
  ];

  return (
    <div
      className={cn(
        "grid gap-3 rounded-2xl border border-border bg-card p-6",
        className
      )}
      aria-hidden="true"
    >
      {releaseCovers.map((release, index) => (
        <motion.div
          key={release.title}
          className="flex items-center gap-3.5 rounded-xl border border-border bg-background px-4 py-3"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{
            delay: index * 0.12,
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <ReleaseCover
            from={release.from}
            to={release.to}
            className="size-11"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{release.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {release.artist}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              statuses[index].tone
            )}
          >
            {statuses[index].label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/** Royalty split bars */
export function RoyaltySplitIllustration({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const splits = [
    { name: "You", pct: 70, bar: "bg-emerald-600", label: "text-emerald-700" },
    { name: "Producer", pct: 20, bar: "bg-primary", label: "text-primary" },
    { name: "Feature", pct: 10, bar: "bg-primary", label: "text-primary" },
  ];

  return (
    <div
      className={cn(
        "grid gap-5 rounded-2xl border border-border bg-card p-6",
        className
      )}
      aria-hidden="true"
    >
      <p className="text-sm font-semibold">Royalty splits</p>
      {splits.map((split, index) => (
        <div key={split.name} className="grid gap-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{split.name}</span>
            <span className={cn("font-bold", split.label)}>{split.pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn("h-full rounded-full", split.bar)}
              initial={reduceMotion ? { width: `${split.pct}%` } : { width: 0 }}
              whileInView={{ width: `${split.pct}%` }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{
                delay: index * 0.12,
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Store delivery grid */
export function StoreGridIllustration({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const tiles = [
    "Spotify",
    "Apple Music",
    "YouTube",
    "Amazon",
    "Tidal",
    "Deezer",
    "TikTok",
    "Instagram",
    "+142 more",
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2.5 rounded-2xl border border-border bg-card p-6",
        className
      )}
      aria-hidden="true"
    >
      {tiles.map((tile, index) => (
        <motion.div
          key={tile}
          className={cn(
            "grid min-h-16 place-items-center rounded-xl border border-border bg-background px-2 py-3 text-center text-xs font-semibold",
            index === tiles.length - 1 && "bg-primary/5 text-primary"
          )}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{
            delay: index * 0.05,
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {tile}
        </motion.div>
      ))}
    </div>
  );
}

export function FeatureArt({
  kind,
  className,
}: {
  kind: "analytics" | "queue" | "royalty" | "stores";
  className?: string;
}) {
  if (kind === "queue") return <ReleaseQueueIllustration className={className} />;
  if (kind === "royalty") return <RoyaltySplitIllustration className={className} />;
  if (kind === "stores") return <StoreGridIllustration className={className} />;
  return <AnalyticsIllustration className={className} />;
}
