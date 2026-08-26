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
} from "@/lib/releases/constants";

type ArtistOption = { id: string; name: string; locked: boolean };

const currentYear = new Date().getFullYear();

function Section({
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

function Check({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        className="size-4 rounded border-border"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

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
  const selected = artists.find((a) => a.id === artistId);

  // Release — ReleaseCreateData
  const [title, setTitle] = useState("");
  const [phoneticTitle, setPhoneticTitle] = useState("");
  const [mixVersion, setMixVersion] = useState("");
  const [catalogNumber, setCatalogNumber] = useState("");
  const [contentType, setContentType] = useState("Single");
  const [primaryGenre, setPrimaryGenre] = useState("Pop");
  const [secondaryGenre, setSecondaryGenre] = useState("");
  const [tertiaryGenre, setTertiaryGenre] = useState("");
  const [preferredLocalization, setPreferredLocalization] = useState("en");
  const [artisticRole, setArtisticRole] = useState("MainArtist");
  const [releaseDate, setReleaseDate] = useState("");
  const [preOrderDate, setPreOrderDate] = useState("");
  const [enableExactReleaseTime, setEnableExactReleaseTime] = useState(false);
  const [releaseTime, setReleaseTime] = useState("00:00");
  const [artworkAiUsage, setArtworkAiUsage] = useState("none");
  const [explicit, setExplicit] = useState("off");
  const [barcode, setBarcode] = useState("");
  const [descriptionLong, setDescriptionLong] = useState("");
  const [clineYear, setClineYear] = useState(String(currentYear));
  const [clineName, setClineName] = useState("");
  const [plineYear, setPlineYear] = useState(String(currentYear));
  const [plineName, setPlineName] = useState("");
  const [courtesyLine, setCourtesyLine] = useState("");
  const [transferFromDistributor, setTransferFromDistributor] = useState("");

  // Store URLs
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [appleMusicUrl, setAppleMusicUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [soundcloudUrl, setSoundcloudUrl] = useState("");
  const [bandcampUrl, setBandcampUrl] = useState("");
  const [deezerUrl, setDeezerUrl] = useState("");
  const [tidalUrl, setTidalUrl] = useState("");
  const [amazonUrl, setAmazonUrl] = useState("");

  // Track — TrackCreateData
  const [trackTitle, setTrackTitle] = useState("");
  const [trackMixVersion, setTrackMixVersion] = useState("");
  const [trackNumber, setTrackNumber] = useState("1");
  const [disc, setDisc] = useState("1");
  const [compositionType, setCompositionType] = useState("original_composition");
  const [audioAiUsage, setAudioAiUsage] = useState("none");
  const [compositionAiUsage, setCompositionAiUsage] = useState("none");
  const [commercialSamples, setCommercialSamples] = useState("no");
  const [audioLanguage, setAudioLanguage] = useState("en");
  const [recordingCountry, setRecordingCountry] = useState("");
  const [trackPreferredLocalization, setTrackPreferredLocalization] =
    useState("en");
  const [trackPrimaryGenre, setTrackPrimaryGenre] = useState("");
  const [trackSecondaryGenre, setTrackSecondaryGenre] = useState("");
  const [trackTertiaryGenre, setTrackTertiaryGenre] = useState("");
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
  const [trackCourtesy, setTrackCourtesy] = useState("");

  const [writerFirstName, setWriterFirstName] = useState("");
  const [writerLastName, setWriterLastName] = useState("");
  const [writerRoles, setWriterRoles] = useState<string[]>([
    "Composer",
    "Lyricist",
  ]);

  const [artworkName, setArtworkName] = useState("");
  const [audioName, setAudioName] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  const genreOptions = useMemo(
    () => [{ value: "", label: "— None —" }, ...PRIMARY_GENRES.map((g) => ({ value: g, label: g }))],
    []
  );

  function toggleWriterRole(role: string) {
    setWriterRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

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

          const payload = {
            artistId,
            artisticRole,
            title,
            phoneticTitle,
            mixVersion,
            catalogNumber,
            contentType,
            primaryGenre,
            secondaryGenre,
            tertiaryGenre,
            preferredLocalization,
            releaseDate,
            preOrderDate,
            enableExactReleaseTime,
            releaseTime,
            artworkAiUsage,
            explicit,
            barcode,
            descriptionLong,
            clineYear,
            clineName,
            plineYear,
            plineName,
            courtesyLine,
            transferFromDistributor,
            storeUrls: {
              spotify_url: spotifyUrl,
              applemusic_url: appleMusicUrl,
              youtube_url: youtubeUrl,
              soundcloud_url: soundcloudUrl,
              bandcamp_url: bandcampUrl,
              deezer_url: deezerUrl,
              tidal_url: tidalUrl,
              amazon_url: amazonUrl,
            },
            track: {
              title: trackTitle || title,
              mixVersion: trackMixVersion,
              trackNumber,
              disc,
              compositionType,
              audioAiUsage,
              compositionAiUsage,
              commercialSamples,
              audioLanguage,
              recordingCountry,
              preferredLocalization: trackPreferredLocalization,
              primaryGenre: trackPrimaryGenre || primaryGenre,
              secondaryGenre: trackSecondaryGenre,
              tertiaryGenre: trackTertiaryGenre,
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
              courtesyLine: trackCourtesy,
              writerFirstName,
              writerLastName,
              writerRoles,
            },
          };

          fd.set("payload", JSON.stringify(payload));

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
      <Section
        title="Primary artist"
        hint="LabelGrid artists[] — after submit, this artist profile locks."
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
            helper="LabelGrid artistic_role"
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
      </Section>

      <Section
        title="Release identity"
        hint="Required LabelGrid fields: titles, cat, content_type, primary_genre, artwork_ai_usage."
      >
        <Field
          id="title"
          label="Release title"
          required
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!trackTitle || trackTitle === title) setTrackTitle(e.target.value);
          }}
          helper="titles[].text (iso_code from preferred localization)"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="phoneticTitle"
            label="Phonetic title (optional)"
            value={phoneticTitle}
            onChange={(e) => setPhoneticTitle(e.target.value)}
            helper="titles[].phonetic — required for some locales (e.g. ja-Jpan)"
          />
          <Field
            id="mixVersion"
            label="Mix / subtitle (optional)"
            value={mixVersion}
            onChange={(e) => setMixVersion(e.target.value)}
            helper="mix_versions — omit if none"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="catalogNumber"
            label="Catalog number (cat)"
            required
            maxLength={20}
            value={catalogNumber}
            onChange={(e) => setCatalogNumber(e.target.value)}
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
            id="preferredLocalization"
            label="Preferred localization"
            as="select"
            required
            value={preferredLocalization}
            onChange={(e) => setPreferredLocalization(e.target.value)}
            helper="BCP-47 — DSP primary language"
          >
            {LOCALES.filter((l) => l.value !== "zxx").map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Field>
          <Field
            id="barcode"
            label="Barcode / UPC (barcode_number)"
            maxLength={13}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            helper="Leave blank to auto-generate on LabelGrid"
          />
        </div>
      </Section>

      <Section title="Genres" hint="primary_genre_id required; secondary/tertiary optional.">
        <div className="grid gap-5 sm:grid-cols-3">
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
            id="secondaryGenre"
            label="Secondary genre"
            as="select"
            value={secondaryGenre}
            onChange={(e) => setSecondaryGenre(e.target.value)}
          >
            {genreOptions.map((g) => (
              <option key={g.value || "none"} value={g.value}>
                {g.label}
              </option>
            ))}
          </Field>
          <Field
            id="tertiaryGenre"
            label="Tertiary genre"
            as="select"
            value={tertiaryGenre}
            onChange={(e) => setTertiaryGenre(e.target.value)}
          >
            {genreOptions.map((g) => (
              <option key={g.value || "none"} value={g.value}>
                {g.label}
              </option>
            ))}
          </Field>
        </div>
      </Section>

      <Section
        title="Release dates"
        hint="Interpreted as UTC. Date-only means midnight UTC unless exact time is enabled."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="releaseDate"
            label="Release date"
            type="date"
            required
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
          />
          <Field
            id="preOrderDate"
            label="Pre-order date (optional)"
            type="date"
            value={preOrderDate}
            onChange={(e) => setPreOrderDate(e.target.value)}
            helper="Must be before release date when set"
          />
        </div>
        <Check
          id="enableExactReleaseTime"
          label="Enable exact release time (enable_exact_release_time)"
          checked={enableExactReleaseTime}
          onChange={setEnableExactReleaseTime}
        />
        {enableExactReleaseTime ? (
          <Field
            id="releaseTime"
            label="Release time (UTC)"
            type="time"
            value={releaseTime}
            onChange={(e) => setReleaseTime(e.target.value)}
          />
        ) : null}
      </Section>

      <Section title="Rights & AI" hint="© / ℗ lines, explicit, artwork AI usage.">
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
            label="© year (cline_year)"
            type="number"
            value={clineYear}
            onChange={(e) => setClineYear(e.target.value)}
          />
          <Field
            id="clineName"
            label="© name (cline_name)"
            value={clineName}
            onChange={(e) => setClineName(e.target.value)}
            placeholder="Copyright owner"
          />
          <Field
            id="plineYear"
            label="℗ year (pline_year)"
            type="number"
            value={plineYear}
            onChange={(e) => setPlineYear(e.target.value)}
          />
          <Field
            id="plineName"
            label="℗ name (pline_name)"
            value={plineName}
            onChange={(e) => setPlineName(e.target.value)}
            placeholder="Phonogram owner"
          />
        </div>
        <Field
          id="courtesyLine"
          label="Courtesy line (optional)"
          value={courtesyLine}
          onChange={(e) => setCourtesyLine(e.target.value)}
        />
        <Field
          id="transferFromDistributor"
          label="Transfer from distributor (optional)"
          value={transferFromDistributor}
          onChange={(e) => setTransferFromDistributor(e.target.value)}
          helper="Previous distributor name when migrating"
        />
        <Field
          id="descriptionLong"
          label="Long description (optional)"
          as="textarea"
          value={descriptionLong}
          onChange={(e) => setDescriptionLong(e.target.value)}
        />
      </Section>

      <Section
        title="Existing store links (optional)"
        hint="LabelGrid store URL fields — only fill if the release already exists on a store."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="spotifyUrl" label="Spotify URL" value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)} />
          <Field id="appleMusicUrl" label="Apple Music URL" value={appleMusicUrl} onChange={(e) => setAppleMusicUrl(e.target.value)} />
          <Field id="youtubeUrl" label="YouTube URL" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
          <Field id="soundcloudUrl" label="SoundCloud URL" value={soundcloudUrl} onChange={(e) => setSoundcloudUrl(e.target.value)} />
          <Field id="bandcampUrl" label="Bandcamp URL" value={bandcampUrl} onChange={(e) => setBandcampUrl(e.target.value)} />
          <Field id="deezerUrl" label="Deezer URL" value={deezerUrl} onChange={(e) => setDeezerUrl(e.target.value)} />
          <Field id="tidalUrl" label="Tidal URL" value={tidalUrl} onChange={(e) => setTidalUrl(e.target.value)} />
          <Field id="amazonUrl" label="Amazon URL" value={amazonUrl} onChange={(e) => setAmazonUrl(e.target.value)} />
        </div>
      </Section>

      <Section
        title="Cover art"
        hint="Uploaded to LabelGrid as draft photo. Square, min 1400×1400 recommended."
      >
        <div className="grid gap-2">
          <label htmlFor="artwork" className="text-sm font-medium">
            Cover art file
          </label>
          <input
            id="artwork"
            name="artwork"
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            required
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            onChange={(e) => setArtworkName(e.target.files?.[0]?.name ?? "")}
          />
          {artworkName ? (
            <p className="text-xs text-muted-foreground">{artworkName}</p>
          ) : null}
        </div>
      </Section>

      <Section
        title="Track"
        hint="Required LabelGrid track fields: composition_type, audio_ai_usage, composition_ai_usage, commercial_samples, audio_language, contributors."
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
            label="Track mix / version (optional)"
            value={trackMixVersion}
            onChange={(e) => setTrackMixVersion(e.target.value)}
          />
          <Field
            id="trackPreferredLocalization"
            label="Track preferred localization"
            as="select"
            value={trackPreferredLocalization}
            onChange={(e) => setTrackPreferredLocalization(e.target.value)}
          >
            {LOCALES.filter((l) => l.value !== "zxx").map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            id="trackNumber"
            label="Track number"
            type="number"
            required
            value={trackNumber}
            onChange={(e) => setTrackNumber(e.target.value)}
          />
          <Field
            id="disc"
            label="Disc"
            type="number"
            required
            value={disc}
            onChange={(e) => setDisc(e.target.value)}
            helper="Use 1 unless multi-disc"
          />
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
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
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
            label="Composition / lyrics AI usage"
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
            id="audioLanguage"
            label="Audio language"
            as="select"
            required
            value={audioLanguage}
            onChange={(e) => setAudioLanguage(e.target.value)}
            helper="Use zxx if instrumental / no words"
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
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            id="trackPrimaryGenre"
            label="Track primary genre"
            as="select"
            value={trackPrimaryGenre}
            onChange={(e) => setTrackPrimaryGenre(e.target.value)}
            helper="Defaults to release primary genre"
          >
            {genreOptions.map((g) => (
              <option key={g.value || "none"} value={g.value}>
                {g.value ? g.label : "Same as release"}
              </option>
            ))}
          </Field>
          <Field
            id="trackSecondaryGenre"
            label="Track secondary genre"
            as="select"
            value={trackSecondaryGenre}
            onChange={(e) => setTrackSecondaryGenre(e.target.value)}
          >
            {genreOptions.map((g) => (
              <option key={g.value || "none"} value={g.value}>
                {g.label}
              </option>
            ))}
          </Field>
          <Field
            id="trackTertiaryGenre"
            label="Track tertiary genre"
            as="select"
            value={trackTertiaryGenre}
            onChange={(e) => setTrackTertiaryGenre(e.target.value)}
          >
            {genreOptions.map((g) => (
              <option key={g.value || "none"} value={g.value}>
                {g.label}
              </option>
            ))}
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="isrc"
            label="ISRC (optional)"
            value={isrc}
            onChange={(e) => setIsrc(e.target.value)}
            helper="Leave blank to auto-generate"
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
        <div className="flex flex-wrap gap-5">
          <Check id="albumOnly" label="Album only" checked={albumOnly} onChange={setAlbumOnly} />
          <Check id="freeDownload" label="Free download" checked={freeDownload} onChange={setFreeDownload} />
          <Check
            id="instantGratification"
            label="Instant gratification"
            checked={instantGratification}
            onChange={setInstantGratification}
          />
          <Check
            id="hasMechanicalLicense"
            label="Has mechanical license"
            checked={hasMechanicalLicense}
            onChange={setHasMechanicalLicense}
          />
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
        <Field
          id="trackCourtesy"
          label="Track courtesy line"
          value={trackCourtesy}
          onChange={(e) => setTrackCourtesy(e.target.value)}
        />
        <div className="grid gap-2">
          <label htmlFor="audio" className="text-sm font-medium">
            Stereo audio file
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
      </Section>

      <Section
        title="Writer / contributor credits"
        hint="Creates a LabelGrid writer and attaches contributor roles on the track."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="writerFirstName"
            label="Writer first name"
            required
            value={writerFirstName}
            onChange={(e) => setWriterFirstName(e.target.value)}
          />
          <Field
            id="writerLastName"
            label="Writer last name"
            required
            value={writerLastName}
            onChange={(e) => setWriterLastName(e.target.value)}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Contributor roles</p>
          <div className="flex flex-wrap gap-3">
            {CONTRIBUTOR_ROLE_KEYS.map((role) => (
              <Check
                key={role}
                id={`role-${role}`}
                label={role}
                checked={writerRoles.includes(role)}
                onChange={() => toggleWriterRole(role)}
              />
            ))}
          </div>
        </div>
      </Section>

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
