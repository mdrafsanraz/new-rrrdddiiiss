import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { readImageDimensions } from "@/lib/uploads/image-dimensions";
import { getObject, isS3Configured, putObject } from "@/lib/uploads/s3";
import { inspectAudioBytes } from "@/lib/audio/compatibility";

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

// LabelGrid's Track Files endpoint only accepts WAV (16/24/32-bit) or FLAC
// (16-bit) — MP3 is rejected there, so it must not pass local validation
// either (a client-side pass just guarantees a confusing failure later).
const AUDIO_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/flac",
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

/** Fallback MIME guess from a filename's extension, for objects/files whose content-type wasn't stored. */
function mimeFromExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".flac") return "audio/flac";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
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
        : "Audio must be WAV (16/24/32-bit) or FLAC (16-bit)"
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
  } else {
    const compatibility = inspectAudioBytes(buf, file.name, file.type);
    if (!compatibility.compatible) {
      throw new Error(compatibility.error ?? "Audio file is not compatible.");
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

/**
 * Only review-issue documents ("documents" kind — proof of rights, etc.)
 * use the bucket: LabelGrid has no upload endpoint for these, so RDISTRO
 * is their permanent home. Track licenses ("license" kind) still transit
 * straight to LabelGrid (see syncTrackLicense in sync-submit.ts) — this is
 * just a brief local cache until that one-time sync runs, so it has no
 * need for durable bucket storage. The filename's `{kind}-` prefix (baked
 * in below) is how the read-back paths (loadStoredUpload, /api/media)
 * know which backend to check.
 */
function usesBucket(kind: string): boolean {
  return kind === "documents";
}

/** Recovers the `{kind}-{token}{ext}` prefix baked into a stored filename by saveGenericUpload. */
function kindFromRelativePath(relativePath: string): string {
  const filename = path.basename(relativePath);
  const idx = filename.indexOf("-");
  return idx === -1 ? filename : filename.slice(0, idx);
}

/** Whether the object at this stored path should be looked up in the bucket (vs. local disk). */
export function storedPathUsesBucket(relativePath: string): boolean {
  return usesBucket(kindFromRelativePath(relativePath));
}

/**
 * Supporting docs for review issues (proof of rights, track licenses,
 * etc.). "documents"-kind uploads go to the S3-compatible bucket (e.g.
 * Railway's Bucket service) when S3_* env vars are configured; everything
 * else, and any upload when S3 isn't configured, falls back to local disk.
 */
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
  const relativePath = path.posix.join(userId, filename);
  const contentType = file.type || "application/octet-stream";

  if (usesBucket(kind) && isS3Configured()) {
    await putObject(relativePath, buf, contentType);
  } else {
    const dir = path.join(ROOT, userId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(ROOT, relativePath), buf);
  }

  return {
    relativePath,
    publicUrl: `/api/media/${relativePath}`,
    filename: file.name || filename,
    mimeType: contentType,
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

/** Reload a saved document (e.g. a track license) from the bucket, or local disk if S3 isn't configured or this kind doesn't use it. */
export async function loadStoredUpload(
  publicUrl: string | null | undefined
): Promise<StoredUpload | null> {
  const relative = relativePathFromPublicUrl(publicUrl);
  if (!relative) return null;
  const filename = path.basename(relative);

  if (storedPathUsesBucket(relative) && isS3Configured()) {
    const object = await getObject(relative);
    if (!object) return null;
    return {
      relativePath: relative,
      publicUrl: `/api/media/${relative}`,
      filename,
      mimeType: object.contentType || mimeFromExt(filename),
      size: object.buffer.length,
      buffer: object.buffer,
    };
  }

  const abs = resolveUploadPath(relative);
  if (!abs) return null;
  try {
    const { readFile } = await import("node:fs/promises");
    const buffer = await readFile(abs);
    return {
      relativePath: relative,
      publicUrl: `/api/media/${relative}`,
      filename,
      mimeType: mimeFromExt(filename),
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
