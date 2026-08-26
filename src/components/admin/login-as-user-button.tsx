"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LoginAsUserButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        className="h-8 px-3 text-xs"
        disabled={loading}
        onClick={async () => {
          setError("");
          setLoading(true);
          try {
            const res = await fetch("/api/admin/impersonate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId }),
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
        }}
      >
        {loading ? "Switching…" : `Login as ${userName.split(" ")[0]}`}
      </Button>
      {error ? <p className="text-[11px] text-red-700">{error}</p> : null}
    </div>
  );
}
