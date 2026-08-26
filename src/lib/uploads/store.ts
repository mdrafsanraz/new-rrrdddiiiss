import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const ROOT = path.join(process.cwd(), "uploads");

const ARTWORK_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const AUDIO_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/flac",
  "audio/mpeg",
  "audio/mp3",
  "audio/x-flac",
]);

export type StoredUpload = {
  /** Relative path under uploads/ — never expose raw filesystem paths to clients. */
  relativePath: string;
  /** Auth-gated URL for the dashboard. */
  publicUrl: string;
  filename: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
};

function extFor(mime: string, originalName: string): string {
  const fromName = path.extname(originalName).toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime.includes("flac")) return ".flac";
  if (mime.includes("mpeg") || mime.includes("mp3")) return ".mp3";
  if (mime.includes("wav")) return ".wav";
  return ".bin";
}

async function saveFile(
  userId: string,
  kind: "artwork" | "audio",
  file: File,
  allowed: Set<string>,
  maxBytes: number
): Promise<StoredUpload> {
  if (!allowed.has(file.type)) {
    throw new Error(
      kind === "artwork"
        ? "Artwork must be JPEG, PNG, or WebP"
        : "Audio must be WAV, FLAC, or MP3"
    );
  }
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error(
      kind === "artwork"
        ? "Artwork must be under 10 MB"
        : "Audio must be under 200 MB"
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const token = randomBytes(8).toString("hex");
  const filename = `${kind}-${token}${extFor(file.type, file.name)}`;
  const dir = path.join(ROOT, userId);
  await mkdir(dir, { recursive: true });
  const abs = path.join(dir, filename);
  await writeFile(abs, buf);

  const relativePath = path.posix.join(userId, filename);
  return {
    relativePath,
    publicUrl: `/api/media/${relativePath}`,
    filename: file.name || filename,
    mimeType: file.type,
    size: buf.length,
    buffer: buf,
  };
}

export function saveArtwork(userId: string, file: File) {
  return saveFile(userId, "artwork", file, ARTWORK_TYPES, 10 * 1024 * 1024);
}

export function saveAudio(userId: string, file: File) {
  return saveFile(userId, "audio", file, AUDIO_TYPES, 200 * 1024 * 1024);
}

export function resolveUploadPath(relativePath: string): string | null {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  if (normalized.includes("..") || path.isAbsolute(normalized)) return null;
  const abs = path.join(ROOT, normalized);
  if (!abs.startsWith(ROOT)) return null;
  return abs;
}

/** Parse `/api/media/{userId}/{file}` → relative path. */
export function relativePathFromPublicUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;
  const prefix = "/api/media/";
  const idx = publicUrl.indexOf(prefix);
  if (idx === -1) return null;
  return publicUrl.slice(idx + prefix.length).split("?")[0] || null;
}

/** Reload a saved upload from disk (used when admin approves → LabelGrid). */
export async function loadStoredUpload(
  publicUrl: string | null | undefined
): Promise<StoredUpload | null> {
  const relative = relativePathFromPublicUrl(publicUrl);
  if (!relative) return null;
  const abs = resolveUploadPath(relative);
  if (!abs) return null;
  try {
    const { readFile } = await import("node:fs/promises");
    const buffer = await readFile(abs);
    const filename = path.basename(abs);
    const ext = path.extname(filename).toLowerCase();
    let mimeType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".png") mimeType = "image/png";
    else if (ext === ".webp") mimeType = "image/webp";
    else if (ext === ".wav") mimeType = "audio/wav";
    else if (ext === ".flac") mimeType = "audio/flac";
    else if (ext === ".mp3") mimeType = "audio/mpeg";
    return {
      relativePath: relative,
      publicUrl: `/api/media/${relative}`,
      filename,
      mimeType,
      size: buffer.length,
      buffer,
    };
  } catch {
    return null;
  }
}
