"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function CreateArtistForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  return (
    <form
      className="border border-border bg-card p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setStatus("loading");
        const res = await fetch("/api/artists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not create artist");
          setStatus("idle");
          return;
        }
        setName("");
        setStatus("idle");
        router.refresh();
      }}
    >
      <h2 className="text-sm font-semibold">Add artist</h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field
            id="artist-name"
            label="Artist name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="h-11 shrink-0 px-5"
          loading={status === "loading"}
        >
          {status === "loading" ? "Saving…" : "Add artist"}
        </Button>
      </div>
      {error ? (
        <p className="mt-3 text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
