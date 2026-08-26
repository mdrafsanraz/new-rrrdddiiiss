import {
  getLabelGridBaseUrl,
  getLabelGridToken,
  LabelGridConfigError,
} from "@/lib/labelgrid/config";

export class LabelGridApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "LabelGridApiError";
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  searchParams?: Record<string, string | number | undefined>;
};

export async function labelgridFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = getLabelGridToken();
  if (!token) {
    throw new LabelGridConfigError(
      "LABELGRID_API_TOKEN is not set. Sandbox calls are disabled until a token is provided."
    );
  }

  const base = getLabelGridBaseUrl();
  const url = new URL(
    `${base}${path.startsWith("/") ? path : `/${path}`}`
  );

  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    console.error("[labelgrid]", res.status, path, parsed);
    throw new LabelGridApiError(
      `LabelGrid ${options.method ?? "GET"} ${path} failed (${res.status})`,
      res.status,
      parsed
    );
  }

  return parsed as T;
}
