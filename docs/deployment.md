# Gilbert - Railway + Netlify Deployment Guide

## Quick Start

**Local development:**
```bash
yarn dev  # Runs zero-cache, backend, and frontend concurrently
```

**Production:** Railway deploys zero-cache and backend automatically, Netlify deploys frontend

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Railway Project                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  PostgreSQL (wal_level=logical)                             │
│      ↑           ↑                                           │
│      │           │                                           │
│  zero-cache   axum-backend   queries-service                │
│  (port 4848)  (port 3001)    (port 3002)                    │
│      ↑           ↑              ↑                            │
│      │           │              │ (synced queries)           │
│      └───────────┼──────────────┘                            │
│                  │                                           │
└──────────────────┼───────────────────────────────────────────┘
                   │
               ┌───┴────┐
               │ Netlify │
               │ Frontend│
               └─────────┘
```

**Data Flow:**
- **Domain Data:** Frontend ↔ Zero Cache ↔ PostgreSQL
- **Synced Queries:** Zero Cache → Queries Service (user-filtered data)
- **Migrations:** Backend (sqlx) → PostgreSQL
- **STL Files:** Generated client-side in browser

---

## Step 1: Railway PostgreSQL Setup

### 1.1 Create PostgreSQL Service

1. Go to [railway.app](https://railway.app) and create account
2. New Project → Add PostgreSQL
3. Wait for provisioning
4. Note the `DATABASE_URL` from Variables tab

### 1.2 Enable Logical Replication

**Required for Zero sync to work.**

Click PostgreSQL service → Data tab → Query:
```sql
ALTER SYSTEM SET wal_level = logical;
```

Then Settings tab → **Restart Database** (critical step!)

Verify with:
```sql
SHOW wal_level;  -- Should return "logical"
```

**Note:** The database must be restarted for the change to take effect.

---

## Step 2: Railway Backend Deployment (Axum)

The backend handles database migrations automatically using sqlx.

### 2.1 Add Backend Service

1. In Railway project, click "New" → "GitHub Repo"
2. Select your `grape-tracker` repository
3. Railway will detect the Rust project

### 2.2 Configure Service Settings

**Settings → Build:**
- Root Directory: `backend`
- Build Command: `cargo build --release`
- Start Command: `./target/release/gilbert-backend`

**Settings → Watch Paths:**
```
backend/**
migrations/**
```

### 2.3 Environment Variables

In backend service Variables tab, add:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=3001
RUST_LOG=info
ANTHROPIC_API_KEY=sk-ant-...   # Required for AI features
OPENAI_API_KEY=sk-...          # Required for RAG embeddings
```

**Note:** The `${{Postgres.DATABASE_URL}}` syntax references your PostgreSQL service's connection string.

**AI Integration:**
- `ANTHROPIC_API_KEY` - Enables AI recommendations (Claude). Get a key from https://console.anthropic.com/settings/keys
- `OPENAI_API_KEY` - Enables RAG for grounded recommendations. Get a key from https://platform.openai.com/api-keys

### 2.4 Deploy

1. Click "Deploy" or push to GitHub to trigger deploy
2. Watch logs for:
   ```
   INFO Connecting to database...
   INFO Running migrations...
   INFO Server starting on 0.0.0.0:3001
   ```

### 2.5 Generate Public URL

1. Settings → Networking → Generate Domain
2. Copy the URL (e.g., `https://gilbert-backend.up.railway.app`)

### 2.6 Verify Deployment

Test the health endpoint:
```bash
curl https://your-backend.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected"
}
```

**Database Migrations:**

The backend automatically runs migrations on startup. You can verify by connecting to PostgreSQL:

```bash
# Connect to Railway PostgreSQL
psql $DATABASE_URL

# Check migration history
SELECT * FROM _sqlx_migrations ORDER BY installed_on DESC;

# List tables
\dt
```

You should see: `vineyard`, `block`, `vine`, `_sqlx_migrations`

---

## Step 3: Railway Queries Service Deployment

The queries service handles synced queries with user authentication for multi-tenant data isolation.

### 3.1 Add Queries Service

1. In Railway project, click "New" → "GitHub Repo"
2. Select your `grape-tracker` repository
3. Set root directory to `/queries-service`

### 3.2 Configure Service Settings

**Settings → General:**
- Root Directory: `queries-service`

Railway will auto-detect Node.js and use Nixpacks to build.

**Watch Paths** (in railway.toml):
```
queries-service/**
schema.ts
```

**Note:** The `schema.ts` file is copied into queries-service. If you update the root schema.ts, run `yarn sync-schema` in queries-service and commit the change.

### 3.3 Environment Variables

Variables tab, add:
```bash
PORT=3002
NODE_ENV=production
```

### 3.4 Generate Public URL

1. Settings → Networking → Generate Domain
2. Copy URL (e.g., `https://queries-service.up.railway.app`)
3. **Save this URL** - you'll need it for zero-cache configuration

### 3.5 Verify Deployment

Test the health endpoint:
```bash
curl https://your-queries-service.up.railway.app/health
```

Expected response:
```json
{"status":"ok"}
```

---

## Step 4: Railway Zero-Cache Deployment

### 4.1 Add Zero-Cache Service

1. New → GitHub Repo → Connect `grape-tracker`
2. Railway auto-detects and deploys

### 4.2 Environment Variables

Variables tab, add:
```bash
ZERO_UPSTREAM_DB=${{Postgres.DATABASE_URL}}
ZERO_REPLICA_FILE=/tmp/sync-replica.db
ZERO_AUTH_SECRET=<generate-strong-secret>
ZERO_GET_QUERIES_URL=https://your-queries-service.up.railway.app/get-queries
ZERO_AUTH_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json
PORT=4848
```

**Important:** Replace `your-queries-service.up.railway.app` with the actual URL from Step 3.4.

Generate auth secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4.3 Generate Public URL

1. Settings → Networking → Generate Domain
2. Copy URL (e.g., `https://zero-cache.up.railway.app`)

### 4.4 Verify Deployment

Visit `https://your-zero-cache.up.railway.app/health`

Should see: `{"status":"ok","timestamp":"..."}`

---

## Step 5: Netlify Frontend Deployment

### 5.1 Connect Repository

1. Add new site → Import existing project
2. Choose GitHub → Select `grape-tracker`
3. Build settings (auto-detected from netlify.toml):
   - Build command: `yarn build`
   - Publish directory: `dist`

### 5.2 Environment Variables

Site configuration → Environment variables:
```bash
PUBLIC_ZERO_SERVER=https://your-zero-cache.up.railway.app
PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-key>
VITE_BACKEND_URL=https://your-backend.up.railway.app
```

**Where to find Railway URLs:**
- Go to each Railway service → Settings → Domains
- Copy the generated domain

### 5.3 Deploy

Click "Deploy site" and wait for build to complete.

---

## Step 6: Clerk Configuration

1. [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Paths → Update:
   - Home URL: `https://your-site.netlify.app`
   - Sign-in URL: `https://your-site.netlify.app`

---

## Verification Checklist

**Railway Backend:**
- [ ] Health endpoint returns `{"status":"ok","database":"connected"}`
- [ ] Migrations ran successfully (check logs)
- [ ] Database has vineyard, block, vine tables

**Railway Queries Service:**
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Logs show JWT decoding (when requests come in)
- [ ] Domain is publicly accessible

**Railway Zero-Cache:**
- [ ] Health check returns OK
- [ ] Connected to PostgreSQL with `wal_level=logical`
- [ ] `ZERO_GET_QUERIES_URL` points to queries service
- [ ] `ZERO_AUTH_JWKS_URL` points to Clerk JWKS

**Netlify Frontend:**
- [ ] Build succeeded
- [ ] Environment variables set
- [ ] Can sign in with Clerk
- [ ] Can create vines
- [ ] Data syncs between devices
- [ ] Synced queries filter by user (test with 2 accounts)

---

## Database Migrations

### How It Works

1. Migrations live in `migrations/` directory
2. Backend runs migrations automatically on startup using sqlx
3. Migration history tracked in `_sqlx_migrations` table
4. **Never manually create tables** - always use migrations

### Adding New Migrations

```bash
cd backend

# Create new migration file
sqlx migrate add your_migration_name

# Edit the generated SQL file
# migrations/20251111000002_add_photos.sql

# Test locally
cargo run

# Commit and push
git add migrations/
git commit -m "Add migration for photos table"
git push
```

Railway will automatically run the new migration on next deploy.

### Checking Migration Status

```bash
# Connect to Railway PostgreSQL
psql $DATABASE_URL

# View migration history
SELECT version, description, installed_on, success
FROM _sqlx_migrations
ORDER BY installed_on DESC;
```

### Migration Best Practices

1. **Always use migrations** - never manually ALTER tables in production
2. **Test locally first** - run `cargo run` to verify migration works
3. **Idempotent migrations** - use `IF NOT EXISTS` where applicable
4. **One logical change per migration** - easier to track and rollback
5. **Descriptive names** - `add_photos_table` not `migration1`

---

## Troubleshooting

### Backend Won't Start

**Error: "Failed to connect to database"**
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL service is running
- Test connection: `psql $DATABASE_URL`

**Error: "Failed to run migrations"**
- Check migration SQL syntax
- Look for conflicting migrations
- Verify `migrations/` directory is included in deployment

**Error: "Address already in use"**
- Railway assigns ports automatically
- Ensure you're using `$PORT` environment variable

### Queries Service Issues

**"Unknown query: myQuery"**
- Query not registered in `validatedQueries` in `queries-service/src/index.ts`
- Add query: `[myQuery.queryName]: withValidation(myQuery)`

**"No Authorization header"**
- Zero-cache not forwarding JWT to queries service
- Check `ZERO_AUTH_JWKS_URL` is set correctly

**Query returns 0 results**
- Client passing `null` instead of `user?.id`
- Check component is passing user ID to query

### Zero-Cache Connection Issues

**"Cannot connect to database"**
- Verify `ZERO_UPSTREAM_DB` matches PostgreSQL `DATABASE_URL`
- Check `wal_level = logical` is set (and database restarted!)

**"Schema not found"**
- Ensure migrations have run (backend creates tables)
- Verify zero-cache can read from PostgreSQL

**Synced queries not working**
- Verify `ZERO_GET_QUERIES_URL` environment variable is set
- Check queries service is running and accessible
- Check zero-cache logs for query resolution errors

### Frontend Sync Issues

**"Failed to connect to Zero"**
- Check `PUBLIC_ZERO_SERVER` URL is correct
- Verify zero-cache service is running
- Test zero-cache health endpoint

**"Data not syncing"**
- Confirm `wal_level = logical` (common issue!)
- Check zero-cache logs for errors
- Verify tables exist in database

---

## Updating Services

**Backend:**
```bash
git add backend/
git commit -m "Update backend"
git push
```
Railway auto-deploys. Migrations run automatically if new ones added.

**Frontend:**
```bash
git add src/
git commit -m "Update frontend"
git push
```
Netlify auto-deploys.

**Adding Migrations:**
```bash
cd backend
sqlx migrate add new_feature
# Edit SQL file
git add migrations/
git commit -m "Add migration"
git push
```
Railway runs new migration on next backend deploy.

---

## Cost Estimates (Free Tier)

- **Railway:** $5 credit/month
  - PostgreSQL: ~$2/month
  - Zero-cache: ~$1/month
  - Backend: ~$1/month
  - Queries service: ~$0.50/month
- **Netlify:** 100GB bandwidth/month (plenty for MVP)
- **Clerk:** 10,000 MAUs free

---

## Local Development

**Option A: Full dev server (recommended)**
```bash
yarn dev
```
Runs zero-cache, backend, frontend, and queries-service concurrently.

**Option B: Individual services**
```bash
# Terminal 1: Zero-cache dev server
yarn dev:zero

# Terminal 2: Backend dev server
yarn dev:backend

# Terminal 3: Frontend dev server
yarn dev:frontend

# Terminal 4: Queries service dev server
yarn dev:queries
```

**Requirements:**
- Local PostgreSQL with `wal_level = logical`
- `.env` configured with:
  - `DATABASE_URL` for PostgreSQL
  - `ZERO_GET_QUERIES_URL=http://localhost:3002/get-queries`
  - `ZERO_AUTH_JWKS_URL` for Clerk JWKS

---

**Last Updated:** Nov 24, 2025
