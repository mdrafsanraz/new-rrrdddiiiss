import { NextResponse } from "next/server";
import { getLabelGridBaseUrl, getLabelGridToken } from "@/lib/labelgrid/config";

const FORWARDED_RESPONSE_HEADERS = [
  "accept-ranges",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
] as const;

/** Stream a provider-managed asset without exposing credentials or stale URLs. */
export async function proxyLabelGridMedia(request: Request, mediaUrl: string) {
  let url: URL;
  try {
    url = new URL(mediaUrl, `${getLabelGridBaseUrl()}/`);
  } catch {
    return NextResponse.json({ error: "Media URL is invalid." }, { status: 502 });
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return NextResponse.json({ error: "Media URL is not supported." }, { status: 502 });
  }

  const range = request.headers.get("range");
  const labelGridOrigin = new URL(getLabelGridBaseUrl()).origin;
  const token = url.origin === labelGridOrigin ? getLabelGridToken() : null;
  const fetchUpstream = (authorization: string | null) =>
    fetch(url, {
      headers: {
        Accept: request.headers.get("accept") ?? "audio/*, */*;q=0.8",
        ...(range ? { Range: range } : {}),
        ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
      },
      cache: "no-store",
    });
  let upstream: Response;
  try {
    upstream = await fetchUpstream(token);

    // LabelGrid can return a public/generated media URL on its own API
    // origin. Sending the API bearer token to that media handler can make it
    // miss the public asset and return 404, so retry the exact provider URL
    // without credentials. API-backed URLs still fail closed on the retry.
    if (token && [401, 403, 404].includes(upstream.status)) {
      await upstream.body?.cancel();
      upstream = await fetchUpstream(null);
    }
  } catch {
    return NextResponse.json(
      { error: "Provider media is temporarily unavailable." },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    console.warn("[labelgrid/media] upstream unavailable", {
      status: upstream.status,
      origin: url.origin,
      path: url.pathname,
      ranged: Boolean(range),
    });
    return NextResponse.json(
      { error: "Provider media is temporarily unavailable." },
      { status: upstream.status === 404 ? 404 : 502 }
    );
  }

  const headers = new Headers({
    "Cache-Control": "private, max-age=300",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}
