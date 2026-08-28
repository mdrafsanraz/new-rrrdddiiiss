"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={cn(className)}
      initial={reduceMotion ? false : { opacity: 0, transform: "translateY(18px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.62, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function DashboardPulse() {
  const reduceMotion = useReducedMotion();
  return <motion.span aria-hidden="true" className="size-2 rounded-full bg-[#6f7cff]" animate={reduceMotion ? undefined : { opacity: [0.45, 1, 0.45], scale: [0.9, 1.12, 0.9] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />;
}
