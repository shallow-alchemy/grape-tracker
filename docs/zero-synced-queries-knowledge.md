# Zero Synced Queries Knowledge Base

## Overview

Zero's synced queries replace the deprecated Permissions API by defining queries on the server that return AST JSON to the client. This enables:
- User-specific data isolation at the query level
- Type-safe query definitions with Zod validation
- Centralized query logic shared between client and server
- Server-side authentication context for secure data filtering

## Core Concepts

### Two Types of Synced Queries

1. **`syncedQuery`** - Global queries without user context
   - Used for public/shared data (task templates, measurement ranges, etc.)
   - No authentication required
   - All users see the same data

2. **`syncedQueryWithContext`** - User-specific queries
   - Requires authentication context
   - First parameter is `QueryContext` containing `userID`
   - Filters data based on the authenticated user
   - Enforces user data isolation

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  Client Components                                          │
│  ├─ import { myQuery } from '../queries'                   │
│  └─ const [data] = useQuery(myQuery())                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Shared Query Definitions (/src/queries.ts)                │
│  ├─ export const myQuery = syncedQueryWithContext(...)     │
│  └─ Imported by both client and server                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Queries Service (Express/Hono Server)                      │
│  ├─ import * as queries from '../queries'                  │
│  ├─ POST /get-queries endpoint                             │
│  └─ Validates auth, injects context, returns AST JSON      │
└─────────────────────────────────────────────────────────────┘
```

## Query Definitions

### Basic Structure

```typescript
import { syncedQuery, syncedQueryWithContext } from '@rocicorp/zero';
import { z } from 'zod';
import { builder } from './schema';

// Define the context type
export type QueryContext = {
  userID: string;
};

// User-specific query (no parameters)
export const myVintages = syncedQueryWithContext(
  'myVintages',                                    // Query name
  z.tuple([]),                                     // Parameter validation (empty tuple = no params)
  (ctx: QueryContext) =>                           // Query function with context
    builder.vintage.where('user_id', ctx.userID)   // Filter by user_id
);

// User-specific query (with parameters)
export const myTasksByEntity = syncedQueryWithContext(
  'myTasksByEntity',
  z.tuple([z.string(), z.string()]),               // Validates two string parameters
  (ctx: QueryContext, entityType: string, entityId: string) =>
    builder.task
      .where('user_id', ctx.userID)                // Filter by user_id
      .where('entity_type', entityType)            // Filter by entity_type param
      .where('entity_id', entityId)                // Filter by entity_id param
);

// Global query (no user context)
export const taskTemplates = syncedQuery(
  'taskTemplates',
  z.tuple([]),
  () => builder.task_template                      // No user filtering
);
```

### Real-World Examples from Rocicorp Repos

#### From zbugs (apps/zbugs/shared/queries.ts)

```typescript
// Simple queries - all entities
export const allLabels = syncedQuery(
  'allLabels',
  z.tuple([]),
  () => builder.labels
);

export const allUsers = syncedQuery(
  'allUsers',
  z.tuple([]),
  () => builder.users
);

// Query with single parameter
export const user = syncedQuery(
  'user',
  z.tuple([z.string()]),
  (id: string) => builder.users.where('id', id)
);

// Query with context and parameters
export const labels = syncedQueryWithContext(
  'labels',
  z.tuple([z.string()]),
  (ctx: QueryContext, projectName: string) =>
    builder.labels.where('project', projectName)
);

// Complex query with multiple related entities
export const issuePreloadV2 = syncedQueryWithContext(
  'issuePreloadV2',
  z.tuple([z.string(), z.string()]),
  (ctx: QueryContext, userID: string, projectName: string) =>
    builder.issues
      .where('project', projectName)
      .related('labels', q => q.related('label'))
      .related('viewState', q => q.where('userID', ctx.userID))
      .related('creator')
      .related('assignees', q => q.related('user'))
      .related('emojis', q => q.related('creator'))
      .related('comments', q =>
        q.related('creator').related('emojis', e => e.related('creator')).limit(10)
      )
);

// User preferences with key lookup
export const userPref = syncedQueryWithContext(
  'userPref',
  z.tuple([z.string()]),
  (ctx: QueryContext, key: string) =>
    builder.userPrefs
      .where('userID', ctx.userID)
      .where('key', key)
);
```

#### From zslack (shared/src/queries.ts)

```typescript
// Global query with limit
export const allChannels = syncedQuery(
  'allChannels',
  z.tuple([]),
  () => builder.channels.limit(10)
);

// User-specific with related data
export const channelWithMessages = syncedQueryWithContext(
  'channelWithMessages',
  z.tuple([z.string()]),
  (ctx: QueryContext, channelID: string) => {
    if (!ctx.userID) {
      throw new Error('User not logged in');
    }
    return builder.channels
      .where('id', channelID)
      .related('messages', q =>
        q.orderBy('createdAt', 'desc')
         .related('sender')
      );
  }
);
```

## Client Usage

### In React Components

```typescript
import { useQuery } from '@rocicorp/zero/react';
import { myVintages, myTasksByEntity, taskTemplates } from '../queries';

