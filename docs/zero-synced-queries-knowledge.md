# Zero Synced Queries Knowledge Base

## Overview

Zero's synced queries provide server-authoritative query resolution while maintaining Zero's real-time sync capabilities. The server defines queries that return AST JSON to the client, enabling:
- User-specific data isolation enforced at the server
- Type-safe query definitions with Zod validation
- Centralized query logic shared between client and server
- Optimistic client rendering with server-verified authentication

## Core Concepts

### Two Types of Synced Queries

1. **`syncedQuery`** - Queries without user context
   - Used for public/shared data
   - No authentication required
   - All users see the same data

2. **`syncedQueryWithContext`** - User-authenticated queries
   - First parameter is the context value (typically `userID: string | undefined`)
   - Client passes userID for optimistic rendering
   - Server extracts authenticated userID from JWT and passes it
   - Security enforced server-side

### Critical Pattern: Context is Just a String

**IMPORTANT**: The context parameter for `syncedQueryWithContext` is just `string | undefined`, NOT an object like `{ userID: string }`.

```typescript
// ✅ CORRECT - Context is string | undefined
syncedQueryWithContext(
  'myQuery',
  z.tuple([]),
  (userID: string | undefined) => builder.table.where('user_id', userID ?? '')
)

// ❌ WRONG - Context is NOT an object
syncedQueryWithContext(
  'myQuery',
  z.tuple([]),
  (ctx: { userID: string }) => builder.table.where('user_id', ctx.userID)
)
```

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  Client Components                                          │
│  ├─ import { queries } from './queries'                    │
│  └─ useQuery(queries.myQuery(user?.id))                    │
│                     ↑                                       │
│         Client passes userID for optimistic UI             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Shared Query Definitions                                   │
│  ├─ export const queries = {                               │
│  │    myQuery: syncedQueryWithContext(...)                 │
│  │  }                                                       │
│  └─ Same file imported by both client AND server           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Queries Service (Hono/Express Server)                      │
│  ├─ POST /get-queries endpoint                             │
│  ├─ Extract userID from JWT (Authorization header)         │
│  └─ Call: query(userID, ...args)                           │
│                     ↑                                       │
│         Server passes VERIFIED userID from JWT             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  zero-cache Server                                          │
│  ├─ ZERO_GET_QUERIES_URL env var points to queries service │
│  └─ Coordinates real-time sync                             │
└─────────────────────────────────────────────────────────────┘
```

## Query Definition Patterns (from ztunes)

### Reference Implementation: ztunes/zero/queries.ts

```typescript
import { syncedQuery, syncedQueryWithContext } from '@rocicorp/zero';
import { builder } from './schema';
import z from 'zod';

export const queries = {
  // User-authenticated query (no parameters)
  user: syncedQueryWithContext(
    'user',
    z.tuple([]),
    (userID: string | undefined) =>
      builder.user.where('id', userID ?? '').one(),
  ),

  // Global query (no auth context)
  artistPreload: syncedQuery('artistPreload', z.tuple([]), () =>
    builder.artist.orderBy('popularity', 'desc').limit(1_000),
  ),

  // Global query with parameter
  getHomepageArtists: syncedQuery(
    'getHomepageArtists',
    z.tuple([z.string()]),
    (q: string) =>
      builder.artist
        .where('name', 'ILIKE', `%${q}%`)
        .orderBy('popularity', 'desc')
        .limit(20),
  ),

  // User-authenticated query with related data
  getCartItems: syncedQueryWithContext(
    'getCartItems',
    z.tuple([]),
    (userID: string | undefined) =>
      builder.cartItem
        .related('album', album =>
          album.one().related('artist', artist => artist.one()),
        )
        .where('userId', userID ?? ''),
  ),

  // Global query with parameter and relations
  getArtist: syncedQuery(
    'getArtist',
    z.tuple([z.string()]),
    (artistID: string) =>
      builder.artist
        .where('id', artistID)
        .related('albums', album => album.related('cartItems'))
        .one(),
  ),
};
```

### Key Observations

1. **Queries exported as object** - `export const queries = { ... }`
2. **Context is `string | undefined`** - NOT an object
3. **Empty string fallback** - `userID ?? ''` prevents null query errors
4. **`.one()` for single results** - Returns one row or undefined

## Server Implementation Pattern (from ztunes)

### Reference: ztunes/app/routes/api/zero/get-queries.ts

```typescript
import { json } from '@tanstack/react-start';
import { schema } from 'zero/schema';
import { createServerFileRoute } from '@tanstack/react-start/server';
import { auth } from 'auth/auth';
import { handleGetQueriesRequest } from '@rocicorp/zero/server';
import { ReadonlyJSONValue, withValidation } from '@rocicorp/zero';
import { queries } from 'zero/queries';

