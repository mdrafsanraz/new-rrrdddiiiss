"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/site/field";
import { CheckCircle, LockKey, UserCircle } from "@phosphor-icons/react";

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
      className="overflow-hidden rounded-2xl border border-border bg-card"
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><UserCircle size={19} weight="duotone" /></div><div><h2 className="font-semibold">Profile details</h2><p className="mt-0.5 text-xs text-muted-foreground">Identity and contact information</p></div></div>
        {locked ? <Badge tone="warning"><LockKey size={11} weight="bold" /> Locked after submission</Badge> : null}
      </div>
      <div className="grid gap-5 p-5 sm:p-7 md:grid-cols-2">
      {locked ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-sm leading-6 text-muted-foreground md:col-span-2">
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
        <p className="text-sm font-medium text-destructive md:col-span-2" role="alert">
          {error}
        </p>
      ) : null}
      {!locked ? (
        <div className="flex items-center gap-3 border-t border-border pt-5 md:col-span-2">
          <Button
            type="submit"
            className="h-10 px-5"
            loading={status === "loading"}
          >
            {status === "loading" ? "Saving…" : "Save changes"}
          </Button>
          {status === "saved" ? (
            <span className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle size={15} weight="fill" />Saved</span>
          ) : null}
        </div>
      ) : null}
      </div>
    </form>
  );
}