export const MyComponent = () => {
  // Query with no parameters
  const [vintages] = useQuery(myVintages());

  // Query with parameters
  const [tasks] = useQuery(myTasksByEntity('wine', 'wine-123'));

  // Global query
  const [templates] = useQuery(taskTemplates());

  return (
    <div>
      {vintages.map(v => <div key={v.id}>{v.variety}</div>)}
      {tasks.map(t => <div key={t.id}>{t.name}</div>)}
    </div>
  );
};
```

### In Custom Hooks

```typescript
import { useQuery } from '@rocicorp/zero/react';
import { myVines } from '../queries';

export const useVines = () => {
  const [vinesData] = useQuery(myVines());
  return vinesData as VineDataRaw[];
};

// Usage in component
const vines = useVines();
```

### Important: NO useZero() for Queries

```typescript
// ❌ WRONG - Old pattern (deprecated)
import { useZero } from '../../contexts/ZeroContext';
const zero = useZero();
const [data] = useQuery(zero.myQuery());

// ✅ CORRECT - New pattern
import { myQuery } from '../../queries';
const [data] = useQuery(myQuery());
```

## Server Implementation

### Express Server Example (Gilbert queries-service)

```typescript
import express from 'express';
import { createZero } from '@rocicorp/zero';
import { handleGetQueriesRequest } from '@rocicorp/zero/server';
import { schema } from '../schema.js';
import * as queries from '../../src/queries.js';
import type { QueryContext } from '../../src/queries.js';

const app = express();
app.use(express.json());

// Define all queries
const queryList = [
  queries.myVineyards,
  queries.myBlocks,
  queries.myVines,
  queries.myVintages,
  queries.myWines,
  queries.myTasks,
  queries.myTasksByEntity,
  queries.myMeasurements,
  queries.myMeasurementsByEntity,
  queries.myStageHistory,
  queries.myStageHistoryByEntity,
  queries.myWinesByVintage,
  queries.taskTemplates,
  queries.measurementRanges,
];

// Wrap queries with validation
const withValidation = <T extends (...args: any[]) => any>(query: T): T => {
  return ((...args: any[]) => {
    const result = query(...args);
    return result;
  }) as T;
};

const validatedQueries = Object.fromEntries(
  queryList.map(q => [q.queryName, withValidation(q)])
);

// Authenticate user from request
async function authenticateUser(req: express.Request): Promise<QueryContext> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  // Verify token with your auth provider (Clerk, Auth0, etc.)
  const userId = await verifyToken(token);

  return { userID: userId };
}

