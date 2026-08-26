"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

type ArtistFields = {
  id: string;
  name: string;
  fullName: string;
  email: string;
  location: string;
  bioShort: string;
  locked: boolean;
};

export function EditArtistForm({ artist }: { artist: ArtistFields }) {
  const router = useRouter();
  const [form, setForm] = useState(artist);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saved">("idle");
  const locked = artist.locked;

  return (
    <form
      className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (locked) return;
        setError("");
        setStatus("loading");
        const res = await fetch(`/api/artists/${artist.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Update failed");
          setStatus("idle");
          return;
        }
        setStatus("saved");
        router.refresh();
      }}
    >
      <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Artist details</h2>
        {locked ? (
          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
            Locked after release submit
          </span>
        ) : null}
      </div>
      {locked ? (
        <p className="text-sm text-muted-foreground md:col-span-2">
          This artist was used on a submitted release, so profile fields are
          read-only. You can still submit new releases under this name.
        </p>
      ) : null}
      <Field
        id="name"
        label="Artist name"
        required
        disabled={locked}
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <Field
        id="fullName"
        label="Legal name"
        disabled={locked}
        value={form.fullName}
        onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
      />
      <Field
        id="email"
        label="Email"
        type="email"
        disabled={locked}
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
      />
      <Field
        id="location"
        label="Location"
        disabled={locked}
        value={form.location}
        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
      />
      <div className="md:col-span-2">
        <Field
          id="bioShort"
          label="Short bio"
          as="textarea"
          disabled={locked}
          value={form.bioShort}
          onChange={(e) => setForm((f) => ({ ...f, bioShort: e.target.value }))}
        />
      </div>
      {error ? (
        <p className="text-sm font-medium text-red-700 md:col-span-2" role="alert">
          {error}
        </p>
      ) : null}
      {!locked ? (
        <div className="flex items-center gap-3 md:col-span-2">
          <Button
            type="submit"
            className="h-10 px-5"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Saving…" : "Save changes"}
          </Button>
          {status === "saved" ? (
            <span className="text-sm text-emerald-700">Saved</span>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
