"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RemoveAdminButton({
  adminId,
  adminName,
}: {
  adminId: string;
  adminName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        className="h-8 px-3 text-xs text-red-800"
        disabled={loading}
        onClick={async () => {
          if (
            !confirm(
              `Remove admin access for ${adminName}? They will become a normal user.`
            )
          ) {
            return;
          }
          setError("");
          setLoading(true);
          try {
            const res = await fetch(`/api/admin/admins/${adminId}`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ confirm: true }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error ?? "Failed");
              setLoading(false);
              return;
            }
            router.refresh();
          } catch {
            setError("Network error");
            setLoading(false);
          }
        }}
      >
        {loading ? "Removing…" : "Remove admin"}
      </Button>
      {error ? <p className="text-[11px] text-red-700">{error}</p> : null}
    </div>
  );
}