// Wrap all queries with validation
const validated = Object.fromEntries(
  Object.values(queries).map(q => [q.queryName, withValidation(q)]),
);

export const ServerRoute = createServerFileRoute(
  '/api/zero/get-queries',
).methods({
  POST: async ({ request }) => {
    // Extract authenticated userID from session
    const session = await auth.api.getSession(request);
    const userID = session?.user.id;

    return json(
      await handleGetQueriesRequest(
        (name, args) => getQuery(userID, name, args),
        schema,
        request,
      ),
    );
  },
});

function getQuery(
  userID: string | undefined,
  name: string,
  args: readonly ReadonlyJSONValue[],
) {
  const q = validated[name];
  if (!q) {
    throw new Error('Unknown query: ' + name);
  }
  // Pass userID as FIRST argument, then spread remaining args
  return { query: q(userID, ...args) };
}
```

### Hono Implementation (Gilbert/grape-tracker pattern)

```typescript
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { withValidation } from '@rocicorp/zero';
import { handleGetQueriesRequest } from '@rocicorp/zero/server';
import { schema } from '../../schema.js';
import { activeWines } from './queries.js';

const app = new Hono();
app.use('/*', cors());

// Register queries with validation
const validatedQueries = {
  [activeWines.queryName]: withValidation(activeWines),
};

// Extract userID from JWT
const extractUserID = (req: Request): string | undefined => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return undefined;

  try {
    const token = authHeader.replace('Bearer ', '');
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return undefined;

    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
    return payload.sub;
  } catch (err) {
    return undefined;
  }
};

// Query resolver
const getQuery = (
  userID: string | undefined,
  name: string,
  args: readonly unknown[]
) => {
  const query = validatedQueries[name as keyof typeof validatedQueries];
  if (!query) throw new Error(`Unknown query: ${name}`);
  return query(userID, ...args);
};

app.post('/get-queries', async (c) => {
  const userID = extractUserID(c.req.raw);

  const result = await handleGetQueriesRequest(
    (name, args) => ({ query: getQuery(userID, name, args) }),
    schema,
    c.req.raw
  );

  return c.json(result);
});

const port = 3002;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
```

## Client Usage Pattern (from ztunes)

### Reference: ztunes/app/components/cart.tsx

```typescript
import { useQuery } from '@rocicorp/zero/react';
import { queries } from 'zero/queries';
import { authClient } from 'auth/client';

export function Cart() {
  const session = authClient.useSession();

  // Pass user ID for optimistic rendering
  // Server will use authenticated userID from JWT
  const [items] = useQuery(queries.getCartItems(session.data?.user.id ?? ''));

  if (!session.data?.user) {
    return null;
  }

  return <div>Cart ({items.length ?? 0})</div>;
}
```

### Key Patterns

1. **Import queries object** - `import { queries } from 'zero/queries'`
2. **Call query as function** - `queries.getCartItems(session.data?.user.id ?? '')`
3. **Pass userID with fallback** - Prevents query errors when not logged in
4. **Result is reactive** - Auto-updates when data changes

### ZeroProvider Setup (ztunes)

```typescript
import { Zero } from '@rocicorp/zero';
import { ZeroProvider } from '@rocicorp/zero/react';
import { schema, Schema } from 'zero/schema';

