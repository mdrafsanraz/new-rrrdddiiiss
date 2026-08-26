"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function NewReleaseForm({
  artists,
  defaultArtistId,
}: {
  artists: { id: string; name: string }[];
  defaultArtistId?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [catalogNumber, setCatalogNumber] = useState("");
  const [artistId, setArtistId] = useState(
    defaultArtistId && artists.some((a) => a.id === defaultArtistId)
      ? defaultArtistId
      : artists[0]?.id ?? ""
  );
  const [releaseDate, setReleaseDate] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  return (
    <form
      className="grid gap-5 rounded-xl border border-border bg-card p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setStatus("loading");
        const res = await fetch("/api/releases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            catalogNumber,
            artistId,
            releaseDate: releaseDate || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not create release");
          setStatus("idle");
          return;
        }
        router.push(`/dashboard/releases/${data.release.id}`);
        router.refresh();
      }}
    >
      <Field
        id="title"
        label="Release title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Field
        id="catalogNumber"
        label="Catalog number"
        required
        value={catalogNumber}
        onChange={(e) => setCatalogNumber(e.target.value)}
        helper="Your unique catalog ID for this release"
      />
      <Field
        id="artistId"
        label="Primary artist"
        as="select"
        required
        value={artistId}
        onChange={(e) => setArtistId(e.target.value)}
      >
        {artists.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Field>
      <Field
        id="releaseDate"
        label="Release date"
        type="date"
        value={releaseDate}
        onChange={(e) => setReleaseDate(e.target.value)}
      />
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-11" disabled={status === "loading"}>
        {status === "loading" ? "Creating…" : "Create draft"}
      </Button>
    </form>
  );
}
