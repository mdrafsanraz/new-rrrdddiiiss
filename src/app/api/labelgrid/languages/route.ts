import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { audioLanguages, metadataLanguages } from "@/lib/labelgrid/languages";

export async function GET(request: Request) {
  if (!await getSessionUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const audio = new URL(request.url).searchParams.get("type") === "audio";
    return NextResponse.json({ languages: await (audio ? audioLanguages() : metadataLanguages()) });
  } catch {
    return NextResponse.json({ error: "Could not load supported languages. Please retry." }, { status: 502 });
  }
}
