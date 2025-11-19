# Authentication & Multi-Tenant Authorization Planning

**Date:** November 18, 2025
**Status:** Research Complete - Decision Pending
**Context:** Implementing user data isolation for Gilbert grape tracking app

---

## Problem Statement

Gilbert currently allows any logged-in user to see all data. When multiple users log in, they see each other's vineyards, vintages, wines, etc. We need proper multi-tenant data isolation so users only see their own data.

---

## Two Approaches Researched

### Approach 1: Zero Permissions API (Currently Implemented)

**Status:** ⚠️ Being deprecated by Zero "really soon"

**How it works:**
- Add `user_id` column to all user-owned tables
- Define permission rules in `schema.ts` using `definePermissions()`
- Rules automatically filter queries based on `authData.sub` from JWT
- Client queries are unrestricted; permissions run in background

**Example:**
```typescript
const allowIfOwner = (
  authData: { sub: string },
  { cmp }: ExpressionBuilder<Schema, any>
) => cmp('user_id' as any, authData.sub);

return {
  vineyard: {
    row: {
      select: [allowIfOwner],
      insert: [allowIfOwner],
      update: { preMutation: [allowIfOwner], postMutation: [allowIfOwner] },
      delete: [allowIfOwner],
    },
  },
  // ... repeat for all tables
};
```

### Approach 2: Zero Synced Queries (Recommended by Zero)

**Status:** ✅ Current recommended approach, but API "in transition"

**How it works:**
- Named query functions defined on both client and server
- Server implements queries with built-in permission filtering
- Client invokes queries by name with arguments
- Zero handles synchronization and incremental updates

**Example:**
```typescript
// Shared query definition
const myVintages = syncedQueryWithContext(
  'myVintages',
  z.tuple([]),
  (ctx: QueryContext) =>
    builder.vintage.where('user_id', ctx.userID)
);

// Client usage
const [vintages] = useQuery(zero.myVintages());
```

---

## Detailed Comparison

### Permissions API

**Advantages:**
- ✅ Simple for basic row-level filtering
- ✅ Declarative - clear separation of concerns
- ✅ Automatic application - no need to remember to filter
- ✅ Already implemented for Gilbert

**Disadvantages:**
- ❌ **Being deprecated** - Zero explicitly discourages for new projects
- ❌ Severe JavaScript restrictions - only property access allowed
- ❌ No conditionals, loops, async/await in permission functions
- ❌ Row-based only (column permissions not supported)
- ❌ Limited flexibility for complex scenarios
- ❌ Silent failures on select (rows just disappear)
- ❌ Requires `zero-deploy-permissions` in production CI

**Zero's Official Statement:**
> "This API is going to be deprecated really soon in favor of Synced Queries and Custom Mutators. Use Synced Queries and Custom Mutators instead of the Permissions API for new projects."

### Synced Queries

**Advantages:**
- ✅ **Future-proof** - Zero's recommended approach
- ✅ Full JavaScript/TypeScript capabilities
- ✅ Server-side enforcement of access controls
- ✅ Flexible authentication (JWTs, opaque tokens, cookies)
- ✅ Better error handling and debugging
- ✅ Easy to implement complex permissions (roles, teams)
- ✅ Natural integration with preview deployments

**Disadvantages:**
- ❌ More complex setup - requires backend endpoint
- ❌ Dual implementation (client + server)
- ❌ All arguments must use Zod validation
- ❌ API still "in transition" per documentation
- ❌ Steeper learning curve

---

## Current Gilbert Implementation (Permissions API)

### What Was Implemented

1. **Schema Changes** (`schema.ts`):
   - Added `user_id: string()` to 9 tables:
     - vineyard, block, vine, vintage, wine
     - stage_history, task_template, task, measurement
   - `measurement_range` remains global (no user_id)

2. **Permission Rules** (`schema.ts`):
   ```typescript
   const allowIfOwner = (authData, { cmp }) =>
     cmp('user_id' as any, authData.sub);
   ```
   Applied to select, insert, update, delete for all user tables

3. **Database Migration** (`backend/migrations/20251118000001_add_user_id_columns.sql`):
   - Adds `user_id VARCHAR(255)` to all user-owned tables
   - Creates indexes on `user_id` for query performance

4. **React Components Updated**:
   - `AddVineModal.tsx` - vine inserts
   - `AddBlockModal.tsx` - block inserts
   - `AddVintageModal.tsx` - vintage, stage_history, measurement inserts
   - `AddWineModal.tsx` - wine, stage_history inserts
   - `AddMeasurementModal.tsx` - measurement inserts
   - `CreateTaskModal.tsx` - task inserts
   - `EditVintageModal.tsx` - measurement inserts

   All now include `user_id: user!.id` in insert operations.

5. **Schema Compilation**:
   - Compiled `schema.ts` → `schema.cjs` for Zero deployment

### What's Needed to Complete

1. Run migration on Railway PostgreSQL database
2. Deploy updated `schema.cjs` to Railway Zero service
3. Redeploy backend (if migrations auto-run)
4. Test with two different user accounts

---

## Migration to Synced Queries (If Chosen)

### Architecture Changes Needed

1. **Create Query Definitions** (`src/queries.ts`):
   ```typescript
   import { syncedQueryWithContext } from '@rocicorp/zero';
   import { z } from 'zod';

   type QueryContext = { userID: string };

   export const myVintages = syncedQueryWithContext(
     'myVintages',
     z.tuple([]),
     (ctx: QueryContext) =>
       builder.vintage.where('user_id', ctx.userID)
   );

   export const myWines = syncedQueryWithContext(
     'myWines',
     z.tuple([]),
     (ctx: QueryContext) =>
       builder.wine.where('user_id', ctx.userID)
   );

   // ... additional queries for vines, blocks, tasks, measurements, etc.
   ```

