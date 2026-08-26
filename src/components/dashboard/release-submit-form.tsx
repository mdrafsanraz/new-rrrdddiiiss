"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import {
  ARTWORK_AI_USAGE,
  CONTENT_TYPES,
  EXPLICIT_OPTIONS,
  PRIMARY_GENRES,
} from "@/lib/releases/constants";

type ArtistOption = { id: string; name: string; locked: boolean };

export function ReleaseSubmitForm({
  artists,
  defaultArtistId,
}: {
  artists: ArtistOption[];
  defaultArtistId?: string;
}) {
  const router = useRouter();
  const [artistId, setArtistId] = useState(
    defaultArtistId && artists.some((a) => a.id === defaultArtistId)
      ? defaultArtistId
      : artists[0]?.id ?? ""
  );
  const [title, setTitle] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [catalogNumber, setCatalogNumber] = useState("");
  const [contentType, setContentType] = useState<string>("Single");
  const [primaryGenre, setPrimaryGenre] = useState<string>("Pop");
  const [releaseDate, setReleaseDate] = useState("");
  const [artworkAiUsage, setArtworkAiUsage] = useState<string>("none");
  const [explicit, setExplicit] = useState<string>("off");
  const [upc, setUpc] = useState("");
  const [artworkName, setArtworkName] = useState("");
  const [audioName, setAudioName] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  const selected = artists.find((a) => a.id === artistId);

  return (
    <form
      className="space-y-8"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setStatus("loading");
        try {
          const formEl = event.currentTarget;
          const fd = new FormData(formEl);
          // Ensure controlled fields win over any stale DOM values.
          fd.set("artistId", artistId);
          fd.set("title", title);
          fd.set("trackTitle", trackTitle || title);
          fd.set("catalogNumber", catalogNumber);
          fd.set("contentType", contentType);
          fd.set("primaryGenre", primaryGenre);
          fd.set("releaseDate", releaseDate);
          fd.set("artworkAiUsage", artworkAiUsage);
          fd.set("explicit", explicit);
          fd.set("upc", upc);

          const res = await fetch("/api/releases/submit", {
            method: "POST",
            body: fd,
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Submit failed");
            setStatus("idle");
            return;
          }
          router.push(`/dashboard/releases/${data.release.id}`);
          router.refresh();
        } catch {
          setError("Network error. Try again.");
          setStatus("idle");
        }
      }}
    >
      <section className="grid gap-5 rounded-xl border border-border bg-card p-6">
        <div>
          <h2 className="text-sm font-semibold">Artist</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            After you submit, this artist&apos;s profile fields are locked and
            cannot be edited.
          </p>
        </div>
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
              {a.locked ? " (locked)" : ""}
            </option>
          ))}
        </Field>
        {selected?.locked ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            This artist is already locked from a previous submission. You can
            still release under them; their name and profile stay fixed.
          </p>
        ) : null}
      </section>

      <section className="grid gap-5 rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Release</h2>
        <Field
          id="title"
          label="Release title"
          required
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!trackTitle || trackTitle === title) {
              setTrackTitle(e.target.value);
            }
          }}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="catalogNumber"
            label="Catalog number"
            required
            maxLength={20}
            value={catalogNumber}
            onChange={(e) => setCatalogNumber(e.target.value)}
            helper="LabelGrid cat — your unique catalog ID"
          />
          <Field
            id="contentType"
            label="Content type"
            as="select"
            required
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="primaryGenre"
            label="Primary genre"
            as="select"
            required
            value={primaryGenre}
            onChange={(e) => setPrimaryGenre(e.target.value)}
          >
            {PRIMARY_GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Field>
          <Field
            id="releaseDate"
            label="Release date"
            type="date"
            required
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            helper="Interpreted as UTC for distribution"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="artworkAiUsage"
            label="Artwork AI usage"
            as="select"
            required
            value={artworkAiUsage}
            onChange={(e) => setArtworkAiUsage(e.target.value)}
            helper="Required by LabelGrid artwork_ai_usage"
          >
            {ARTWORK_AI_USAGE.map((v) => (
              <option key={v} value={v}>
                {v === "none"
                  ? "None"
                  : v === "some"
                    ? "Some"
                    : v === "material"
                      ? "Material"
                      : "All"}
              </option>
            ))}
          </Field>
          <Field
            id="explicit"
            label="Explicit content"
            as="select"
            required
            value={explicit}
            onChange={(e) => setExplicit(e.target.value)}
          >
            {EXPLICIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Field>
        </div>
        <Field
          id="upc"
          label="UPC / barcode (optional)"
          maxLength={13}
          value={upc}
          onChange={(e) => setUpc(e.target.value)}
          helper="Leave blank to auto-generate later"
        />
      </section>

      <section className="grid gap-5 rounded-xl border border-border bg-card p-6">
        <div>
          <h2 className="text-sm font-semibold">Artwork</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Square cover, min 1400×1400 recommended. JPEG, PNG, or WebP · max
            10 MB. Uploaded to LabelGrid as a draft; you see “Admin review”
            until approved.
          </p>
        </div>
        <div className="grid gap-2">
          <label htmlFor="artwork" className="text-sm font-medium">
            Cover art
          </label>
          <input
            id="artwork"
            name="artwork"
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            required
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            onChange={(e) =>
              setArtworkName(e.target.files?.[0]?.name ?? "")
            }
          />
          {artworkName ? (
            <p className="text-xs text-muted-foreground">{artworkName}</p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 rounded-xl border border-border bg-card p-6">
        <div>
          <h2 className="text-sm font-semibold">Track</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Stereo master: WAV, FLAC, or MP3 · max 200 MB. Stored on LabelGrid
            as draft audio; submitted for LG review only after admin approval.
          </p>
        </div>
        <Field
          id="trackTitle"
          label="Track title"
          required
          value={trackTitle}
          onChange={(e) => setTrackTitle(e.target.value)}
        />
        <div className="grid gap-2">
          <label htmlFor="audio" className="text-sm font-medium">
            Audio file
          </label>
          <input
            id="audio"
            name="audio"
            type="file"
            accept="audio/wav,audio/x-wav,audio/flac,audio/mpeg,audio/mp3,.wav,.flac,.mp3"
            required
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            onChange={(e) => setAudioName(e.target.files?.[0]?.name ?? "")}
          />
          {audioName ? (
            <p className="text-xs text-muted-foreground">{audioName}</p>
          ) : null}
        </div>
      </section>

      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="h-11 px-6" disabled={status === "loading"}>
          {status === "loading" ? "Uploading & submitting…" : "Submit for admin review"}
        </Button>
        <Link
          href="/dashboard/releases"
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
