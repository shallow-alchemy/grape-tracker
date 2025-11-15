# Gilbert - Database Schema

> **Purpose**: This document defines all database tables, their relationships, and column descriptions. Reference this when working with data models.

## Schema Overview

Gilbert uses PostgreSQL with logical replication for real-time sync. All tables are synced via Rocicorp Zero (main branch) or ElectricSQL (electricsql branch).

**Schema Namespace**:
- Zero: Tables in `zero_0` schema (auto-managed)
- Electric: Tables in `public` schema (manual migrations)

## Core Vineyard Tables

### `vine` Table

Tracks individual grape vines in the vineyard.

```sql
CREATE TABLE IF NOT EXISTS vine (
  id TEXT PRIMARY KEY,
  block TEXT NOT NULL,
  "sequenceNumber" INTEGER NOT NULL,
  variety TEXT NOT NULL,
  "plantingDate" BIGINT NOT NULL,
  health TEXT NOT NULL,
  notes TEXT NOT NULL,
  "qrGenerated" BIGINT NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vine_block ON vine(block);
CREATE INDEX IF NOT EXISTS idx_vine_variety ON vine(variety);
```

**Columns**:
- `id`: UUID, primary key
- `block`: Foreign key to block table (which row/block the vine is in)
- `sequenceNumber`: Position of vine within the block (1, 2, 3, ...)
- `variety`: Grape variety (e.g., "Cabernet Franc", "Riesling")
- `plantingDate`: Unix timestamp (milliseconds) when vine was planted
- `health`: Health status ("healthy", "diseased", "dead", etc.)
- `notes`: Free-form text notes about the vine
- `qrGenerated`: Unix timestamp when QR code was generated (0 if not yet generated)
- `createdAt`: Unix timestamp when record was created
- `updatedAt`: Unix timestamp when record was last modified

**Indexes**:
- `idx_vine_block`: Fast lookups of all vines in a block
- `idx_vine_variety`: Fast lookups by grape variety

**Relationships**:
- Many vines → One block (foreign key: `vine.block → block.id`)

### `block` Table

Tracks vineyard blocks (rows or sections of vines).

**Schema** (inferred from codebase):
```typescript
// TypeScript schema from schema.ts
{
  id: string;           // UUID primary key
  name: string;         // Block name (e.g., "Block A", "North Row")
  variety: string;      // Primary grape variety in this block
  vineCount: number;    // Number of vines in this block
  createdAt: number;    // Unix timestamp (ms)
  updatedAt: number;    // Unix timestamp (ms)
}
```

**Relationships**:
- One block → Many vines (`block.id ← vine.block`)

## Winery Tables

### `vintage` Table

Tracks harvest records per growing season. One vintage per variety per year.

```sql
CREATE TABLE IF NOT EXISTS vintage (
  id TEXT PRIMARY KEY,
  vintage_year INTEGER NOT NULL,
  variety TEXT NOT NULL,
  block_ids TEXT[] NOT NULL DEFAULT '{}',
  current_stage TEXT NOT NULL,
  bud_break_date BIGINT,
  flowering_date BIGINT,
  fruiting_date BIGINT,
  veraison_date BIGINT,
  pre_harvest_date BIGINT,
  harvest_date BIGINT,
  harvest_weight_lbs NUMERIC(10, 2),
  harvest_volume_gallons NUMERIC(10, 2),
  brix_at_harvest NUMERIC(4, 1),
  notes TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE(vintage_year, variety)
);
```

**Columns**:
- `id`: UUID, primary key
- `vintage_year`: Harvest year (e.g., 2025)
- `variety`: Grape variety (e.g., "Cabernet Franc")
- `block_ids`: Array of block IDs where grapes were harvested
- `current_stage`: Current growth stage (see stages below)
- `bud_break_date` through `harvest_date`: Unix timestamps for each stage
- `harvest_weight_lbs`: Total harvest weight in pounds
- `harvest_volume_gallons`: Estimated juice volume in gallons
- `brix_at_harvest`: Sugar content at harvest (degrees Brix)
- `notes`: Free-form notes
- `created_at`, `updated_at`: Unix timestamps (ms)

**Stages** (in chronological order):
1. `bud_break` - Buds start to swell and open
2. `flowering` - Vines flower
3. `fruiting` - Fruit set begins
4. `veraison` - Grapes start to ripen and change color
5. `pre_harvest` - Final ripening before harvest
6. `harvest` - Grapes are harvested

