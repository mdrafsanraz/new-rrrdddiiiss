"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Disc,
  Headset,
  Pulse,
  ShieldWarning,
  UsersThree,
  Waveform,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

function useCountUp(target: number, enabled: boolean) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const start = performance.now();
    const duration = 700;
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled]);

  return enabled ? value : target;
}

const ICONS = {
  users: UsersThree,
  releases: Disc,
  review: Pulse,
  qc: ShieldWarning,
  live: Waveform,
  support: Headset,
} as const;

export function PlatformSummaryCards({
  items,
}: {
  items: Array<{
    key: keyof typeof ICONS;
    label: string;
    value: number;
    hint: string;
    href: string;
  }>;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {items.map((item, i) => (
        <SummaryCard
          key={item.key}
          item={item}
          index={i}
          reduce={Boolean(reduce)}
        />
      ))}
    </div>
  );
}

function SummaryCard({
  item,
  index,
  reduce,
}: {
  item: {
    key: keyof typeof ICONS;
    label: string;
    value: number;
    hint: string;
    href: string;
  };
  index: number;
  reduce: boolean;
}) {
  const Icon = ICONS[item.key];
  const n = useCountUp(item.value, !reduce);

  return (
    <Link
      href={item.href}
      className="group rounded-md border border-border bg-card p-3.5 transition-colors hover:border-foreground/25"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {item.label}
        </p>
        <motion.span
          className="text-muted-foreground group-hover:text-foreground"
          animate={
            reduce
              ? undefined
              : item.key === "review"
                ? { opacity: [0.55, 1, 0.55] }
                : item.key === "live"
                  ? { scaleY: [0.7, 1, 0.75, 1] }
                  : item.key === "qc"
                    ? { rotate: [0, 8, -8, 0] }
                    : undefined
          }
          transition={
            reduce
              ? undefined
              : {
                  duration: item.key === "review" ? 2.4 : 2.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.05,
                }
          }
          style={{ transformOrigin: "bottom" }}
        >
          <Icon className="size-4" weight="duotone" />
        </motion.span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
        {n.toLocaleString()}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{item.hint}</p>
    </Link>
  );
}

export function HealthDot({
  state,
}: {
  state: "operational" | "degraded" | "down" | "unknown";
}) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 rounded-full",
        state === "operational" && "bg-emerald-600",
        state === "degraded" && "bg-amber-500",
        state === "down" && "bg-red-600",
        state === "unknown" && "bg-muted-foreground/40"
      )}
      aria-hidden
    />
  );
}
