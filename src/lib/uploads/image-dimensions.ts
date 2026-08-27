/**
 * Minimal, dependency-free pixel-dimension readers for the three artwork
 * formats we accept (JPEG, PNG, WebP). Only the header is parsed — no full
 * decode — so this is cheap to run on every upload.
 */

function readPngDimensions(buf: Buffer): { width: number; height: number } | null {
  // 8-byte PNG signature, then the IHDR chunk: 4-byte length, "IHDR", 4-byte
  // width, 4-byte height (both big-endian).
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(signature)) return null;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readJpegDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 carry the dimensions;
    // skip standalone markers and APPn/COM segments.
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    const segmentLength = buf.readUInt16BE(offset + 2);
    if (isSof) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    offset += 2 + segmentLength;
  }
  return null;
}

function readWebpDimensions(buf: Buffer): { width: number; height: number } | null {
  if (
    buf.length < 30 ||
    buf.toString("ascii", 0, 4) !== "RIFF" ||
    buf.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    // 24-bit width-1 / height-1, little-endian, starting at byte 24/27.
    const width = (buf.readUIntLE(24, 3) & 0xffffff) + 1;
    const height = (buf.readUIntLE(27, 3) & 0xffffff) + 1;
    return { width, height };
  }
  if (chunk === "VP8 ") {
    // Lossy: 3-byte sync code at 23, then 16-bit width/height (14 bits + 2-bit scale) at 26/28.
    const width = buf.readUInt16LE(26) & 0x3fff;
    const height = buf.readUInt16LE(28) & 0x3fff;
    return { width, height };
  }
  if (chunk === "VP8L") {
    // Lossless: 1 signature byte, then 14 bits width-1 / 14 bits height-1.
    const b0 = buf[21];
    const b1 = buf[22];
    const b2 = buf[23];
    const b3 = buf[24];
    const width = (((b1 & 0x3f) << 8) | b0) + 1;
    const height = (((b3 & 0x0f) << 10) | (b2 << 2) | (b1 >> 6)) + 1;
    return { width, height };
  }
  return null;
}

/** Read pixel width/height from a JPEG, PNG, or WebP buffer's header. */
export function readImageDimensions(
  buf: Buffer,
  mimeType: string
): { width: number; height: number } | null {
  if (mimeType === "image/png") return readPngDimensions(buf);
  if (mimeType === "image/jpeg") return readJpegDimensions(buf);
  if (mimeType === "image/webp") return readWebpDimensions(buf);
  return null;
}