2. **Backend Endpoint** (`backend/src/routes/get-queries.rs` or similar):
   - Implement `/get-queries` endpoint
   - Use `handleGetQueriesRequest` from `@rocicorp/zero`
   - Return query definitions to Zero cache

3. **Update Schema** (`schema.ts`):
   ```typescript
   const schema = createSchema({
     tables: [...],
     enableLegacyQueries: false  // Disable old query API
   });
   ```
   - Remove all permission rules
   - Keep user_id columns (still needed for filtering)

4. **Update All Components**:
   ```typescript
   // Before (current)
   const [vintagesData] = useQuery(zero.query.vintage);

   // After (synced queries)
   const [vintagesData] = useQuery(zero.myVintages());
   ```

5. **Environment Configuration**:
   ```bash
   ZERO_GET_QUERIES_URL=https://your-backend.railway.app/get-queries
   ```

### Affected Components

All components using `useQuery()`:
- `WineryView.tsx`
- `VintageDetailsView.tsx`
- `WineDetailsView.tsx`
- `TaskListView.tsx`
- `VineyardView.tsx`
- `DashboardView.tsx`
- Plus modal components for lookups

---

## Decision Framework

### Use Permissions API (Option A) If:

- ✅ Need quick deployment of multi-tenant isolation
- ✅ Permissions remain simple (row-level user ownership only)
- ✅ Want to defer larger architectural changes
- ✅ Comfortable with eventual migration when deprecated

**Timeline:** Ready to deploy now

### Use Synced Queries (Option B) If:

- ✅ Want future-proof architecture from the start
- ✅ Anticipate complex permissions (teams, roles, sharing)
- ✅ Willing to invest extra development time upfront
- ✅ Backend endpoint implementation is straightforward

**Timeline:** ~2-3 days additional development

---

## Recommendation

**Staged Approach:**

### Phase 1: Deploy Permissions API (Now)
- ✅ Implementation complete
- ✅ Solves immediate multi-user isolation problem
- ✅ Low risk, well-tested approach
- ⚠️ Technical debt: will need migration later

### Phase 2: Plan Migration (Next Quarter)
- Monitor Zero's deprecation timeline
- Design synced query architecture
- Create migration checklist
- Implement when:
  - Zero announces specific deprecation date, OR
  - Gilbert needs complex permissions, OR
  - Natural refactor opportunity arises

### Rationale

1. **Immediate Value:** Users need isolation now; Permissions API delivers this
2. **Simple Use Case:** Gilbert only needs "users see their own data" - well-suited to Permissions API
3. **Migration Path Exists:** user_id columns transfer directly to synced queries
4. **Low Rush:** No specific deprecation date means controlled migration timeline
5. **Pragmatic:** Ship working solution, refactor when forced to or when value is clear

---

## Technical Debt Tracking

**Incurred Debt:**
- Using deprecated Zero Permissions API
- Will require migration to Synced Queries before Zero removes support

**Mitigation:**
- All user_id columns in place (required for both approaches)
- Permission logic isolated in schema.ts (single file to change)
- Components already set user_id (won't need updates for migration)

**Migration Trigger Points:**
1. Zero announces deprecation date
2. Gilbert needs team/role-based permissions
3. Major architectural refactor for other reasons
4. Permission API limitations block feature development

---

## Additional Resources

- [Zero Synced Queries Documentation](https://zero.rocicorp.dev/docs/synced-queries)
- [Zero Permissions Documentation](https://zero.rocicorp.dev/docs/permissions) ⚠️ Deprecation notice
- [Zero Authentication Documentation](https://zero.rocicorp.dev/docs/auth)
- [Marmelab Zero Review (Feb 2025)](https://marmelab.com/blog/2025/02/28/zero-sync-engine.html)

---

## Next Steps

**If Proceeding with Permissions API:**
1. Run migration: `railway run psql < backend/migrations/20251118000001_add_user_id_columns.sql`
2. Deploy schema.cjs to Railway Zero service
3. Test with two user accounts
4. Monitor Zero announcements for deprecation timeline
5. Document migration TODO in roadmap

**If Switching to Synced Queries:**
1. Create `src/queries.ts` with query definitions
2. Implement `/get-queries` endpoint in backend
3. Update schema.ts (remove permissions, disable legacy queries)
4. Refactor all useQuery calls in components
5. Set `ZERO_GET_QUERIES_URL` environment variable
6. Deploy and test

---

## Status

- [x] Research completed
- [x] Documentation written
- [x] Permissions API implementation complete (ready to deploy)
- [ ] **DECISION PENDING:** Option A (Permissions API) or Option B (Synced Queries)?
- [ ] Implementation path chosen
- [ ] Multi-tenant isolation deployed to production

---

## Decision Status

**Current State:** 🟡 PAUSED - Awaiting Architecture Decision

All code for the Permissions API approach has been implemented and is ready to deploy:
- ✅ Schema with user_id columns and permission rules
- ✅ Database migration SQL written
- ✅ All React components updated to set user_id
- ✅ schema.cjs compiled and ready

**What's Needed:** Choose between:
- **Option A:** Deploy current Permissions API implementation (~30 min to production)
- **Option B:** Refactor to Synced Queries (~2-3 days development)

**When Resuming:**
1. Review this document's "Decision Framework" section
2. Choose Option A or Option B based on priorities
3. Follow "Next Steps" for chosen option
4. Update status section when decision is made

**Last Updated:** November 18, 2025
