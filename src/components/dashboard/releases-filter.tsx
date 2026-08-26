"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

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

  function apply(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    const qs = params.toString();
    router.push(qs ? `/dashboard/releases?${qs}` : "/dashboard/releases");
  }

  return (
    <form
      onSubmit={apply}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <Field
          id="q"
          label="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Title or catalog #"
        />
      </div>
      <div className="sm:w-48">
        <Field
          id="status"
          label="Status"
          as="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="in_review">In review</option>
          <option value="changes_required">Changes required</option>
          <option value="live">Live</option>
        </Field>
      </div>
      <Button type="submit" className="h-11 px-5">
        Filter
      </Button>
    </form>
  );
}
