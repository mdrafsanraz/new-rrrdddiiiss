# RDISTRO

Music distribution platform (Next.js) — marketing site + multi-tenant user dashboard. One shared LabelGrid sandbox account underneath; Stripe for subscriptions.

## Local development

1. Start Postgres:

```bash
docker compose up -d
```

2. Copy env and install:

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up → `/dashboard`.

## Railway production

### 1. Services

1. New project → **PostgreSQL**
2. New service from this GitHub repo (`mdrafsanraz/new-rrrdddiiiss`)

### 2. Variables (web service — this is the step that usually fails)

Adding Postgres does **not** automatically give your web app `DATABASE_URL`.

1. Click your **web** service (the Next.js app), not Postgres  
2. Open **Variables**  
3. **Add Variable** → **Add Reference** (or paste a reference):

| Name | Value |
|------|--------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |

If your Postgres service has a different name, pick that service’s `DATABASE_URL` from the reference picker.

4. Also add these shared/raw variables on the **web** service:

| Name | Value |
|------|--------|
| `AUTH_SECRET` | any long random string (e.g. `openssl rand -hex 32`) |
| `NEXT_PUBLIC_APP_URL` | `https://new-rrrdddiiiss-production.up.railway.app` |
| `HOSTNAME` | `0.0.0.0` |
| `LABELGRID_ENV` | `sandbox` |

5. **Redeploy** the web service

On start, the app runs `prisma db push` to create tables in Postgres (no migration step).

### 3. Deploy settings

`railway.toml` uses **Nixpacks** (not the optional Dockerfile).

- **Build:** `npm run build`
- **Start:** `npm start` → schema sync + standalone server on `0.0.0.0`
- **Healthcheck:** `/api/health`

If Railway still builds with Docker, clear **Settings → Build → Dockerfile path** (leave empty) so Nixpacks is used.

Generate a public domain under **Settings → Networking**, then set `NEXT_PUBLIC_APP_URL` to that URL.

### 4. Stripe webhook (when ready)

Endpoint: `https://<your-domain>/api/stripe/webhook`  
Events: `checkout.session.completed`, `customer.subscription.*`

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local Next.js |
| `npm run build` | Prisma generate + standalone build |
| `npm run db:deploy` | Apply migrations (CI / Railway) |
| `npm run db:migrate` | Create migrations locally |

## Architecture notes

See `important.md`: RDISTRO owns users/plans/ownership; LabelGrid is one distributor account; Free release limits count **submitted** releases only.