**Unique Constraint**: One vintage per variety per year

**Relationships**:
- One vintage → Many wines (`vintage.id ← wine.vintage_id`)
- One vintage → Many blocks (array: `vintage.block_ids`)

### `wine` Table

Tracks finished wine products made from vintages. Multiple wines can be created from one vintage.

```sql
CREATE TABLE IF NOT EXISTS wine (
  id TEXT PRIMARY KEY,
  vintage_id TEXT NOT NULL REFERENCES vintage(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  wine_type TEXT NOT NULL,
  current_stage TEXT NOT NULL,
  volume_gallons NUMERIC(10, 2),
  current_volume_gallons NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wine_vintage ON wine(vintage_id);
CREATE INDEX IF NOT EXISTS idx_wine_type ON wine(wine_type);
```

**Columns**:
- `id`: UUID, primary key
- `vintage_id`: Foreign key to vintage table (which harvest this wine is from)
- `name`: Wine name (REQUIRED, e.g., "Lodi", "Azure")
- `wine_type`: Type of wine (see types below)
- `current_stage`: Current winemaking stage (see stages below)
- `volume_gallons`: Initial volume after crush
- `current_volume_gallons`: Current volume (decreases during racking, aging)
- `status`: Wine status ("active", "bottled", "consumed", "spoiled")
- `notes`: Free-form notes
- `created_at`, `updated_at`: Unix timestamps (ms)

**Wine Types**:
- `red` - Red wine
- `white` - White wine
- `rosé` - Rosé wine
- `dessert` - Dessert wine (port-style, etc.)
- `sparkling` - Sparkling wine

**Stages** (in chronological order):
1. `crush` - Grapes crushed, juice extracted
2. `primary_fermentation` - Alcoholic fermentation
3. `secondary_fermentation` - Malolactic fermentation (MLF)
4. `racking` - Transfer wine off sediment
5. `oaking` - Aging in oak barrels (optional)
6. `aging` - Bulk aging
7. `bottling` - Wine bottled

**Indexes**:
- `idx_wine_vintage`: Fast lookups of all wines from a vintage
- `idx_wine_type`: Fast lookups by wine type

**Relationships**:
- Many wines → One vintage (foreign key: `wine.vintage_id → vintage.id`)

**Design Note**: Wine names are required because multiple wines can come from one vintage (e.g., "Lodi" red + "Azure" rosé from 2025 Cab Franc harvest). Names provide UI labels.

### `stage_history` Table

Tracks stage transitions for vintages and wines. Records when each stage started/completed.

```sql
CREATE TABLE IF NOT EXISTS stage_history (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  started_at BIGINT NOT NULL,
  completed_at BIGINT,
  skipped BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stage_history_entity ON stage_history(entity_type, entity_id);
```

**Columns**:
- `id`: UUID, primary key
- `entity_type`: "vintage" or "wine"
- `entity_id`: ID of vintage or wine
- `stage`: Stage name (e.g., "primary_fermentation")
- `started_at`: Unix timestamp when stage started
- `completed_at`: Unix timestamp when stage completed (null if in progress)
- `skipped`: True if stage was skipped (e.g., no oaking for this wine)
- `notes`: Notes about this stage
- `created_at`: Unix timestamp (ms)

**Indexes**:
- `idx_stage_history_entity`: Fast lookups of all stages for a vintage or wine

**Relationships**:
- Many stage_history → One vintage/wine (polymorphic: `entity_type` + `entity_id`)

### `task_template` Table

Configurable tasks per stage and wine type. Defines default tasks.

```sql
CREATE TABLE IF NOT EXISTS task_template (
  id TEXT PRIMARY KEY,
  stage TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  wine_type TEXT,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT,
  default_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  vineyard_id TEXT NOT NULL DEFAULT 'default',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_template_stage ON task_template(stage, entity_type, wine_type);
```

**Columns**:
- `id`: UUID, primary key
- `stage`: Stage this task applies to (e.g., "primary_fermentation")
- `entity_type`: "vintage" or "wine"
- `wine_type`: Wine type (red/white/rosé/dessert/sparkling) or null for vintage tasks
- `name`: Task name (e.g., "Punch cap", "Monitor temperature")
- `description`: Detailed description
- `frequency`: How often (e.g., "2x daily", "daily", "weekly")
- `default_enabled`: True if enabled by default when user transitions to stage
- `sort_order`: Display order in UI
- `vineyard_id`: Which vineyard this template belongs to ("default" for global)
- `created_at`, `updated_at`: Unix timestamps (ms)

