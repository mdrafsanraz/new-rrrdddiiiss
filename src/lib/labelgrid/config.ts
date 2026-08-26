/**
 * LabelGrid environment gate.
 * Sandbox-only in this phase — production must be opted in explicitly later.
 */

export type LabelGridEnv = "sandbox" | "production";

const SANDBOX_BASE =
  "https://api-sandbox.stg.labelgrid.com/api/public";

export class LabelGridConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LabelGridConfigError";
  }
}

export function getLabelGridEnv(): LabelGridEnv {
  const raw = (process.env.LABELGRID_ENV ?? "sandbox").toLowerCase();
  if (raw === "sandbox") return "sandbox";
  if (raw === "production") return "production";
  throw new LabelGridConfigError(
    `Invalid LABELGRID_ENV="${process.env.LABELGRID_ENV}". Use "sandbox" or "production".`
  );
}

export function getLabelGridBaseUrl(): string {
  const env = getLabelGridEnv();

  if (env === "production") {
    // Fail closed until production is deliberately enabled.
    if (process.env.LABELGRID_ALLOW_PRODUCTION !== "true") {
      throw new LabelGridConfigError(
        "LABELGRID_ENV=production is blocked. Set LABELGRID_ALLOW_PRODUCTION=true only when ready."
      );
    }
    const url = process.env.LABELGRID_BASE_URL;
    if (!url || url.includes("sandbox")) {
      throw new LabelGridConfigError(
        "Production LabelGrid requires LABELGRID_BASE_URL pointing to the production API."
      );
    }
    return url.replace(/\/$/, "");
  }

  // Sandbox: never silently use a production URL.
  const override = process.env.LABELGRID_BASE_URL;
  if (override) {
    if (!override.includes("sandbox") && !override.includes("stg")) {
      throw new LabelGridConfigError(
        "Sandbox mode refuses LABELGRID_BASE_URL that does not look like sandbox/stg."
      );
    }
    return override.replace(/\/$/, "");
  }

  return SANDBOX_BASE;
}

export function getLabelGridToken(): string | null {
  const token = process.env.LABELGRID_API_TOKEN?.trim();
  return token || null;
}

export function isLabelGridLive(): boolean {
  return Boolean(getLabelGridToken());
}
