"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import {
  ARTISTIC_ROLES,
  ARTWORK_AI_USAGE,
  COMMERCIAL_SAMPLES,
  COMPOSITION_TYPES,
  CONTENT_TYPES,
  CONTRIBUTOR_ROLE_KEYS,
  EXPLICIT_OPTIONS,
  LOCALES,
  PRIMARY_GENRES,
  RECORDING_COUNTRIES,
  type ContributorDraft,
} from "@/lib/releases/constants";
import { cn } from "@/lib/utils";

type ArtistOption = { id: string; name: string; locked: boolean };

const STEPS = [
  { id: "artist", label: "Artist" },
  { id: "release", label: "Release" },
  { id: "artwork", label: "Artwork" },
  { id: "track", label: "Track" },
  { id: "credits", label: "Credits" },
  { id: "review", label: "Review" },
] as const;

const currentYear = new Date().getFullYear();

function newContributor(): ContributorDraft {
  return {
    id: crypto.randomUUID(),
    firstName: "",
    lastName: "",
    roles: ["Composer", "Lyricist"],
  };
}

function StepNav({
  step,
  onJump,
}: {
  step: number;
  onJump: (i: number) => void;
}) {
  return (
    <ol className="flex flex-wrap gap-2">
      {STEPS.map((s, i) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onJump(i)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {i + 1}. {s.label}
          </button>
        </li>
      ))}
    </ol>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ReleaseBuilder({
  artists,
  defaultArtistId,
}: {
  artists: ArtistOption[];
  defaultArtistId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [artistId, setArtistId] = useState(
    defaultArtistId && artists.some((a) => a.id === defaultArtistId)
      ? defaultArtistId
      : artists[0]?.id ?? ""
  );
  const [artisticRole, setArtisticRole] = useState("MainArtist");
  const selected = artists.find((a) => a.id === artistId);

  const [title, setTitle] = useState("");
  const [mixVersion, setMixVersion] = useState("");
  const [contentType, setContentType] = useState("Single");
  const [primaryGenre, setPrimaryGenre] = useState("Pop");
  const [preferredLocalization, setPreferredLocalization] = useState("en");
  const [releaseDate, setReleaseDate] = useState("");
  const [artworkAiUsage, setArtworkAiUsage] = useState("none");
  const [explicit, setExplicit] = useState("off");
  const [barcode, setBarcode] = useState("");
  const [clineYear, setClineYear] = useState(String(currentYear));
  const [clineName, setClineName] = useState("");
  const [plineYear, setPlineYear] = useState(String(currentYear));
  const [plineName, setPlineName] = useState("");

  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [trackTitle, setTrackTitle] = useState("");
  const [trackMixVersion, setTrackMixVersion] = useState("");
  const [trackNumber, setTrackNumber] = useState("1");
  const [compositionType, setCompositionType] = useState("original_composition");
  const [audioAiUsage, setAudioAiUsage] = useState("none");
  const [compositionAiUsage, setCompositionAiUsage] = useState("none");
  const [commercialSamples, setCommercialSamples] = useState("no");
  const [audioLanguage, setAudioLanguage] = useState("en");
  const [recordingCountry, setRecordingCountry] = useState("");
  const [trackExplicit, setTrackExplicit] = useState("off");
  const [isrc, setIsrc] = useState("");
  const [iswc, setIswc] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [previewStart, setPreviewStart] = useState("");
  const [previewLength, setPreviewLength] = useState("");
  const [albumOnly, setAlbumOnly] = useState(false);
  const [freeDownload, setFreeDownload] = useState(false);
  const [instantGratification, setInstantGratification] = useState(false);
  const [hasMechanicalLicense, setHasMechanicalLicense] = useState(false);
  const [trackClineYear, setTrackClineYear] = useState(String(currentYear));
  const [trackClineName, setTrackClineName] = useState("");
  const [trackPlineYear, setTrackPlineYear] = useState(String(currentYear));
  const [trackPlineName, setTrackPlineName] = useState("");

  const [contributors, setContributors] = useState<ContributorDraft[]>([
    newContributor(),
  ]);

  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(artistId);
    if (step === 1) return Boolean(title.trim() && releaseDate && primaryGenre);
    if (step === 2) return Boolean(artworkFile);
    if (step === 3) return Boolean((trackTitle || title).trim() && audioFile);
    if (step === 4) {
      return contributors.some(
        (c) => c.firstName.trim() && c.lastName.trim() && c.roles.length > 0
      );
    }
    return true;
  }, [
    step,
    artistId,
    title,
    releaseDate,
    primaryGenre,
    artworkFile,
    trackTitle,
    audioFile,
    contributors,
  ]);

  function updateContributor(
    id: string,
    patch: Partial<ContributorDraft>
  ) {
    setContributors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  function toggleRole(id: string, role: string) {
    setContributors((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const roles = c.roles.includes(role)
          ? c.roles.filter((r) => r !== role)
          : [...c.roles, role];
        return { ...c, roles };
      })
    );
  }

  async function submit() {
    setError("");
    setStatus("loading");
    try {
      const fd = new FormData();
      if (artworkFile) fd.set("artwork", artworkFile);
      if (audioFile) fd.set("audio", audioFile);

      const validContributors = contributors
        .filter((c) => c.firstName.trim() && c.lastName.trim() && c.roles.length)
        .map((c) => ({
          firstName: c.firstName.trim(),
          lastName: c.lastName.trim(),
          roles: c.roles,
        }));

      fd.set(
        "payload",
        JSON.stringify({
          artistId,
          artisticRole,
          title,
          mixVersion,
          contentType,
          primaryGenre,
          preferredLocalization,
          releaseDate,
          artworkAiUsage,
          explicit,
          barcode,
          clineYear,
          clineName,
          plineYear,
          plineName,
          track: {
            title: trackTitle || title,
            mixVersion: trackMixVersion,
            trackNumber,
            compositionType,
            audioAiUsage,
            compositionAiUsage,
            commercialSamples,
            audioLanguage,
            recordingCountry,
            explicit: trackExplicit,
            isrc,
            iswc,
            lyrics,
            previewStartTime: previewStart,
            previewLength,
            albumOnly,
            freeDownload,
            instantGratification,
            hasMechanicalLicense,
            clineYear: trackClineYear,
            clineName: trackClineName,
            plineYear: trackPlineYear,
            plineName: trackPlineName,
            contributors: validContributors,
          },
        })
      );

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
  }

  return (
    <div className="space-y-6">
      <StepNav
        step={step}
        onJump={(i) => {
          if (i <= step) setStep(i);
        }}
      />

      {step === 0 ? (
        <Panel
          title="Primary artist"
          hint="Select the artist first. Artistic role defaults to MainArtist."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="artistId"
              label="Artist"
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
            <Field
              id="artisticRole"
              label="Artistic role"
              as="select"
              required
              value={artisticRole}
              onChange={(e) => setArtisticRole(e.target.value)}
            >
              {ARTISTIC_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Field>
          </div>
          {selected?.locked ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              This artist is already locked from a previous submission.
            </p>
          ) : null}
        </Panel>
      ) : null}

      {step === 1 ? (
        <Panel
          title="Release"
          hint="Catalog number is assigned automatically as RDISTROXXXXXX on submit. Original release date only."
        >
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
              id="mixVersion"
              label="Mix / subtitle (optional)"
              value={mixVersion}
              onChange={(e) => setMixVersion(e.target.value)}
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
              label="Original release date"
              type="date"
              required
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              helper="Interpreted as midnight UTC"
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="preferredLocalization"
              label="Preferred localization"
              as="select"
              required
              value={preferredLocalization}
              onChange={(e) => setPreferredLocalization(e.target.value)}
              helper="Also used for the track"
            >
              {LOCALES.filter((l) => l.value !== "zxx").map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Field>
            <Field
              id="barcode"
              label="Barcode / UPC (optional)"
              maxLength={13}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              helper="Leave blank to auto-generate on LabelGrid"
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
            >
              {ARTWORK_AI_USAGE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Field>
            <Field
              id="explicit"
              label="Explicit"
              as="select"
              required
              value={explicit}
              onChange={(e) => {
                setExplicit(e.target.value);
                setTrackExplicit(e.target.value);
              }}
            >
              {EXPLICIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="clineYear"
              label="© year"
              type="number"
              value={clineYear}
              onChange={(e) => setClineYear(e.target.value)}
            />
            <Field
              id="clineName"
              label="© name"
              value={clineName}
              onChange={(e) => setClineName(e.target.value)}
            />
            <Field
              id="plineYear"
              label="℗ year"
              type="number"
              value={plineYear}
              onChange={(e) => setPlineYear(e.target.value)}
            />
            <Field
              id="plineName"
              label="℗ name"
              value={plineName}
              onChange={(e) => setPlineName(e.target.value)}
            />
          </div>
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            Catalog number will be generated as{" "}
            <span className="font-medium text-foreground">RDISTROXXXXXX</span>{" "}
            when you submit.
          </p>
        </Panel>
      ) : null}

      {step === 2 ? (
        <Panel
          title="Cover art"
          hint="Square cover, min 1400×1400 recommended. JPEG, PNG, or WebP."
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            required
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            onChange={(e) => setArtworkFile(e.target.files?.[0] ?? null)}
          />
          {artworkFile ? (
            <p className="text-xs text-muted-foreground">{artworkFile.name}</p>
          ) : null}
        </Panel>
      ) : null}

      {step === 3 ? (
        <Panel
          title="Track"
          hint="Uses the release preferred localization. Disc is fixed to 1."
        >
          <Field
            id="trackTitle"
            label="Track title"
            required
            value={trackTitle}
            onChange={(e) => setTrackTitle(e.target.value)}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="trackMixVersion"
              label="Mix / version (optional)"
              value={trackMixVersion}
              onChange={(e) => setTrackMixVersion(e.target.value)}
            />
            <Field
              id="trackNumber"
              label="Track number"
              type="number"
              required
              value={trackNumber}
              onChange={(e) => setTrackNumber(e.target.value)}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="compositionType"
              label="Composition type"
              as="select"
              required
              value={compositionType}
              onChange={(e) => setCompositionType(e.target.value)}
            >
              {COMPOSITION_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Field>
            <Field
              id="commercialSamples"
              label="Commercial samples"
              as="select"
              required
              value={commercialSamples}
              onChange={(e) => setCommercialSamples(e.target.value)}
            >
              {COMMERCIAL_SAMPLES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Field>
            <Field
              id="audioAiUsage"
              label="Audio AI usage"
              as="select"
              required
              value={audioAiUsage}
              onChange={(e) => setAudioAiUsage(e.target.value)}
            >
              {ARTWORK_AI_USAGE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Field>
            <Field
              id="compositionAiUsage"
              label="Composition / lyrics AI"
              as="select"
              required
              value={compositionAiUsage}
              onChange={(e) => setCompositionAiUsage(e.target.value)}
            >
              {ARTWORK_AI_USAGE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Field>
            <Field
              id="audioLanguage"
              label="Audio language"
              as="select"
              required
              value={audioLanguage}
              onChange={(e) => setAudioLanguage(e.target.value)}
              helper="Use zxx if instrumental"
            >
              {LOCALES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Field>
            <Field
              id="recordingCountry"
              label="Recording country"
              as="select"
              value={recordingCountry}
              onChange={(e) => setRecordingCountry(e.target.value)}
            >
              {RECORDING_COUNTRIES.map((c) => (
                <option key={c.value || "none"} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Field>
            <Field
              id="trackExplicit"
              label="Track explicit"
              as="select"
              value={trackExplicit}
              onChange={(e) => setTrackExplicit(e.target.value)}
            >
              {EXPLICIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Field>
            <Field
              id="isrc"
              label="ISRC (optional)"
              value={isrc}
              onChange={(e) => setIsrc(e.target.value)}
            />
            <Field
              id="iswc"
              label="ISWC (optional)"
              value={iswc}
              onChange={(e) => setIswc(e.target.value)}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="previewStart"
              label="Preview start (seconds)"
              type="number"
              value={previewStart}
              onChange={(e) => setPreviewStart(e.target.value)}
            />
            <Field
              id="previewLength"
              label="Preview length (seconds)"
              type="number"
              value={previewLength}
              onChange={(e) => setPreviewLength(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {(
              [
                ["albumOnly", albumOnly, setAlbumOnly, "Album only"],
                ["freeDownload", freeDownload, setFreeDownload, "Free download"],
                [
                  "instantGratification",
                  instantGratification,
                  setInstantGratification,
                  "Instant gratification",
                ],
                [
                  "hasMechanicalLicense",
                  hasMechanicalLicense,
                  setHasMechanicalLicense,
                  "Has mechanical license",
                ],
              ] as const
            ).map(([id, checked, set, label]) => (
              <label key={id} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border"
                  checked={checked}
                  onChange={(e) => set(e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
          <Field
            id="lyrics"
            label="Lyrics (optional)"
            as="textarea"
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="trackClineYear"
              label="Track © year"
              type="number"
              value={trackClineYear}
              onChange={(e) => setTrackClineYear(e.target.value)}
            />
            <Field
              id="trackClineName"
              label="Track © name"
              value={trackClineName}
              onChange={(e) => setTrackClineName(e.target.value)}
            />
            <Field
              id="trackPlineYear"
              label="Track ℗ year"
              type="number"
              value={trackPlineYear}
              onChange={(e) => setTrackPlineYear(e.target.value)}
            />
            <Field
              id="trackPlineName"
              label="Track ℗ name"
              value={trackPlineName}
              onChange={(e) => setTrackPlineName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Stereo audio file</label>
            <input
              type="file"
              accept="audio/wav,audio/x-wav,audio/flac,audio/mpeg,audio/mp3,.wav,.flac,.mp3"
              required
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
            />
            {audioFile ? (
              <p className="text-xs text-muted-foreground">{audioFile.name}</p>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {step === 4 ? (
        <Panel
          title="Contributors"
          hint="Add one or more writers / contributors with roles."
        >
          <div className="space-y-4">
            {contributors.map((c, index) => (
              <div
                key={c.id}
                className="space-y-4 rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Contributor {index + 1}</p>
                  {contributors.length > 1 ? (
                    <button
                      type="button"
                      className="text-xs text-red-800 underline-offset-4 hover:underline"
                      onClick={() =>
                        setContributors((prev) =>
                          prev.filter((x) => x.id !== c.id)
                        )
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id={`fn-${c.id}`}
                    label="First name"
                    required
                    value={c.firstName}
                    onChange={(e) =>
                      updateContributor(c.id, { firstName: e.target.value })
                    }
                  />
                  <Field
                    id={`ln-${c.id}`}
                    label="Last name"
                    required
                    value={c.lastName}
                    onChange={(e) =>
                      updateContributor(c.id, { lastName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Roles</p>
                  <div className="flex flex-wrap gap-3">
                    {CONTRIBUTOR_ROLE_KEYS.map((role) => (
                      <label
                        key={role}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="size-4 rounded border-border"
                          checked={c.roles.includes(role)}
                          onChange={() => toggleRole(c.id, role)}
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4"
            onClick={() =>
              setContributors((prev) => [...prev, newContributor()])
            }
          >
            Add contributor
          </Button>
        </Panel>
      ) : null}

      {step === 5 ? (
        <Panel title="Review & submit" hint="Catalog number is created on submit.">
          <dl className="space-y-2 text-sm">
            <Row
              label="Artist"
              value={`${selected?.name ?? "—"} (${artisticRole})`}
            />
            <Row label="Title" value={title} />
            <Row label="Type" value={contentType} />
            <Row label="Genre" value={primaryGenre} />
            <Row label="Release date" value={releaseDate} />
            <Row label="Localization" value={preferredLocalization} />
            <Row label="Track" value={trackTitle || title} />
            <Row label="Artwork" value={artworkFile?.name ?? "—"} />
            <Row label="Audio" value={audioFile?.name ?? "—"} />
            <Row
              label="Contributors"
              value={contributors
                .filter((c) => c.firstName && c.lastName)
                .map(
                  (c) =>
                    `${c.firstName} ${c.lastName} (${c.roles.join(", ")})`
                )
                .join(" · ") || "—"}
            />
            <Row label="Catalog" value="RDISTROXXXXXX (auto)" />
          </dl>
        </Panel>
      ) : null}

      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 px-5"
            onClick={() => setStep((s) => s - 1)}
            disabled={status === "loading"}
          >
            Back
          </Button>
        ) : (
          <Link
            href="/dashboard/releases"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Cancel
          </Link>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            className="h-11 px-6"
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            className="h-11 px-6"
            disabled={status === "loading" || !canNext}
            onClick={submit}
          >
            {status === "loading"
              ? "Uploading & submitting…"
              : "Submit for admin review"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium">{value}</dd>
    </div>
  );
}

/** @deprecated Use ReleaseBuilder */
export const ReleaseSubmitForm = ReleaseBuilder;
