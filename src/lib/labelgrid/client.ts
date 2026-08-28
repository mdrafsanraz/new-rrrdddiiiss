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

/** Turn LabelGrid's documented validation body into safe, useful UI text. */
export function labelGridApiErrorMessage(error: LabelGridApiError): string {
  const body = error.body;
  if (!body || typeof body !== "object") return error.message;
  const payload = body as { message?: unknown; errors?: unknown };
  const details: string[] = [];
  if (payload.errors && typeof payload.errors === "object") {
    for (const [field, messages] of Object.entries(payload.errors)) {
      if (!Array.isArray(messages)) continue;
      for (const message of messages) {
        if (typeof message === "string") details.push(`${field}: ${message}`);
      }
    }
  }
  if (details.length > 0) return details.join(" · ");
  return typeof payload.message === "string" ? payload.message : error.message;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  searchParams?: Record<
    string,
    string | number | undefined | readonly (string | number)[]
  >;
};

/**
 * Like labelgridFetch but also returns the HTTP status — needed where the
 * OpenAPI contract branches on it (e.g. PUT track file: 201 stored vs
 * 202 queued upload_attempt).
 */
export async function labelgridFetchRaw<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ status: number; body: T }> {
  const token = getLabelGridToken();
  if (!token) {
    throw new LabelGridConfigError(
      "LABELGRID_API_TOKEN is not set. Sandbox calls are disabled until a token is provided."
    );
  }

  const base = getLabelGridBaseUrl();
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);

  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, String(item));
      } else if (value !== undefined && value !== "") {
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

  return { status: res.status, body: parsed as T };
}

export async function labelgridFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body } = await labelgridFetchRaw<T>(path, options);
  return body;
}

/** Multipart upload (cover art, etc.) — do not set Content-Type manually. */
export async function labelgridUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const token = getLabelGridToken();
  if (!token) {
    throw new LabelGridConfigError(
      "LABELGRID_API_TOKEN is not set. Sandbox calls are disabled until a token is provided."
    );
  }

  const base = getLabelGridBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: formData,
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
      `LabelGrid POST ${path} failed (${res.status})`,
      res.status,
      parsed
    );
  }

  return parsed as T;
}
