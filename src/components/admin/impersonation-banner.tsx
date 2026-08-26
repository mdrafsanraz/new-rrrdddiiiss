"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner({
  targetName,
  adminName,
}: {
  targetName: string;
  adminName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <p>
          <span className="font-semibold">{adminName}</span> is logged in as{" "}
          <span className="font-semibold">{targetName}</span>
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-8 border-amber-400 bg-white px-3 text-xs"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const res = await fetch("/api/admin/impersonate/stop", {
                method: "POST",
              });
              if (res.ok) {
                router.push("/admin/users");
                router.refresh();
              }
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Returning…" : "Return to admin"}
        </Button>
      </div>
    </div>
  );
}
