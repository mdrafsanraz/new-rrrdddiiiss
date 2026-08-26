#!/usr/bin/env node
/**
 * Railway pre-deploy: apply Prisma migrations.
 * Fails with a clear message if DATABASE_URL is not linked to this service.
 */
const { spawnSync } = require("node:child_process");

const url = process.env.DATABASE_URL?.trim();

if (!url) {
  console.error(`
[rdistro] DATABASE_URL is missing on this Railway service.

Fix in Railway dashboard:
1. Open your WEB service (not the Postgres service)
2. Variables → + New Variable
3. Name: DATABASE_URL
4. Value: \${{Postgres.DATABASE_URL}}
   (use Variable Reference — pick your Postgres service's DATABASE_URL)
5. Also set:
   AUTH_SECRET=<random long string>
   NEXT_PUBLIC_APP_URL=https://new-rrrdddiiiss-production.up.railway.app
   HOSTNAME=0.0.0.0
   LABELGRID_ENV=sandbox
6. Redeploy

Postgres variables do NOT auto-apply to the web service until you reference them.
`);
  process.exit(1);
}

if (!url.startsWith("postgres")) {
  console.error(
    `[rdistro] DATABASE_URL must be a Postgres URL. Got: ${url.slice(0, 24)}…`
  );
  process.exit(1);
}

console.log(
  "[rdistro] Running prisma migrate deploy against",
  url.replace(/:[^:@/]+@/, ":****@")
);

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
