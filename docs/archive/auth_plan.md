# Synced Queries Migration Plan

## Overview

This document outlines the plan to migrate all user-owned data queries to Zero synced queries with user-based permissions. The goal is multi-tenant isolation: one user's vineyard data should not be visible to another user.

## Current State

### Tables with `user_id` (need user-scoped queries)
| Table | Foreign Keys | Notes |
|-------|--------------|-------|
| vineyard | - | Root entity |
| block | - | Vineyard land structure |
| vine | block (via `block` column) | Individual vines |
| vintage | vineyard_id | Harvest/grape batch |
| wine | vintage_id, vineyard_id | Finished product |
| stage_history | entity_id (polymorphic) | Audit trail for wine/vintage |
| task_template | vineyard_id | Configurable task definitions |
| task | task_template_id, entity_id (polymorphic) | Task instances |
| measurement | entity_id (polymorphic) | Chemistry/tasting data |

### Tables without `user_id` (global reference data)
| Table | Notes |
|-------|-------|
| measurement_range | Reference ranges for wine chemistry validation |

### Proof of Concept Complete
- `activeWines` synced query implemented and working
- Pattern established following ztunes example

## Migration Strategy: Trunk-First

We start from the root entity (vineyard) and work outward. This approach:
- Provides immediate security benefit at the root level
- Uses consistent pattern across all tables
- Allows incremental testing after each migration

## Migration Pattern

Each migration follows these steps:

### 1. Add query to `src/shared/queries.ts`
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

### 2. Add matching query to `queries-service/src/queries.ts`
Same definition as above (must match exactly).

### 3. Register in `queries-service/src/index.ts`
```typescript
const validatedQueries = {
  [activeWines.queryName]: withValidation(activeWines),
  [myVineyards.queryName]: withValidation(myVineyards),  // Add new query
};
```

### 4. Update component usage
```typescript
// Before (placeholder)
const [vineyards] = useQuery(myVineyards() as any) as any;

// After (synced query)
const [vineyards] = useQuery(myVineyards(user?.id));
```

## Migration Phases

### Phase 1: Core Data (Root → Children)
| Priority | Query | Table | Args | Notes |
|----------|-------|-------|------|-------|
| 1.1 | `myVineyards` | vineyard | none | Root entity - do first |
| 1.2 | `myVintages` | vintage | none | List all user's vintages |
| 1.3 | `myVintageById` | vintage | vintageId | Single vintage lookup |
| 1.4 | `myWines` | wine | none | List all user's wines |
| 1.5 | `myWineById` | wine | wineId | Single wine lookup |
| 1.6 | `myWinesByVintage` | wine | vintageId | Wines for a vintage |

### Phase 2: Vineyard Land Management
| Priority | Query | Table | Args | Notes |
|----------|-------|-------|------|-------|
| 2.1 | `myBlocks` | block | none | List all blocks |
| 2.2 | `myVines` | vine | none | List all vines |
| 2.3 | `myVinesByBlock` | vine | blockId | Vines in a block |
| 2.4 | `myVineById` | vine | vineId | Single vine lookup |

### Phase 3: Activity Tracking
| Priority | Query | Table | Args | Notes |
|----------|-------|-------|------|-------|
| 3.1 | `myTasks` | task | none | List all tasks |
| 3.2 | `myTasksByEntity` | task | entityType, entityId | Tasks for wine/vintage |
| 3.3 | `myTaskTemplates` | task_template | none | List templates |
| 3.4 | `myTaskTemplatesByStage` | task_template | stage | Templates for stage |

### Phase 4: Measurements & History
| Priority | Query | Table | Args | Notes |
|----------|-------|-------|------|-------|
| 4.1 | `myMeasurements` | measurement | none | List all measurements |
| 4.2 | `myMeasurementsByEntity` | measurement | entityType, entityId | For wine/vintage |
| 4.3 | `myStageHistory` | stage_history | none | All stage transitions |
| 4.4 | `myStageHistoryByEntity` | stage_history | entityType, entityId | For wine/vintage |

### Phase 5: Reference Data (No user filtering)
| Priority | Query | Table | Args | Notes |
|----------|-------|-------|------|-------|
| 5.1 | `measurementRanges` | measurement_range | none | Global reference data |

## Query Signatures

### Queries with no args (list all user's data)
```typescript
syncedQueryWithContext(
  'queryName',
  z.tuple([]),
  (userID: string | undefined) => builder.table.where('user_id', userID ?? '')
)
```

### Queries with ID lookup
```typescript
syncedQueryWithContext(
  'queryName',
  z.tuple([z.string()]),  // entityId
  (userID: string | undefined, entityId: string) =>
    builder.table
      .where('user_id', userID ?? '')
      .where('id', entityId)
      .one()
)
```

### Queries with entity type + ID (polymorphic)
```typescript
syncedQueryWithContext(
  'queryName',
  z.tuple([z.string(), z.string()]),  // entityType, entityId
  (userID: string | undefined, entityType: string, entityId: string) =>
    builder.table
      .where('user_id', userID ?? '')
      .where('entity_type', entityType)
      .where('entity_id', entityId)
)
```

## Files to Modify

For each migration:
1. `src/shared/queries.ts` - Add syncedQueryWithContext definition
2. `queries-service/src/queries.ts` - Add matching definition
3. `queries-service/src/index.ts` - Register in validatedQueries
4. Component files - Update useQuery calls to pass user?.id

## Testing Each Migration

After each query migration:
1. Sign in as admin user - verify data loads correctly
2. Sign in as different user - verify no data from admin visible
3. Check queries-service logs for proper userID extraction
4. Verify zero-cache logs show query being resolved

## Rollback Strategy

If a migration causes issues:
1. Revert the component to use placeholder query
2. Remove query from validatedQueries in queries-service
3. Keep query definitions (they don't hurt if not registered)

## Progress Tracking

- [x] Proof of concept: `activeWines` (admin-only query)
- [ ] Phase 1.1: `myVineyards`
- [ ] Phase 1.2: `myVintages`
- [ ] Phase 1.3: `myVintageById`
- [ ] Phase 1.4: `myWines`
- [ ] Phase 1.5: `myWineById`
- [ ] Phase 1.6: `myWinesByVintage`
- [ ] Phase 2.1: `myBlocks`
- [ ] Phase 2.2: `myVines`
- [ ] Phase 2.3: `myVinesByBlock`
- [ ] Phase 2.4: `myVineById`
- [ ] Phase 3.1: `myTasks`
- [ ] Phase 3.2: `myTasksByEntity`
- [ ] Phase 3.3: `myTaskTemplates`
- [ ] Phase 3.4: `myTaskTemplatesByStage`
- [ ] Phase 4.1: `myMeasurements`
- [ ] Phase 4.2: `myMeasurementsByEntity`
- [ ] Phase 4.3: `myStageHistory`
- [ ] Phase 4.4: `myStageHistoryByEntity`
- [ ] Phase 5.1: `measurementRanges`

## Notes

- The `activeWines` query was a proof-of-concept with admin-only access
- Once all migrations complete, remove the placeholder `src/queries.ts` file
- Consider adding relationship queries later (e.g., vineyard with related vintages)
