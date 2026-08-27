import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { readImageDimensions } from "@/lib/uploads/image-dimensions";

/** LabelGrid cover art requirement — exact square, no exceptions. */
export const REQUIRED_ARTWORK_SIZE = 3000;

/**
 * Persistent upload root.
 * On Railway, mount a volume (e.g. /data) and set UPLOADS_DIR=/data/uploads
 * so files survive redeploys. Local default: <cwd>/uploads.
 */
function uploadsRoot(): string {
  const fromEnv =
    process.env.UPLOADS_DIR?.trim() ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (fromEnv) {
    // If Railway only gives the volume mount path, store under uploads/ inside it.
    if (fromEnv === "/data" || fromEnv.endsWith("/data")) {
      return path.join(fromEnv, "uploads");
    }
    return fromEnv;
  }
  return path.join(process.cwd(), "uploads");
}

const ROOT = uploadsRoot();

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

/**
 * A validated file held only in memory for the duration of the request.
 * Artwork and audio are never written to our disk — LabelGrid is the file
 * store for these; this is just the buffer in transit to their API.
 */
export type ValidatedFile = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
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

/**
 * Validate an artwork or audio file and return its bytes in memory — never
 * written to our disk. LabelGrid is the storage for these assets; the
 * caller uploads this buffer straight to their API and discards it.
 */
async function validateFile(
  kind: "artwork" | "audio",
  file: File,
  allowed: Set<string>,
  maxBytes: number
): Promise<ValidatedFile> {
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

  if (kind === "artwork") {
    const dims = readImageDimensions(buf, file.type);
    if (
      !dims ||
      dims.width !== REQUIRED_ARTWORK_SIZE ||
      dims.height !== REQUIRED_ARTWORK_SIZE
    ) {
      const got = dims ? `${dims.width}×${dims.height}` : "unreadable dimensions";
      throw new Error(
        `Artwork must be exactly ${REQUIRED_ARTWORK_SIZE}×${REQUIRED_ARTWORK_SIZE}px (got ${got}).`
      );
    }
  }

  return {
    filename: file.name || `${kind}${extFor(file.type, file.name)}`,
    mimeType: file.type,
    size: buf.length,
    buffer: buf,
  };
}

export function validateArtwork(file: File) {
  return validateFile("artwork", file, ARTWORK_TYPES, 10 * 1024 * 1024);
}

export function validateAudio(file: File) {
  return validateFile("audio", file, AUDIO_TYPES, 200 * 1024 * 1024);
}

const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/** Supporting docs for review issues (stored locally; LG has notes-only API). */
export async function saveGenericUpload(
  userId: string,
  file: File,
  kind = "documents"
): Promise<StoredUpload> {
  if (!DOCUMENT_TYPES.has(file.type) && !file.type.startsWith("image/")) {
    throw new Error("Document must be PDF, Word, or an image");
  }
  if (file.size <= 0 || file.size > 25 * 1024 * 1024) {
    throw new Error("Document must be under 25 MB");
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
    mimeType: file.type || "application/octet-stream",
    size: buf.length,
    buffer: buf,
  };
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

/** Reload a saved local document (e.g. a track license) from disk. */
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

export function getUploadsRootForDiagnostics(): string {
  return ROOT;
}
