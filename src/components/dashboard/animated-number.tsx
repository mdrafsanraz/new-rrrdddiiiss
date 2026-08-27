"use client";

import NumberFlow from "@number-flow/react";

/**
 * Client leaf for animated metric counters — NumberFlow already respects
 * prefers-reduced-motion internally (see its `usePrefersReducedMotion`),
 * so no extra guard is needed here. Kept as its own tiny client island so
 * server-rendered pages (e.g. the dashboard home page) don't need a
 * client boundary just to show an animated number.
 */
export function AnimatedNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return <NumberFlow value={value} className={className} />;
}
