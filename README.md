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

### 2. Variables (web service)

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `AUTH_SECRET` | long random secret |
| `NEXT_PUBLIC_APP_URL` | `https://<your-public-domain>` (no trailing slash) |
| `HOSTNAME` | `0.0.0.0` |
| `LABELGRID_ENV` | `sandbox` |
| `LABELGRID_API_TOKEN` | optional until sandbox sync |
| Stripe vars | optional until billing |

### 3. Deploy settings

`railway.toml` sets:

- **Build:** `npm run build` (standalone Next.js)
- **Pre-deploy:** `npx prisma migrate deploy`
- **Start:** `npm start` → `node .next/standalone/server.js`

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
