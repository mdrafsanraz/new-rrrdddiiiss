"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WithdrawalStatusForm({
  id,
  current,
}: {
  id: string;
  current: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(
    current === "pending" ? "processing" : current,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function update() {
    if (
      ["paid", "declined"].includes(status) &&
      !window.confirm(
        `Mark this withdrawal ${status}? This changes the user's wallet balance state.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/royalties/withdrawals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Update failed.");
    else router.refresh();
    setBusy(false);
  }
  if (["paid", "declined"].includes(current))
    return (
      <span className="text-xs capitalize text-muted-foreground">
        {current}
      </span>
    );
  return (
    <div>
      <div className="flex gap-2">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="declined">Declined</option>
        </select>
        <button
          type="button"
          onClick={() => void update()}
          disabled={busy}
          className="h-8 rounded-md bg-foreground px-2.5 text-[10px] font-semibold text-background disabled:opacity-50"
        >
          {busy ? "Saving…" : "Update"}
        </button>
      </div>
      {error ? <p className="mt-1 text-[10px] text-red-600">{error}</p> : null}
    </div>
  );
}
