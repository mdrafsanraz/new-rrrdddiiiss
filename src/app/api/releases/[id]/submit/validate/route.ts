import { NextResponse } from "next/server";
import { loadOwnedReleaseForSubmit } from "@/lib/releases/submit-auth";
import { validateReleaseForSubmit } from "@/lib/releases/submit-validate";
import { audioLanguages } from "@/lib/labelgrid/languages";
import { supportedAudioLanguage } from "@/lib/labelgrid/audio-languages";
import { parseJsonObject, type TrackMetadata } from "@/lib/releases/constants";

type Params = { params: Promise<{ id: string }> };

/** Stage 1 validates metadata against the read-only LabelGrid language catalog. */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const { user, release } = await loadOwnedReleaseForSubmit(id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!release) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const errors = validateReleaseForSubmit(release);
  try {
    const languages = await audioLanguages();
    for (const track of release.tracks) {
      try { supportedAudioLanguage(parseJsonObject<TrackMetadata>(track.metadataJson).audioLanguage, languages); }
      catch (error) { errors.push(`"${track.title}": ${error instanceof Error ? error.message : "Invalid audio language."}`); }
    }
  } catch {
    return NextResponse.json({ error: "Could not verify supported audio languages. Please retry before submitting." }, { status: 503 });
  }
  return NextResponse.json({ ok: errors.length === 0, errors });
}
