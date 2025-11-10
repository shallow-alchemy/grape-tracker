# Gilbert - Railway + Netlify Deployment Guide

## Quick Start

**Local development:**
```bash
yarn zero-cache:dev  # Dev zero-cache server
yarn dev             # Frontend dev server
```

**Production:** Railway runs `yarn zero-cache` automatically

## Architecture

```
Netlify (Frontend) → Railway (zero-cache) → PostgreSQL (Railway)
```

## Step-by-Step Deployment

### 1. Railway Setup

**A. Create Project & Add PostgreSQL:**
1. Go to [railway.app](https://railway.app) and create account
2. New Project → Add PostgreSQL
3. Wait for provisioning

**B. Configure PostgreSQL:**
Click PostgreSQL service → Data tab → Query:
```sql
ALTER SYSTEM SET wal_level = logical;
```
Then Settings tab → Restart Database

Verify with:
```sql
SHOW wal_level;  -- Should return "logical"
```

**C. Create Schema:**
In PostgreSQL Query tab:
```sql
CREATE TABLE vineyard (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  varieties TEXT[],
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE block (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  "sizeAcres" NUMERIC,
  "soilType" TEXT,
  notes TEXT,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE vine (
  id TEXT PRIMARY KEY,
  block TEXT NOT NULL,
  "sequenceNumber" INTEGER NOT NULL,
  variety TEXT NOT NULL,
  "plantingDate" BIGINT NOT NULL,
  health TEXT NOT NULL,
  notes TEXT NOT NULL,
  "qrGenerated" BIGINT NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  FOREIGN KEY (block) REFERENCES block(id)
);

CREATE INDEX idx_vine_block ON vine(block);
CREATE INDEX idx_vine_variety ON vine(variety);
```

**D. Deploy Zero-Cache Service:**
1. New → GitHub Repo → Connect grape-tracker
2. Railway auto-deploys
3. Variables tab, add:
   ```
   ZERO_UPSTREAM_DB=${{Postgres.DATABASE_URL}}
   ZERO_REPLICA_FILE=/tmp/sync-replica.db
   ZERO_AUTH_SECRET=<generate-strong-secret>
   PORT=4848
   ```

   Generate secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Settings → Networking → Generate Domain
5. Copy URL (e.g., `https://your-app.up.railway.app`)

**E. Test:**
Visit `https://your-app.up.railway.app/health`
Should see: `{"status":"ok","timestamp":"..."}`

### 2. Netlify Setup

**A. Connect Repo:**
1. Add new site → Import existing project
2. Choose GitHub → Select grape-tracker
3. Build settings (auto-detected from netlify.toml):
   - Build command: `yarn build`
   - Publish directory: `dist`

**B. Environment Variables:**
Site configuration → Environment variables:
```
PUBLIC_ZERO_SERVER=https://your-app.up.railway.app
PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-key>
```

**C. Deploy:**
Click "Deploy site"

### 3. Clerk Configuration

1. [Clerk Dashboard](https://dashboard.clerk.com)
2. Select application
3. Paths → Update:
   - Home URL: `https://your-site.netlify.app`
   - Sign-in URL: `https://your-site.netlify.app`

## Verification Checklist

- [ ] Railway zero-cache health check returns OK
- [ ] PostgreSQL `wal_level` is `logical`
- [ ] All tables created in database
- [ ] Netlify build succeeded
- [ ] Netlify env vars set correctly
- [ ] Clerk URLs updated
- [ ] Can sign in on production site
- [ ] Data syncs between devices

## Troubleshooting

**Zero-cache crashes:**
- Check Railway logs
- Verify `ZERO_UPSTREAM_DB` and `ZERO_AUTH_SECRET` are set
- Confirm PostgreSQL is running

**Frontend can't connect:**
- Verify `PUBLIC_ZERO_SERVER` matches Railway URL exactly
- Check Railway service is running
- Ensure Railway domain is public

**Sync not working:**
- Verify `wal_level = logical` in PostgreSQL
- Check Railway logs for errors
- Test health endpoint

## Updating

**Backend:** Push to GitHub → Railway auto-deploys
**Frontend:** Push to GitHub → Netlify auto-deploys

## Costs (Free Tier)

- **Railway:** $5 credit/month (should cover both services)
- **Netlify:** 100GB bandwidth/month
- **Clerk:** 10,000 MAUs

## Local Development

```bash
# Terminal 1: Zero-cache dev server
yarn zero-cache:dev

# Terminal 2: Frontend dev server
yarn dev
```

Uses local PostgreSQL with `.env` configuration.
