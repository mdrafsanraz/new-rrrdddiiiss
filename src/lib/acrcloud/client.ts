import { createHmac } from "node:crypto";

const IDENTIFY_PATH = "/v1/identify";
const MAX_SAMPLE_BYTES = 2 * 1024 * 1024;
const AUDIO_DOWNLOAD_TIMEOUT_MS = 30_000;
const IDENTIFICATION_TIMEOUT_MS = 60_000;

export type AcrCloudMatch = {
  acrId: string | null;
  title: string | null;
  artists: string[];
  album: string | null;
  label: string | null;
  releaseDate: string | null;
  score: number | null;
  isrc: string | null;
  upc: string | null;
};

export type AcrCloudIdentification = {
  recognized: boolean;
  message: string;
  matches: AcrCloudMatch[];
};

export function isAcrCloudConfigured(): boolean {
  return Boolean(
    process.env.ACRCLOUD_HOST?.trim() &&
      process.env.ACRCLOUD_ACCESS_KEY?.trim() &&
      process.env.ACRCLOUD_ACCESS_SECRET?.trim(),
  );
}

function config() {
  const host = process.env.ACRCLOUD_HOST?.trim();
  const accessKey = process.env.ACRCLOUD_ACCESS_KEY?.trim();
  const accessSecret = process.env.ACRCLOUD_ACCESS_SECRET?.trim();
  if (!host || !accessKey || !accessSecret) {
    throw new Error("ACRCloud is not configured.");
  }
  const origin = new URL(host.startsWith("https://") ? host : `https://${host}`).origin;
  return { origin, accessKey, accessSecret };
}

async function audioSample(audioUrl: string): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(audioUrl, {
      headers: {
        Accept: "audio/*, */*;q=0.8",
        Range: `bytes=0-${MAX_SAMPLE_BYTES - 1}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(AUDIO_DOWNLOAD_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("LabelGrid audio download timed out.");
    }
    throw error;
  }
  if (!response.ok || !response.body) {
    throw new Error(`LabelGrid audio returned ${response.status}.`);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (length < MAX_SAMPLE_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = MAX_SAMPLE_BYTES - length;
    const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
    chunks.push(chunk);
    length += chunk.byteLength;
    if (length >= MAX_SAMPLE_BYTES) await reader.cancel();
  }
  if (!length) throw new Error("LabelGrid returned an empty audio sample.");

  const sample = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    sample.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return sample;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function identifyLabelGridAudio(audioUrl: string): Promise<AcrCloudIdentification> {
  const { origin, accessKey, accessSecret } = config();
  const sample = await audioSample(audioUrl);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const dataType = "audio";
  const signatureVersion = "1";
  const stringToSign = ["POST", IDENTIFY_PATH, accessKey, dataType, signatureVersion, timestamp].join("\n");
  const signature = createHmac("sha1", accessSecret).update(stringToSign).digest("base64");

  const form = new FormData();
  const sampleBuffer = new ArrayBuffer(sample.byteLength);
  new Uint8Array(sampleBuffer).set(sample);
  form.set("sample", new Blob([sampleBuffer], { type: "audio/mpeg" }), "sample.mp3");
  form.set("sample_bytes", String(sample.byteLength));
  form.set("access_key", accessKey);
  form.set("data_type", dataType);
  form.set("signature", signature);
  form.set("signature_version", signatureVersion);
  form.set("timestamp", timestamp);

  let response: Response;
  try {
    response = await fetch(`${origin}${IDENTIFY_PATH}`, {
      method: "POST",
      body: form,
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(IDENTIFICATION_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("ACRCloud identification timed out.");
    }
    throw error;
  }
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !payload) {
    throw new Error(`ACRCloud identification returned ${response.status}.`);
  }

  const status = (payload.status ?? {}) as Record<string, unknown>;
  const statusCode = typeof status.code === "number" ? status.code : null;
  if (statusCode === 1001) {
    return { recognized: false, message: text(status.msg) ?? "No match", matches: [] };
  }
  if (statusCode !== 0) {
    throw new Error(
      `ACRCloud error${statusCode === null ? "" : ` ${statusCode}`}: ${text(status.msg) ?? "Recognition failed."}`,
    );
  }
  const metadata = (payload.metadata ?? {}) as Record<string, unknown>;
  const music = Array.isArray(metadata.music) ? metadata.music : [];
  const matches = music.map((row): AcrCloudMatch => {
    const item = row as Record<string, unknown>;
    const externalIds = (item.external_ids ?? {}) as Record<string, unknown>;
    const album = (item.album ?? {}) as Record<string, unknown>;
    return {
      acrId: text(item.acrid),
      title: text(item.title),
      artists: Array.isArray(item.artists)
        ? item.artists.map((artist) => text((artist as Record<string, unknown>).name)).filter((name): name is string => Boolean(name))
        : [],
      album: text(album.name),
      label: text(item.label),
      releaseDate: text(item.release_date),
      score: typeof item.score === "number" ? item.score : null,
      isrc: text(externalIds.isrc),
      upc: text(externalIds.upc),
    };
  });

  return {
    recognized: matches.length > 0,
    message: text(status.msg) ?? (matches.length ? "Success" : "No match"),
    matches,
  };
}