**Indexes**:
- `idx_task_template_stage`: Fast lookups of tasks for a stage/entity/wine type

**Design Note**: Task templates are wine-type specific because red ≠ white ≠ rosé processes. For example, "Punch cap 2x daily" only applies to red wine primary fermentation.

**Seed Data**: ~40 default task templates provided for all stages and wine types.

### `task` Table

Actual task instances created from templates or ad-hoc.

```sql
CREATE TABLE IF NOT EXISTS task (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  task_template_id TEXT REFERENCES task_template(id),
  name TEXT NOT NULL,
  description TEXT,
  due_date BIGINT,
  completed_at BIGINT,
  completed_by TEXT,
  notes TEXT,
  skipped BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_entity ON task(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_task_due_date ON task(due_date);
```

**Columns**:
- `id`: UUID, primary key
- `entity_type`: "vintage" or "wine"
- `entity_id`: ID of vintage or wine
- `stage`: Stage this task is for
- `task_template_id`: Foreign key to template (null for ad-hoc tasks)
- `name`: Task name
- `description`: Detailed description
- `due_date`: Unix timestamp when task is due (null if no deadline)
- `completed_at`: Unix timestamp when completed (null if not done)
- `completed_by`: User ID who completed it
- `notes`: Notes about completion
- `skipped`: True if task was skipped
- `created_at`, `updated_at`: Unix timestamps (ms)

**Indexes**:
- `idx_task_entity`: Fast lookups of all tasks for a vintage or wine
- `idx_task_due_date`: Fast lookups of upcoming tasks

**Relationships**:
- Many tasks → One task_template (foreign key: `task.task_template_id → task_template.id`)
- Many tasks → One vintage/wine (polymorphic: `entity_type` + `entity_id`)

**Design Note**: Tasks are NOT auto-created. User confirms which tasks to create when transitioning to new stage.

### `measurement` Table

Chemistry and tasting measurements for vintages and wines.

```sql
CREATE TABLE IF NOT EXISTS measurement (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  date BIGINT NOT NULL,
  stage TEXT NOT NULL,
  ph NUMERIC(3, 2),
  ta NUMERIC(5, 2),
  brix NUMERIC(4, 1),
  temperature NUMERIC(4, 1),
  tasting_notes TEXT,
  notes TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_measurement_entity ON measurement(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_measurement_date ON measurement(date);
```

**Columns**:
- `id`: UUID, primary key
- `entity_type`: "vintage" or "wine"
- `entity_id`: ID of vintage or wine
- `date`: Unix timestamp when measurement was taken
- `stage`: Stage when measured (e.g., "primary_fermentation")
- `ph`: pH level (0.00 to 14.00)
- `ta`: Titratable acidity (g/L, e.g., 6.2)
- `brix`: Sugar content (degrees Brix, e.g., 24.5)
- `temperature`: Temperature in Fahrenheit (e.g., 68.0)
- `tasting_notes`: Tasting observations
- `notes`: Additional notes
- `created_at`, `updated_at`: Unix timestamps (ms)

**Indexes**:
- `idx_measurement_entity`: Fast lookups of all measurements for a vintage or wine
- `idx_measurement_date`: Fast lookups by date range

**Relationships**:
- Many measurements → One vintage/wine (polymorphic: `entity_type` + `entity_id`)

**Validation**: Measurements validated against `measurement_range` table (see below)

### `measurement_range` Table

Reference data for measurement validation and warnings.

```sql
CREATE TABLE IF NOT EXISTS measurement_range (
  id TEXT PRIMARY KEY,
  wine_type TEXT NOT NULL,
  measurement_type TEXT NOT NULL,
  min_value NUMERIC(10, 2),
  max_value NUMERIC(10, 2),
  ideal_min NUMERIC(10, 2),
  ideal_max NUMERIC(10, 2),
  low_warning TEXT,
  high_warning TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE(wine_type, measurement_type)
);
```

**Columns**:
- `id`: UUID, primary key
- `wine_type`: Wine type (red/white/rosé/dessert/sparkling)
- `measurement_type`: Type of measurement (ph/ta/brix)
- `min_value`: Absolute minimum (below this = error)
- `max_value`: Absolute maximum (above this = error)
- `ideal_min`: Ideal minimum (below this = warning)
- `ideal_max`: Ideal maximum (above this = warning)
- `low_warning`: Warning message if below ideal
- `high_warning`: Warning message if above ideal
- `created_at`, `updated_at`: Unix timestamps (ms)

