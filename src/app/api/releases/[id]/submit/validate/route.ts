import { NextResponse } from "next/server";
import { loadOwnedReleaseForSubmit } from "@/lib/releases/submit-auth";
import { validateReleaseForSubmit } from "@/lib/releases/submit-validate";

type Params = { params: Promise<{ id: string }> };

/** Stage 1 (Prepare & Validate) — never touches LabelGrid. */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const { user, release } = await loadOwnedReleaseForSubmit(id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!release) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const errors = validateReleaseForSubmit(release);
  return NextResponse.json({ ok: errors.length === 0, errors });
}