export function ZeroInit({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();

  const opts = useMemo(() => ({
    schema,
    userID: session.data?.user.id ?? 'anon',
    server: serverURL,
    mutators: createMutators(session.data?.user.id),
  }), [session.data?.user.id]);

  return <ZeroProvider {...opts}>{children}</ZeroProvider>;
}
```

## hello-zero-solid Pattern (No Auth)

For apps without authentication, pass `undefined` as the context:

### shared/queries.ts

```typescript
import { syncedQuery, escapeLike } from "@rocicorp/zero";
import z from "zod";
import { builder } from "./schema";

export const queries = {
  users: syncedQuery("user", z.tuple([]), () => builder.user),

  messages: syncedQuery("messages", z.tuple([]), () =>
    builder.message.orderBy("timestamp", "desc")
  ),

  filteredMessages: syncedQuery(
    "filteredMessages",
    z.tuple([
      z.object({
        senderID: z.string(),
        mediumID: z.string(),
        body: z.string(),
        timestamp: z.string(),
      }),
    ]),
    ({ senderID, mediumID, body, timestamp }) => {
      let q = builder.message
        .related("medium", (q) => q.one())
        .related("sender", (q) => q.one())
        .orderBy("timestamp", "desc");

      if (senderID) q = q.where("senderID", senderID);
      if (mediumID) q = q.where("mediumID", mediumID);
      if (body) q = q.where("body", "LIKE", `%${escapeLike(body)}%`);
      if (timestamp) {
        q = q.where("timestamp", ">=", new Date(timestamp).getTime());
      }

      return q;
    }
  ),
};
```

### server/get-queries.ts

```typescript
import { handleGetQueriesRequest } from "@rocicorp/zero/server";
import { withValidation } from "@rocicorp/zero";
import { queries } from "../shared/queries";
import { schema } from "../shared/schema";
import { ReadonlyJSONValue } from "@rocicorp/zero";

const validated = Object.fromEntries(
  Object.values(queries).map((q) => [q.queryName, withValidation(q)])
);

export async function handleGetQueries(request: Request) {
  return await handleGetQueriesRequest(getQuery, schema, request);
}

function getQuery(name: string, args: readonly ReadonlyJSONValue[]) {
  const q = validated[name];
  if (!q) throw new Error(`No such query: ${name}`);
  // Pass undefined as context (no auth)
  return { query: q(undefined, ...args) };
}
```

## Parameter Validation with Zod

### No Parameters
```typescript
z.tuple([])
```

### Single Parameter
```typescript
z.tuple([z.string()])              // One string
z.tuple([z.number()])              // One number
```

### Multiple Parameters
```typescript
z.tuple([z.string(), z.string()])  // Two strings
```

### Object Parameter
```typescript
z.tuple([
  z.object({
    senderID: z.string(),
    mediumID: z.string(),
  }),
])
```

## Common Query Patterns for Gilbert

### 1. All User Data (No Parameters)

```typescript
export const myVineyards = syncedQueryWithContext(
  'myVineyards',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) {
      return builder.vineyard.where('id', '___never_match___');
    }
    return builder.vineyard.where('user_id', userID);
  }
);
```

### 2. Single Record Lookup

```typescript
export const myVintageById = syncedQueryWithContext(
  'myVintageById',
  z.tuple([z.string()]),
  (userID: string | undefined, vintageId: string) => {
    if (!userID) {
      return builder.vintage.where('id', '___never_match___');
    }
    return builder.vintage
      .where('user_id', userID)
      .where('id', vintageId)
      .one();
  }
);
```

### 3. Filtered by Foreign Key

```typescript
export const myWinesByVintage = syncedQueryWithContext(
  'myWinesByVintage',
  z.tuple([z.string()]),
  (userID: string | undefined, vintageId: string) => {
    if (!userID) {
      return builder.wine.where('id', '___never_match___');
    }
    return builder.wine
      .where('user_id', userID)
      .where('vintage_id', vintageId);
  }
);
```

### 4. Polymorphic Entity Lookup

```typescript
export const myMeasurementsByEntity = syncedQueryWithContext(
  'myMeasurementsByEntity',
  z.tuple([z.string(), z.string()]),
  (userID: string | undefined, entityType: string, entityId: string) => {
    if (!userID) {
      return builder.measurement.where('id', '___never_match___');
    }
    return builder.measurement
      .where('user_id', userID)
      .where('entity_type', entityType)
      .where('entity_id', entityId);
  }
);
```

### 5. Global Reference Data (No User Filter)

```typescript
export const measurementRanges = syncedQuery(
  'measurementRanges',
  z.tuple([]),
  () => builder.measurement_range
);
```

### 6. With Stage Filter

```typescript
const ACTIVE_STAGES = [
  'crush',
  'primary_fermentation',
  'secondary_fermentation',
  'racking',
  'oaking',
  'aging',
];

