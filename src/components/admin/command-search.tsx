"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, SpinnerGap } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type SearchHit = {
  type: "user" | "release" | "artist";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export function AdminCommandSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);

  function close() {
    setQ("");
    setHits([]);
    onOpenChange(false);
  }

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(async () => {
      if (q.trim().length < 2) {
        setHits([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/search?q=${encodeURIComponent(q.trim())}`
        );
        const data = await res.json();
        setHits(Array.isArray(data.results) ? data.results : []);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => window.clearTimeout(t);
  }, [q, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      onClick={close}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <MagnifyingGlass className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email, title, UPC, ISRC, LabelGrid ID…"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              if (e.key === "Enter" && hits[0]) {
                close();
                router.push(hits[0].href);
              }
            }}
          />
          {loading ? (
            <SpinnerGap className="size-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {hits.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-muted-foreground">
              {q.trim().length < 2
                ? "Type at least 2 characters"
                : loading
                  ? "Searching…"
                  : "No results"}
            </li>
          ) : (
            hits.map((hit) => (
              <li key={`${hit.type}-${hit.id}`}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full cursor-pointer flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-muted"
                  )}
                  onClick={() => {
                    close();
                    router.push(hit.href);
                  }}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {hit.type}
                    </span>
                    {hit.title}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {hit.subtitle}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