// Handle /get-queries endpoint
app.post('/get-queries', async (req, res) => {
  try {
    const authContext = await authenticateUser(req);

    const result = await handleGetQueriesRequest(
      (name, args) => {
        const query = validatedQueries[name];
        if (!query) {
          throw new Error(`Unknown query: ${name}`);
        }

        // Check if query takes context
        // @ts-expect-error - takesContext not in type definitions but exists at runtime
        if (query.takesContext) {
          return { query: query(authContext, ...args) };
        } else {
          return { query: query(...args) };
        }
      },
      schema,
      req
    );

    res.json(result);
  } catch (error) {
    console.error('Error handling get-queries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3001, () => {
  console.log('Queries service listening on port 3001');
});
```

### Hono Server Example (zslack)

```typescript
import { Hono } from 'hono';
import { handleGetQueriesRequest } from '@rocicorp/zero/server';
import { schema } from './schema';
import * as queries from '../../shared/src/queries';

const app = new Hono();

app.post("/get-queries", async (c) => {
  const authData = c.get("auth");
  const result = await handleGetQueriesRequest(
    (name, args) => ({ query: getQuery(authData, name, args) }),
    schema,
    c.req.raw
  );
  return c.json(result);
});

function getQuery(authData: AuthData, name: string, args: any[]) {
  const query = queries[name as keyof typeof queries];
  if (!query) {
    throw new Error(`Unknown query: ${name}`);
  }

  // Queries with context get authData injected
  if ('takesContext' in query && query.takesContext) {
    return query({ userID: authData.userId }, ...args);
  }
  return query(...args);
}
```

## Client Configuration

### ZeroProvider Setup

```typescript
import { ZeroProvider } from '@rocicorp/zero/react';
import { Zero } from '@rocicorp/zero';
import { schema } from './schema';

const zero = new Zero({
  server: import.meta.env.VITE_PUBLIC_SERVER,
  schema,
  userID: user.id,
  auth: () => getToken().then(token => token || ''),
  // IMPORTANT: Configure queries service endpoint
  getQueriesURL: import.meta.env.VITE_QUERIES_URL || 'http://localhost:3001/get-queries',
});

<ZeroProvider zero={zero}>
  <App />
</ZeroProvider>
```

## Parameter Validation with Zod

### No Parameters
```typescript
z.tuple([])  // Empty tuple
```

### Single Parameter
```typescript
z.tuple([z.string()])              // One string
z.tuple([z.number()])              // One number
z.tuple([z.string().uuid()])       // UUID string
```

### Multiple Parameters
```typescript
z.tuple([z.string(), z.string()])  // Two strings
z.tuple([z.string(), z.number()])  // String and number
```

### Optional Parameters
```typescript
z.tuple([z.string(), z.string().optional()])
```

### Complex Validation
```typescript
z.tuple([
  z.enum(['vintage', 'wine']),     // Enum
  z.string().uuid(),               // UUID
  z.number().min(0).max(100)       // Bounded number
])
```

## Common Query Patterns

### 1. All User Data
```typescript
export const myVintages = syncedQueryWithContext(
  'myVintages',
  z.tuple([]),
  (ctx: QueryContext) => builder.vintage.where('user_id', ctx.userID)
);
```

### 2. Filtered by Entity
```typescript
export const myTasksByEntity = syncedQueryWithContext(
  'myTasksByEntity',
  z.tuple([z.string(), z.string()]),
  (ctx: QueryContext, entityType: string, entityId: string) =>
    builder.task
      .where('user_id', ctx.userID)
      .where('entity_type', entityType)
      .where('entity_id', entityId)
);
```

### 3. With Related Data
```typescript
export const myWines = syncedQueryWithContext(
  'myWines',
  z.tuple([]),
  (ctx: QueryContext) =>
    builder.wine
      .where('user_id', ctx.userID)
      .related('vintage')
      .related('vineyard')
);
```

### 4. Global Reference Data
```typescript
export const taskTemplates = syncedQuery(
  'taskTemplates',
  z.tuple([]),
  () => builder.task_template
);
```

### 5. With Ordering and Limits
```typescript
export const recentMeasurements = syncedQueryWithContext(
  'recentMeasurements',
  z.tuple([]),
  (ctx: QueryContext) =>
    builder.measurement
      .where('user_id', ctx.userID)
      .orderBy('date', 'desc')
      .limit(10)
);
```

## Migration Checklist

When migrating from legacy Permissions API to synced queries:

- [ ] Create `/src/queries.ts` for shared query definitions
- [ ] Define `QueryContext` type with `userID`
- [ ] Convert all queries to `syncedQueryWithContext` or `syncedQuery`
- [ ] Create queries service (Express/Hono server)
- [ ] Implement `/get-queries` endpoint with authentication
- [ ] Update `schema.ts` to disable legacy queries (`definePermissions: undefined`)
- [ ] Configure `getQueriesURL` in ZeroProvider
- [ ] Update all components to import queries directly
- [ ] Remove `useZero()` calls for query execution
- [ ] Test with multiple users to verify data isolation
- [ ] Deploy queries service to production
- [ ] Update environment variables with production URLs

## Troubleshooting

### TypeScript Errors: "Property 'myQuery' does not exist on type 'Zero'"
**Cause**: Using old pattern `zero.myQuery()`
**Fix**: Import query and call directly: `useQuery(myQuery())`

### "Query returns data from all users"
**Cause**: Using `syncedQuery` instead of `syncedQueryWithContext`
**Fix**: Change to `syncedQueryWithContext` and filter by `ctx.userID`

### "Unknown query: myQuery"
**Cause**: Query not registered in server's query list
**Fix**: Add query to `queryList` array in queries service

### "User not logged in" errors
**Cause**: Authentication middleware not injecting context
**Fix**: Verify `authenticateUser()` function and auth token validation

### Queries return empty results
**Cause**: `getQueriesURL` not configured or pointing to wrong endpoint
**Fix**: Set `getQueriesURL` in Zero constructor to queries service URL

## Best Practices

1. **Always filter by user_id** in user-specific queries
2. **Use Zod validation** for all parameters
3. **Keep queries in shared location** accessible to client and server
4. **Use descriptive query names** that indicate their purpose
5. **Validate authentication** before processing queries on server
6. **Handle errors gracefully** with try-catch in endpoint handlers
7. **Use TypeScript** for type safety across client and server
8. **Test multi-user scenarios** to verify data isolation
9. **Document complex queries** with comments explaining filters
10. **Monitor query performance** and add indexes as needed

## References

- Zero Documentation: https://zerosync.dev
- Example Repos:
  - zbugs: https://github.com/rocicorp/mono/tree/main/apps/zbugs
  - zslack: https://github.com/rocicorp/zslack
  - ztunes: https://github.com/rocicorp/ztunes
- Zod Validation: https://zod.dev
