"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import { SUPPORT_STATUSES } from "@/lib/support";

export function AdminSupportStatusForm({
  ticketId,
  status: initial,
}: {
  ticketId: string;
  status: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
          const res = await fetch(`/api/admin/support/${ticketId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: value }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Update failed");
            setLoading(false);
            return;
          }
          setLoading(false);
          router.refresh();
        } catch {
          setError("Network error");
          setLoading(false);
        }
      }}
    >
      <div className="min-w-[160px] flex-1">
        <Field
          id="ticketStatus"
          label="Status"
          as="select"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          {SUPPORT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Field>
      </div>
      <Button type="submit" variant="outline" className="h-10 px-4" disabled={loading}>
        {loading ? "Saving…" : "Update status"}
      </Button>
      {error ? <p className="w-full text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
