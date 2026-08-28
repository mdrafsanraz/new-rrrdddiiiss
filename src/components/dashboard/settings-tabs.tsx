"use client";

import { useState, type ReactNode } from "react";
import { LockKey, UserCircle } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "profile", label: "Personal details", note: "Identity and contact", icon: UserCircle },
  { id: "security", label: "Password & security", note: "Sign-in protection", icon: LockKey },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function SettingsTabs({ profile, password }: { profile: ReactNode; password: ReactNode }) {
  const [tab, setTab] = useState<Tab>("profile");
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      <div role="tablist" aria-label="Account settings" className="grid gap-2 rounded-2xl border border-border bg-card p-2 sm:grid-cols-2 lg:sticky lg:top-24 lg:grid-cols-1">
        {TABS.map((item) => { const Icon = item.icon; const active = tab === item.id; return <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => setTab(item.id)} className={cn("group flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-[background-color,color,transform] duration-300 active:translate-y-px", active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground")}><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", active ? "bg-background/10 text-primary" : "bg-muted text-muted-foreground group-hover:text-foreground")}><Icon size={18} weight="duotone" /></span><span><span className="block text-sm font-semibold">{item.label}</span><span className={cn("mt-0.5 block text-[11px]", active ? "text-background/50" : "text-muted-foreground")}>{item.note}</span></span></button>; })}
      </div>
      <AnimatePresence mode="wait" initial={false}><motion.div key={tab} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -5 }} transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}>{tab === "profile" ? profile : password}</motion.div></AnimatePresence>
    </div>
  );
}
