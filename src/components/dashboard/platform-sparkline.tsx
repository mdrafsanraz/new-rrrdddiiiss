"use client";

import { motion, useReducedMotion } from "motion/react";

export function PlatformSparkline({ values }: { values: number[] }) {
  const reduceMotion = useReducedMotion();
  const points = values.length ? values.slice(-14) : [];
  const max = Math.max(...points, 1);

  if (!points.some((value) => value > 0)) {
    return <div className="mt-auto h-10 border-b border-dashed border-border/70" aria-hidden="true" />;
  }

  return (
    <div className="mt-auto flex h-11 items-end gap-1" aria-hidden="true">
      {points.map((value, index) => (
        <motion.span
          key={`${index}-${value}`}
          className="min-w-1 flex-1 rounded-t-sm bg-[#776bff]/30"
          style={{ height: `${Math.max(8, (value / max) * 100)}%`, transformOrigin: "bottom" }}
          initial={reduceMotion ? false : { transform: "scaleY(0)", opacity: 0 }}
          animate={{ transform: "scaleY(1)", opacity: 1 }}
          transition={{ duration: 0.45, delay: index * 0.025, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}
