"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AssignReleaseButton({ releaseId, assignedToMe }: { releaseId: string; assignedToMe: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function assign() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/releases/${releaseId}/moderate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assign_to_me" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Assignment failed");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Assignment failed");
    } finally {
      setBusy(false);
    }
  }

  if (assignedToMe) return <span className="text-[10px] font-semibold text-emerald-800">Assigned to you</span>;
  return <div className="text-right"><button type="button" disabled={busy} onClick={assign} className="h-7 border border-border px-2.5 text-[10px] font-semibold hover:border-foreground disabled:opacity-50">{busy ? "Assigning..." : "Assign to me"}</button>{error ? <p className="mt-1 max-w-36 text-[9px] text-red-700" role="alert">{error}</p> : null}</div>;
}
