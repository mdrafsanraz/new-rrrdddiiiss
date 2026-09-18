/** Gateway/login pages must never replace the last valid QC report. */
export async function readQcResponse(response: Response): Promise<{ error?: string; report?: import("./quality-report").QcReportSnapshot }> {
  const text = await response.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch {
    const reason = response.status === 401 || response.status === 403 || response.redirected
      ? "Your session may have expired. Sign in again and fetch the report."
      : "The server returned an unexpected response. The request may still have reached LabelGrid. Fetch the report before running analysis again.";
    throw new Error(`QC request failed (HTTP ${response.status}). ${reason}`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid QC response. Fetch the report before retrying analysis.");
  const result = data as { error?: unknown; report?: import("./quality-report").QcReportSnapshot };
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : `QC request failed (HTTP ${response.status}). Fetch the report before retrying.`);
  return { report: result.report };
}