**Unique Constraint**: One range per wine type per measurement type

**Seed Data**: Provided for all 5 wine types (red, white, rosé, dessert, sparkling) and 3 measurement types (pH, TA, Brix)

**Example**:
```sql
-- Red wine pH range
wine_type: 'red'
measurement_type: 'ph'
min_value: 3.0
max_value: 4.0
ideal_min: 3.3
ideal_max: 3.6
low_warning: 'pH too low - may taste sour'
high_warning: 'pH too high - risk of spoilage'
```

## Data Types

### Timestamps
All timestamps are **Unix milliseconds** (BIGINT):
```javascript
// Creating timestamp
const now = Date.now(); // 1699564800000

// Converting to Date
const date = new Date(timestamp);

// PostgreSQL BIGINT → JavaScript
// IMPORTANT: PostgreSQL returns BigInt, must convert
const timestamp = Number(row.created_at);
```

### Numeric Precision
- `NUMERIC(10, 2)`: 10 total digits, 2 decimal places (e.g., 12345.67)
- `NUMERIC(5, 2)`: 5 total digits, 2 decimal places (e.g., 123.45)
- `NUMERIC(4, 1)`: 4 total digits, 1 decimal place (e.g., 123.4)
- `NUMERIC(3, 2)`: 3 total digits, 2 decimal places (e.g., 3.45)

### Text Arrays
PostgreSQL arrays stored as TEXT[]:
```sql
-- PostgreSQL
block_ids TEXT[] NOT NULL DEFAULT '{}'

-- JavaScript
const blockIds = ['uuid-1', 'uuid-2', 'uuid-3'];
```

## Foreign Key Relationships

```
block (1) ───< vine (many)
  block.id ← vine.block

vintage (1) ───< wine (many)
  vintage.id ← wine.vintage_id

vintage (1) ───< stage_history (many)
  vintage.id ← stage_history.entity_id (where entity_type = 'vintage')

wine (1) ───< stage_history (many)
  wine.id ← stage_history.entity_id (where entity_type = 'wine')

task_template (1) ───< task (many)
  task_template.id ← task.task_template_id (nullable)

vintage (1) ───< task (many)
  vintage.id ← task.entity_id (where entity_type = 'vintage')

wine (1) ───< task (many)
  wine.id ← task.entity_id (where entity_type = 'wine')

vintage (1) ───< measurement (many)
  vintage.id ← measurement.entity_id (where entity_type = 'vintage')

wine (1) ───< measurement (many)
  wine.id ← measurement.entity_id (where entity_type = 'wine')

measurement_range (1) ───< measurement (many, for validation)
  (wine_type, measurement_type) used for validation
```

## Indexes Strategy

**Foreign Keys**: All foreign key columns indexed for fast joins
- `idx_vine_block`: vine.block
- `idx_wine_vintage`: wine.vintage_id
- `idx_stage_history_entity`: stage_history(entity_type, entity_id)
- `idx_task_entity`: task(entity_type, entity_id)
- `idx_measurement_entity`: measurement(entity_type, entity_id)

**Filtering**: Common filter columns indexed
- `idx_vine_variety`: vine.variety
- `idx_wine_type`: wine.wine_type
- `idx_task_due_date`: task.due_date
- `idx_measurement_date`: measurement.date

**Composite Indexes**: Multi-column indexes for complex queries
- `idx_task_template_stage`: task_template(stage, entity_type, wine_type)

## Migration Files

**Main Branch (Zero)**: Schema defined in `schema.ts`, auto-managed by Zero

**electricsql Branch**: SQL migrations in `migrations/` directory
- `001_create_vine_table.sql` - Initial vine table
- `20251113000001_create_winery_tables.sql` - All winery tables

## Schema Compilation (Zero)

Zero requires `schema.js` but codebase uses TypeScript:

```bash
# Compile schema.ts to schema.js
npx tsc schema.ts --module esnext --target es2020 --moduleResolution bundler

# Must compile before starting zero-cache
# Must recompile after any schema changes
```

## Related Documentation

- **System Architecture**: See `system-architecture.md` for how services use this schema
- **Local Development**: See `../03-setup/local-development.md` for database setup
- **Engineering Principles**: See `../engineering-principles.md` for data access patterns
