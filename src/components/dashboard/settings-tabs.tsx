"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const TABS = ["Profile", "Password", "Plan & Billing"] as const;
type Tab = (typeof TABS)[number];

export function SettingsTabs({
  profile,
  password,
  billing,
}: {
  profile: ReactNode;
  password: ReactNode;
  billing: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("Profile");
  const reduceMotion = useReducedMotion();

  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={
              "shrink-0 cursor-pointer border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-200 ease-[var(--ease-rdistro)] " +
              (tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === "Profile" ? profile : null}
            {tab === "Password" ? password : null}
            {tab === "Plan & Billing" ? billing : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
