"use client";

import { useEffect, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type ReviewSection = { id: string; label: string; detail: string; content: ReactNode };

/** Keep report panels mounted so switching tabs never starts another scan or fetch. */
export function ReleaseReviewWorkspace({ sections }: { sections: ReviewSection[] }) {
  const [active, setActive] = useState(sections[0].id);
  useEffect(() => {
    const followHash = () => {
      const target = window.location.hash.slice(1);
      const panel = document.getElementById(target)?.closest<HTMLElement>("[data-review-panel]");
      if (panel?.dataset.reviewPanel) setActive(panel.dataset.reviewPanel);
      else if (sections.some((section) => section.id === target)) setActive(target);
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, [sections]);

  function select(id: string) {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % sections.length
      : event.key === "ArrowLeft" ? (index - 1 + sections.length) % sections.length
      : event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    select(sections[next].id);
    document.getElementById(`tab-${sections[next].id}`)?.focus();
  }
  return <div className="min-w-0">
    <div role="tablist" aria-label="Release review workspace" className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1.5">
      {sections.map((section, index) => <button key={section.id} id={`tab-${section.id}`} type="button" role="tab" aria-selected={active === section.id} aria-controls={`panel-${section.id}`} tabIndex={active === section.id ? 0 : -1} onClick={() => select(section.id)} onKeyDown={(event) => navigate(event, index)} className={cn("min-w-fit flex-1 rounded-lg px-3 py-2.5 text-left text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", active === section.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-card/60 hover:text-foreground")}>
        {section.label}<span className="mt-0.5 hidden text-[10px] font-normal text-muted-foreground 2xl:block">{section.detail}</span>
      </button>)}
    </div>
    {sections.map((section) => <div key={section.id} id={`panel-${section.id}`} data-review-panel={section.id} role="tabpanel" aria-labelledby={`tab-${section.id}`} hidden={active !== section.id} tabIndex={0} className="space-y-5 outline-offset-4">{section.content}</div>)}
  </div>;
}

export function RefreshReleaseView() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60">{pending ? "Refreshing…" : "Refresh release data"}</button>;
}
