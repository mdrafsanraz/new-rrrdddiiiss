import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth/admin";
import { getSessionUser } from "@/lib/auth/session";
import { resolveUploadPath, storedPathUsesBucket } from "@/lib/uploads/store";
import { getObject, isS3Configured } from "@/lib/uploads/s3";

type Params = { params: Promise<{ path: string[] }> };

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".flac") return "audio/flac";
  if (ext === ".mp3") return "audio/mpeg";
  return "application/octet-stream";
}

export async function GET(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const segments = (await params).path ?? [];
  if (segments.length < 2) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ownerOk = segments[0] === user.id;
  if (!ownerOk && !isAdminUser(user)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const relative = segments.join("/");

  if (storedPathUsesBucket(relative) && isS3Configured()) {
    const object = await getObject(relative);
    if (!object) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(object.buffer), {
      headers: {
        "Content-Type": object.contentType || contentTypeFor(relative),
        "Content-Length": String(object.buffer.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const abs = resolveUploadPath(relative);
  if (!abs) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const info = await stat(abs);
    if (!info.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;
    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentTypeFor(abs),
        "Content-Length": String(info.size),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