export const activeWines = syncedQueryWithContext(
  'activeWines',
  z.tuple([]),
  (userID: string | undefined) => {
    if (userID !== ADMIN_USER_ID) {
      return builder.wine.where('id', '___never_match___');
    }
    return builder.wine.where('current_stage', 'IN', ACTIVE_STAGES);
  }
);
```

## Environment Configuration

### zero-cache Server
```bash
ZERO_GET_QUERIES_URL="http://localhost:3002/get-queries"
ZERO_AUTH_JWKS_URL="https://your-clerk-domain/.well-known/jwks.json"
```

### Client (Rsbuild/Vite)
```bash
PUBLIC_ZERO_SERVER="http://localhost:4848"
```

### Queries Service
```bash
PORT=3002
```

## Troubleshooting

### "Query returns 0 results when data exists"
**Cause**: Client passing `null` instead of userID
**Fix**: Pass `user?.id` or `user?.id ?? ''` to the query

```typescript
// ❌ WRONG
useQuery(queries.myWines(null));

// ✅ CORRECT
useQuery(queries.myWines(user?.id));
```

### "Unknown query: myQuery"
**Cause**: Query not registered in validatedQueries
**Fix**: Add query to the validatedQueries object in queries-service

```typescript
const validatedQueries = {
  [myQuery.queryName]: withValidation(myQuery),  // Add this
};
```

### "Query returns data from all users"
**Cause**: Using `syncedQuery` instead of `syncedQueryWithContext`
**Fix**: Change to `syncedQueryWithContext` with user filtering

### TypeScript: "Property 'myQuery' does not exist"
**Cause**: Using old `zero.myQuery()` pattern
**Fix**: Import query directly: `import { queries } from './queries'`

### Queries work locally but not in production
**Cause**: `ZERO_GET_QUERIES_URL` not set or misconfigured
**Fix**: Verify environment variable points to deployed queries service

## Migration Checklist

When migrating from legacy Permissions API:

- [ ] Create shared queries file with `syncedQueryWithContext` definitions
- [ ] Create queries service with Hono/Express
- [ ] Implement `/get-queries` endpoint with JWT extraction
- [ ] Register all queries with `withValidation`
- [ ] Update components to import queries directly
- [ ] Remove `useZero()` calls for query execution
- [ ] Configure `ZERO_GET_QUERIES_URL` in zero-cache
- [ ] Test with multiple users to verify isolation
- [ ] Remove `ANYONE_CAN` permissions from schema (optional)

## Best Practices

1. **Always handle undefined userID** - Use empty string fallback or ___never_match___
2. **Share query definitions** - Same file imported by client and server
3. **Export as object** - `export const queries = { ... }` for easy iteration
4. **Use Zod for validation** - Catches parameter errors early
5. **Server extracts userID from JWT** - Never trust client-provided auth
6. **Client passes userID for optimistic UI** - Makes UI feel instant
7. **Test multi-user isolation** - Verify one user can't see another's data

## References

- ztunes (React): https://github.com/rocicorp/ztunes
- hello-zero-solid (Solid): https://github.com/rocicorp/hello-zero-solid
- Zero Documentation: https://zerosync.dev
- Zod Validation: https://zod.dev
