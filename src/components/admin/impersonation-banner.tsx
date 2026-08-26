"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner({
  targetName,
  targetEmail,
  adminName,
}: {
  targetName: string;
  targetEmail: string;
  adminName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <div
      className="sticky top-0 z-50 border-b-2 border-amber-500 bg-amber-400 px-4 py-3 text-sm text-amber-950"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">
          Impersonating {targetEmail}
          <span className="ml-2 font-normal">
            ({targetName}) · staff: {adminName}
          </span>
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-8 border-amber-700 bg-white px-3 text-xs font-semibold"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const res = await fetch("/api/admin/impersonate/stop", {
                method: "POST",
              });
              if (res.ok) {
                router.push("/admin");
                router.refresh();
              }
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Exiting…" : "Exit Impersonation"}
        </Button>
      </div>
    </div>
  );
}
