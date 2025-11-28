# Gilbert - Database Schema

**Last Updated**: November 28, 2025

> **Purpose**: This document defines all database tables, their relationships, and column descriptions. Reference this when working with data models.

## Schema Overview

Gilbert uses PostgreSQL with logical replication for real-time sync via Rocicorp Zero.

**Schema Definition**: See `schema.ts` in project root for the authoritative TypeScript schema definition.

**Data Isolation**: All tables include a `user_id` column for multi-tenant data isolation. Server-side mutators in `queries-service/src/mutators.ts` enforce that users can only access their own data.

---

## Core Tables

### `user` Table

Tracks user profiles and vineyard membership.

```typescript
{
  id: string,                    // Clerk ID (primary key)
  email: string,
  display_name: string,
  vineyard_id: string,           // optional - linked vineyard
  role: string,                  // 'owner' | 'member'
  onboarding_completed: boolean,
  created_at: number,            // Unix timestamp (ms)
  updated_at: number,
}
```

### `vineyard` Table

Tracks vineyard properties.

```typescript
{
  id: string,                    // UUID primary key
  user_id: string,               // Owner's user ID
  name: string,
  location: string,
  varieties: json,               // Array of grape variety names
  created_at: number,
  updated_at: number,
}
```

### `block` Table

Tracks vineyard blocks (rows or sections of vines).

```typescript
{
  id: string,                    // UUID primary key
  user_id: string,
  name: string,                  // Block name (e.g., "Block A", "North Row")
  location: string,
  size_acres: number,
  soil_type: string,
  notes: string,
  created_at: number,
  updated_at: number,
}
```

### `vine` Table

Tracks individual grape vines.

```typescript
{
  id: string,                    // UUID primary key
  user_id: string,
  block: string,                 // Foreign key to block.id
  sequence_number: number,       // Position within block (1, 2, 3, ...)
  variety: string,               // Grape variety (e.g., "CABERNET FRANC")
  planting_date: number,         // Unix timestamp (ms)
  health: string,                // "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DEAD"
  notes: string,
  qr_generated: number,          // Timestamp when QR was generated (0 if not yet)
  created_at: number,
  updated_at: number,
}
```

---

## Winery Tables

### `vintage` Table

Tracks harvest records per growing season.

```typescript
{
  id: string,                    // UUID primary key
  user_id: string,
  vineyard_id: string,
  vintage_year: number,          // e.g., 2025
  variety: string,
  block_ids: json,               // Array of block IDs included in harvest
  current_stage: string,         // Growing stage (see Stage Constants)
  harvest_date: number,
  harvest_weight_lbs: number,    // optional
  harvest_volume_gallons: number, // optional
  grape_source: string,          // 'vineyard' | 'purchased'
  supplier_name: string,         // optional - for purchased grapes
  notes: string,
  created_at: number,
  updated_at: number,
}
```

**Stage Constants** (vintage):
- `bud_break`, `flowering`, `fruiting`, `veraison`, `pre_harvest`, `harvest`

### `wine` Table

Tracks wine production from vintages.

```typescript
{
  id: string,                    // UUID primary key
  user_id: string,
  vintage_id: string,            // Foreign key to vintage.id
  vineyard_id: string,
  name: string,                  // Wine name
  wine_type: string,             // 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified'
  volume_gallons: number,        // Initial volume
  current_volume_gallons: number, // Current volume (after losses)
  current_stage: string,         // Production stage (see Stage Constants)
  status: string,                // 'active' | 'aging' | 'bottled' (derived from stage)
  last_tasting_notes: string,
  blend_components: json,        // Array of {wine_id, percentage} for blends
  created_at: number,
  updated_at: number,
}
```

**Stage Constants** (wine):
- `crush`, `primary_fermentation`, `secondary_fermentation`, `racking`, `oaking`, `aging`, `bottling`

### `stage_history` Table

Tracks stage transitions for vintages and wines (polymorphic).

