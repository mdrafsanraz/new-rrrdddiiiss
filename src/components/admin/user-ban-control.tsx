"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function UserBanControl({ userId, userName, suspended, reason }: { userId: string; userName: string; suspended: boolean; reason: string | null }) {
  const router = useRouter();
  const [banReason, setBanReason] = useState(reason ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function updateAccess() {
    if (!suspended && banReason.trim().length < 5) {
      setError("Enter a reason with at least 5 characters.");
      return;
    }
    if (!window.confirm(suspended ? `Unban ${userName}?` : `Ban ${userName} and revoke account access?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(suspended ? { action: "unban" } : { action: "ban", reason: banReason.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not update account access.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update account access.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`border p-5 ${suspended ? "border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20" : "border-border bg-card"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold">Account access</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {suspended ? "This user is banned and cannot sign in or use an existing session." : "Ban this user to immediately prevent account access."}
          </p>
          {suspended && reason ? <p className="mt-2 text-sm text-red-800 dark:text-red-300">Reason: {reason}</p> : null}
        </div>
        <Button type="button" variant={suspended ? "outline" : "destructive"} className="h-9 px-4" disabled={busy} onClick={() => void updateAccess()}>
          {busy ? "Updating..." : suspended ? "Unban user" : "Ban user"}
        </Button>
      </div>
      {!suspended ? (
        <div className="mt-4 grid gap-1.5">
          <label htmlFor="ban-reason" className="text-xs font-semibold">Ban reason</label>
          <textarea id="ban-reason" value={banReason} onChange={(event) => setBanReason(event.target.value)} maxLength={500} rows={3} placeholder="Explain why this account is being banned" className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-800 dark:text-red-300" role="alert">{error}</p> : null}
    </section>
  );
}
