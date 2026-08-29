"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

const FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "changes_required", label: "Changes Required" },
  { value: "approved", label: "Approved" },
  { value: "delivering", label: "Delivering" },
  { value: "live", label: "Live" },
  { value: "rejected", label: "Rejected" },
  { value: "taken_down", label: "Taken Down" },
] as const;

export function ReleasesFilter({
  initialQ,
  initialStatus,
}: {
  initialQ: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus);

  function apply(nextStatus?: string) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const s = nextStatus !== undefined ? nextStatus : status;
    if (s) params.set("status", s);
    const qs = params.toString();
    router.push(qs ? `/dashboard/releases?${qs}` : "/dashboard/releases");
  }

  return (
    <div className="border border-border bg-card">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5"
      >
        <div className="flex-1">
          <Field
            id="q"
            label="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, artist, UPC, ISRC, or catalog number"
          />
        </div>
        <Button type="submit" className="h-11 px-5">
          <MagnifyingGlass size={16} weight="bold" aria-hidden />
          Search
        </Button>
      </form>

      <div className="flex gap-1 overflow-x-auto border-t border-border bg-muted/25 p-2">
        {FILTERS.map((f) => {
          const active = status === f.value;
          return (
            <button
              key={f.value || "all"}
              type="button"
              onClick={() => {
                setStatus(f.value);
                apply(f.value);
              }}
              className={
                active
                  ? "shrink-0 cursor-pointer bg-foreground px-3 py-2 text-xs font-semibold text-background transition-colors duration-200 ease-[var(--ease-rdistro)]"
                  : "shrink-0 cursor-pointer border border-transparent px-3 py-2 text-xs font-medium text-muted-foreground transition-colors duration-200 ease-[var(--ease-rdistro)] hover:border-border hover:bg-background hover:text-foreground"
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
