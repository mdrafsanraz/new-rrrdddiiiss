import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { metadataLanguages } from "@/lib/labelgrid/languages";

export async function GET() {
  if (!await getSessionUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ languages: await metadataLanguages() });
  } catch {
    return NextResponse.json({ error: "Could not load metadata languages. Please retry." }, { status: 502 });
  }
}
