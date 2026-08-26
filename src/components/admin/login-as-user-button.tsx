"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function LoginAsUserButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setError("");
    if (reason.trim().length < 5) {
      setError("Provide a short reason (min 5 characters).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not login as user");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-8 px-3 text-xs"
        onClick={() => setOpen(true)}
      >
        Login as {userName.split(" ")[0]}
      </Button>
    );
  }

  return (
    <div className="w-64 space-y-2 rounded-md border border-border bg-card p-3">
      <p className="text-xs font-medium">Impersonate {userName}</p>
      <Field
        id="impReason"
        label="Reason"
        as="textarea"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        helper="Logged for audit. Required."
      />
      {error ? (
        <p className="text-[11px] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          className="h-8 flex-1 text-xs"
          disabled={loading}
          onClick={start}
        >
          {loading ? "Starting…" : "Start"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