```typescript
{
  id: string,                    // UUID primary key
  user_id: string,
  entity_type: string,           // 'vintage' | 'wine'
  entity_id: string,             // ID of the vintage or wine
  stage: string,
  started_at: number,
  completed_at: number,          // optional - null if current stage
  skipped: boolean,
  notes: string,
  created_at: number,
  updated_at: number,
}
```

---

## Task Tables

### `task_template` Table

Defines reusable task templates for winemaking stages.

```typescript
{
  id: string,                    // UUID primary key
  user_id: string,
  vineyard_id: string,
  stage: string,                 // Which stage this task applies to
  entity_type: string,           // 'vintage' | 'wine'
  wine_type: string,             // Which wine types this applies to
  name: string,
  description: string,
  frequency: string,             // 'once' | 'daily' | 'weekly' | 'custom'
  frequency_count: number,       // For custom frequency
  frequency_unit: string,        // 'days' | 'weeks' | 'months'
  default_enabled: boolean,
  sort_order: number,
  created_at: number,
  updated_at: number,
}
```

### `task` Table

Tracks individual task instances.

```typescript
{
  id: string,                    // UUID primary key
  user_id: string,
  task_template_id: string,      // Optional - if created from template
  entity_type: string,           // 'vintage' | 'wine'
  entity_id: string,
  stage: string,
  name: string,
  description: string,
  due_date: number,
  completed_at: number,          // Timestamp when completed (0 if not)
  completed_by: string,          // User ID who completed
  notes: string,
  skipped: boolean,
  created_at: number,
  updated_at: number,
}
```

---

## Measurement Tables

### `measurement` Table

Tracks chemical and physical measurements (polymorphic).

```typescript
{
  id: string,                    // UUID primary key
  user_id: string,
  entity_type: string,           // 'vintage' | 'wine'
  entity_id: string,
  date: number,                  // When measurement was taken
  stage: string,                 // Stage at time of measurement
  ph: number,                    // optional
  ta: number,                    // optional - Total Acidity (g/L)
  brix: number,                  // optional - Sugar content
  temperature: number,           // optional - Fahrenheit
  tasting_notes: string,
  notes: string,
  created_at: number,
  updated_at: number,
}
```

### `measurement_range` Table

Defines ideal measurement ranges by wine type (read-only reference data).

```typescript
{
  id: string,                    // UUID primary key
  wine_type: string,
  measurement_type: string,      // 'ph' | 'ta' | 'brix' | 'temperature'
  min_value: number,
  max_value: number,
  ideal_min: number,
  ideal_max: number,
  low_warning: string,
  high_warning: string,
  created_at: number,
}
```

---

## Entity Relationships

```
user (1) ─────────┬────────── (n) vineyard
                  │
                  └────────── (n) vine
                  └────────── (n) block
                  └────────── (n) vintage
                  └────────── (n) wine
                  └────────── (n) task
                  └────────── (n) measurement
                  └────────── (n) stage_history

vineyard (1) ────── (n) vintage ────── (n) wine
                                        │
                                        └──── (n) measurement
                                        └──── (n) task
                                        └──── (n) stage_history

block (1) ─────────── (n) vine
```

---

## Migrations

**Location**: `backend/migrations/`

Migrations follow the naming convention: `YYYYMMDDHHMMSS_description.sql`

To add a new table:
1. Create migration file in `backend/migrations/`
2. Update `schema.ts` with TypeScript definition
3. Run migration on database
4. Compile schema: `npx tsc schema.ts --module commonjs --target es2020`

---

## Notes

- All timestamps are Unix milliseconds (number type)
- All tables use UUID strings for primary keys
- `user_id` enables per-user data isolation
- Polymorphic tables (`stage_history`, `task`, `measurement`) use `entity_type` + `entity_id` pattern
- JSON columns (`varieties`, `block_ids`, `blend_components`) store arrays as JSON
