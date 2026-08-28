"use client";

import NumberFlow from "@number-flow/react";
import { useReducedMotion } from "motion/react";

export function AnimatedMoney({ value, currency = "USD", className }: { value: number; currency?: string; className?: string }) {
  const reduceMotion = useReducedMotion();
  return <NumberFlow value={value} format={{ style: "currency", currency }} animated={!reduceMotion} className={className} />;
}
