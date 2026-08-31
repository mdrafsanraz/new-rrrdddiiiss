const port = process.env.PORT || "3000";
const baseUrl = process.env.ACR_WORKER_APP_URL || `http://127.0.0.1:${port}`;
const secret = process.env.CRON_SECRET?.trim();
const configuredPollMs = Number(process.env.ACR_WORKER_POLL_MS || 10_000);
const pollMs = Number.isFinite(configuredPollMs)
  ? Math.max(5_000, configuredPollMs)
  : 10_000;

if (!secret) {
  console.error("[acr-worker] CRON_SECRET is required");
  process.exit(1);
}

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function poll() {
  try {
    const response = await fetch(`${baseUrl}/api/cron/acr`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await response.text();
    if (!response.ok) {
      console.error(`[acr-worker] ${response.status}: ${body.slice(0, 500)}`);
      return;
    }
    const result = JSON.parse(body);
    if (result.processed > 0) {
      console.log(`[acr-worker] processed ${result.processed} queued release(s)`);
    }
  } catch (error) {
    console.error(
      "[acr-worker] poll failed:",
      error instanceof Error ? error.message : error
    );
  }
}

console.log(`[acr-worker] polling ${baseUrl} every ${pollMs}ms`);
while (true) {
  await poll();
  await wait(pollMs);
}
