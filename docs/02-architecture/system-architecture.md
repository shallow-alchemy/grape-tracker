# Gilbert - System Architecture

> **Purpose**: This document describes how Gilbert's services connect and communicate. Read this to understand the overall system design and data flow patterns.

## Architecture Overview

Gilbert uses a real-time sync architecture with two different implementations depending on the branch.

## Service Architecture (Production - Railway)

```
┌─────────────────────────────────────────────────┐
│ Railway Project (Production)                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  PostgreSQL (wal_level=logical)                │
│      ↑           ↑                              │
│      │           │                              │
│  zero-cache   axum-backend                     │
│   (port 4848)  (port 3001)                     │
│      ↑           ↑                              │
└──────┼───────────┼──────────────────────────────┘
       │           │
   ┌───┴───────────┴────┐
   │   Netlify Frontend │
   │   - Zero sync      │
   │   - Clerk auth     │
   └────────────────────┘
```

## Service Responsibilities

### 1. PostgreSQL
**Role**: Source of truth for all data

**Configuration**:
- Database: `gilbert`
- Port: 5432 (standard)
- **Required setting**: `wal_level = logical` for logical replication
- Enables: Write-Ahead Logging (WAL) with semantic change tracking

**Tables** (see `database-schema.md` for complete schema):
- `vine`: Grape vine tracking
- `block`: Vineyard blocks/rows
- `vintage`: Harvest records per season
- `wine`: Finished wine products
- `stage_history`: Stage transition tracking
- `task_template`: Configurable tasks per stage
- `task`: Actual task instances
- `measurement`: Chemistry/tasting measurements
- `measurement_range`: Reference data for validation

### 2. zero-cache Server
**Role**: Real-time sync server, broadcasts changes to all connected clients

**Port**: 4848

**Responsibilities**:
- Subscribes to PostgreSQL logical replication slot
- Decodes WAL changes into semantic events (INSERT/UPDATE/DELETE)
- Broadcasts changes to all connected browser clients
- Handles client authentication via Clerk tokens
- Manages permissions system (schema-defined)

**Environment Variables**:
```bash
ZERO_UPSTREAM_DB="postgresql://user@host:5432/gilbert"
ZERO_REPLICA_FILE="/tmp/sync-replica.db"
ZERO_AUTH_SECRET="dev-secret-key-change-in-production"
```

**Schema Compilation**:
Zero requires `schema.js` but codebase uses TypeScript:
```bash
npx tsc schema.ts --module esnext --target es2020 --moduleResolution bundler
```

### 3. axum-backend (Rust Server)
**Role**: Server-side operations and database migrations

**Port**: 3001

**Responsibilities**:
- Run database migrations (DDL changes)
- Provide REST APIs for server-side operations
- Weather API proxy (Open-Meteo)
- Location API proxy (Nominatim/OpenStreetMap)
- Future: Email sending, report generation, analytics

**Note**: NOT used for CRUD operations on domain data (that's handled by Zero)

### 4. Frontend (React + Rsbuild)
**Role**: User interface and client-side logic

**Port**: 3000 (dev), deployed on Netlify (production)

**Responsibilities**:
- React 19 UI with TypeScript
- Clerk authentication integration
- Zero sync client connection
- QR code scanning (html5-qrcode)
- CSS Modules styling with theme tokens

**Connections**:
- `zero-cache` (port 4848) - Real-time data sync
- `axum-backend` (port 3001) - REST API calls (weather, etc.)
- Clerk - Authentication

## Data Flow Patterns

### Read Operations (Client → Database)

```
Browser Client
    ↓
Zero Client Library
    ↓
WebSocket to zero-cache
    ↓
PostgreSQL Logical Replication
    ↓
Data synchronized to client
```

**How it works**:
1. Client subscribes to queries (e.g., "all vines in block A")
2. zero-cache streams initial data snapshot
3. PostgreSQL WAL changes decoded by logical replication
4. zero-cache broadcasts incremental updates to all subscribers
5. Client UI updates automatically (reactive)

### Write Operations (Client → Database)

```
Browser Client
    ↓
Zero Mutators (optimistic)
    ↓
zero-cache Server
    ↓
PostgreSQL
    ↓
WAL Change Event
    ↓
zero-cache broadcasts to all clients
    ↓
All connected clients update
```

**How it works**:
1. Client calls mutator (e.g., `createVine()`)
2. Optimistic update in local IndexedDB
3. Mutation sent to zero-cache
4. zero-cache validates permissions
5. Writes to PostgreSQL
6. PostgreSQL generates WAL event
7. zero-cache receives WAL event, broadcasts to all clients
8. Client reconciles optimistic update with server state

### Server-Side Operations (Weather, etc.)

```
Browser Client
    ↓
Fetch API
    ↓
axum-backend (Rust)
    ↓
External API (Open-Meteo, etc.)
    ↓
Response to client
```

**How it works**:
1. Client makes HTTP request to backend
2. Backend proxies to external API (weather, geocoding)
3. Backend returns formatted response
4. Client updates UI

**Why separate from Zero?**
- Server-side secrets (API keys)
- Rate limiting/caching
- Business logic that shouldn't run client-side
- No database writes (just reads from external APIs)

## Why PostgreSQL Needs `wal_level=logical`

PostgreSQL has 3 WAL levels:

1. **`minimal`**: Basic crash recovery only
2. **`replica`**: Physical replication (disk byte changes)
3. **`logical`**: Semantic replication (table/column/value changes)

**Zero requires `logical` because**:
- Physical replication logs raw disk bytes (unreadable)
- Logical replication decodes changes into semantic events:
  ```sql
  INSERT INTO vine (id, variety) VALUES ('abc', 'Cabernet Franc')
  ```
- Zero needs to know WHAT changed (table, columns, values) to broadcast to clients
- Without logical level, Zero cannot decode WAL into meaningful events

**Performance impact**:
- CPU: <1% overhead
- Disk: ~3-5% larger WAL files
- Negligible for most workloads

## Backend API vs Zero Division

**Zero handles** (all CRUD on domain data):
- Vines (create, update, delete)
- Blocks (create, update, delete, migrate vines)
- Vintages (harvest tracking)
- Wines (winemaking process)
- Tasks (create, complete, skip)
- Measurements (record chemistry data)

**Backend handles** (server-side operations):
- Database migrations (DDL)
- Weather API calls (Open-Meteo)
- Geocoding API calls (Nominatim)
- Future: Emails, reports, analytics, PDF generation

**Why this split?**
- Zero is fast for real-time CRUD with built-in permissions
- Backend handles operations that require server-side secrets or heavy computation
- Frontend connects to both simultaneously

## Two Branch Strategy

### Main Branch: Rocicorp Zero

**Services**:
1. PostgreSQL (Homebrew, local)
2. zero-cache (local)
3. Rsbuild dev server (local)

**Pros**:
- Simpler setup (no Docker)
- Works with local PostgreSQL
- Built-in permissions system
- Fewer moving parts

**Cons**:
- Requires schema.js compilation from TypeScript
- Finicky PostgreSQL configuration
- Less documentation/smaller community

**Status**: ✅ Working, Phase 1 complete

### electricsql Branch: ElectricSQL

**Services**:
1. PostgreSQL (Docker, port 54321)
2. Electric sync service (Docker, port 3002)
3. Backend API (Express, port 3001)
4. Rsbuild dev server (local, port 3000)

**Architecture**:
```
Browser
  ├─ Electric HTTP API (reads) → PostgreSQL
  └─ Backend API (writes) → PostgreSQL → Electric → All clients
```

**Pros**:
- Modern HTTP-based sync
- Better documentation
- TypeScript support out of box
- Active community

**Cons**:
- Requires Docker setup
- Requires separate backend API for writes
- More complex (3 services + DB)
- Port conflicts to manage

**Status**: ✅ Full stack working, ready for testing

## Authentication Flow

**Provider**: Clerk (SaaS authentication)

```
Browser
  ↓
Unauthenticated? → Sign-In Page
  ↓
Clerk Modal (email/password/OAuth)
  ↓
JWT Token
  ↓
Zero Client (token in headers)
  ↓
zero-cache validates token
  ↓
Permissions applied per schema
  ↓
Authenticated Dashboard
```

**Key points**:
- Clerk handles all auth logic (no backend needed)
- JWT tokens passed to zero-cache for validation
- Permissions defined in `schema.ts` (Zero schema)
- UserButton component for sign-out

## Routing Structure

**Router**: Wouter (~1.5kb, minimal)

**Routes**:
- `/` - Dashboard (weather + tasks)
- `/vineyard` - Vineyard management (blocks + vines)
- `/vineyard/vine/:id` - Individual vine details
- `/winery` - Winery management (vintages + wines)

**Navigation**:
- Header "GILBERT" title links to `/`
- Header "VINEYARD" | "WINERY" links to respective pages
- QR scanner navigates to `/vineyard/vine/:id` on successful scan

## Component Architecture

**Pattern**: Self-contained components with data fetching

**Example**:
```typescript
// ❌ Bad: Prop drilling
export const Parent = () => {
  const vines = useQuery(...);
  return <Child vines={vines} />;
};

// ✅ Good: Component fetches own data
export const Child = () => {
  const vines = useQuery(...);
  return <div>{vines.map(...)}</div>;
};
```

**Why?**
- Reduces coupling between components
- Makes components reusable
- Simplifies refactoring
- Follows engineering-principles.md guidelines

## Mobile vs Desktop Layout

### Mobile (< 768px)
- Full viewport height, no page scrolling
- Weather section scrolls independently
- QR scan button fixed at bottom (33.33vh)
- Single-column layout

### Desktop (>= 768px)
- 1400px max-width canvas
- Page scrolls vertically
- QR scan button hidden
- Weather at top, 2x2 dashboard grid below
- Generous spacing (32px gaps, 40px padding)

**Design Philosophy**: Mobile-first (primary platform), desktop is secondary

## Performance Considerations

### Zero Sync
- Optimistic updates (instant UI feedback)
- IndexedDB for local persistence
- WebSocket for real-time updates
- Efficient diffing algorithm

### React Rendering
- CSS Modules (scoped, no global conflicts)
- Fat arrow components (functional, no class overhead)
- Minimal re-renders (proper React hooks usage)

### Database
- Indexes on foreign keys (block, variety)
- Logical replication overhead: <1% CPU, ~3-5% disk

## Error Handling

### Zero Connection Issues
- Client automatically reconnects on network failure
- Optimistic updates queued until connection restored
- User sees "offline" indicator (future feature)

### Backend API Issues
- Weather API failures show last known data
- Graceful degradation (show placeholder if API down)

### Database Issues
- zero-cache handles connection pooling
- Automatic retry with exponential backoff
- Logs errors for debugging

## Security

### Authentication
- Clerk JWT tokens (signed, tamper-proof)
- Tokens validated on every zero-cache request
- Short expiry with automatic refresh

### Permissions
- Defined in Zero schema (`schema.ts`)
- Row-level security (future: per-vineyard isolation)
- Server-side enforcement (clients can't bypass)

### API Keys
- Backend environment variables only
- Never exposed to browser clients
- Railway secrets management

## Deployment

### Frontend
- Platform: Netlify
- Build: `yarn build` (Rsbuild)
- Environment: `PUBLIC_ZERO_SERVER`, `PUBLIC_CLERK_PUBLISHABLE_KEY`

### Backend
- Platform: Railway
- Services: PostgreSQL, zero-cache, axum-backend
- Environment: `ZERO_UPSTREAM_DB`, `ZERO_AUTH_SECRET`, etc.

## Related Documentation

- **Database Schema**: See `database-schema.md` for complete table definitions
- **Local Development**: See `../03-setup/local-development.md` for running locally
- **Code Standards**: See `../engineering-principles.md` for implementation patterns
