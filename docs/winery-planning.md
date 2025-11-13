# Winery Feature Planning

## Overview

The winery section tracks wine production from pre-harvest through bottling. Multiple vintages can be active simultaneously (e.g., 2024 being harvested while 2023 is aging).

## Key Concepts

- **Vintage**: A wine from a specific year (e.g., "2024 Cab Franc Rosé")
- **Multiple wines per year**: A single variety can produce multiple wines (red, rosé, blends)
- **Overlapping timelines**: Older vintages may still be aging while new ones are harvested
- **Stage flexibility**: Stages can be skipped based on wine type (not all wines are oaked, some skip secondary fermentation)
- **Blends**: Treated as new wines with their own vintage entry

## Database Schema

### Vintage Table
```sql
CREATE TABLE vintage (
  id TEXT PRIMARY KEY,
  vineyard_id TEXT NOT NULL REFERENCES vineyard(id),
  name TEXT NOT NULL,              -- e.g., "Cab Franc Rosé", "Cab Franc Red"
  vintage_year INTEGER NOT NULL,   -- 2024
  variety TEXT NOT NULL,            -- PINOT_NOIR, CAB_FRANC, etc.
  wine_type TEXT NOT NULL,          -- red, white, rosé, dessert, sparkling, blend
  block_ids TEXT[],                 -- array of block IDs (can be multiple)
  volume_gallons REAL,              -- starting volume
  current_volume_gallons REAL,      -- current volume (decreases with racking losses)
  current_stage TEXT,               -- pre_harvest | harvest | crush | primary_fermentation |
                                    -- secondary_fermentation | racking | oaking | aging | bottling
  status TEXT NOT NULL,             -- active | aging | bottled | sold
  harvest_date BIGINT,              -- timestamp
  last_tasting_notes TEXT,          -- most recent notes for quick dashboard access
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
```

### Stage Events Table
```sql
CREATE TABLE stage_event (
  id TEXT PRIMARY KEY,
  vintage_id TEXT NOT NULL REFERENCES vintage(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,              -- stage name
  started_date BIGINT NOT NULL,     -- when this stage began
  completed_date BIGINT,            -- null if in progress
  skipped BOOLEAN DEFAULT FALSE,    -- true if intentionally skipped
  notes TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
```

### Measurements Table
```sql
CREATE TABLE measurement (
  id TEXT PRIMARY KEY,
  vintage_id TEXT NOT NULL REFERENCES vintage(id) ON DELETE CASCADE,
  date BIGINT NOT NULL,
  stage TEXT NOT NULL,              -- which stage this was taken during
  ph REAL,                          -- pH level
  ta REAL,                          -- titratable acid (g/L)
  brix REAL,                        -- sugar content (%)
  temperature REAL,                 -- optional, degrees F
  tasting_notes TEXT,               -- sensory notes
  notes TEXT,                       -- general observations
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
```

### Measurement Ranges (Reference Data)
```sql
CREATE TABLE measurement_range (
  id TEXT PRIMARY KEY,
  wine_type TEXT NOT NULL,          -- red, white, rosé, dessert, sparkling
  measurement_type TEXT NOT NULL,   -- ph, ta, brix
  min_value REAL,
  max_value REAL,
  ideal_min REAL,
  ideal_max REAL,
  low_warning TEXT,                 -- corrective action for too low
  high_warning TEXT,                -- corrective action for too high
  created_at BIGINT NOT NULL
);
```

**Sample Ranges:**
```
pH Ranges:
  Red:    3.3-3.6 (ideal 3.4-3.5)
  White:  3.0-3.4 (ideal 3.1-3.3)
  Rosé:   3.1-3.4 (ideal 3.2-3.3)

  Too high (>3.6): "Consider tartaric acid addition"
  Too low (<3.2): "Risk of bacterial growth, consider MLF"

TA Ranges (g/L):
  Red:    6-8
  White:  7-9
  Rosé:   6.5-8.5

  Too high: "Consider deacidification or cold stabilization"
  Too low: "Consider acid addition (tartaric or citric)"

Brix (pre-fermentation):
  Red:        22-26
  White:      20-24
  Rosé:       19-22
  Dessert:    24-30+

  Too high: "Consider water addition or earlier harvest next year"
  Too low: "Consider chaptalization or longer hang time next year"
```

## Production Stages

1. **Pre-Harvest** - Field measurements before picking
2. **Harvest** - Picking grapes
3. **Crush** - Crushing/destemming
4. **Primary Fermentation** - Initial fermentation
5. **Secondary Fermentation** - Malolactic fermentation (optional)
6. **Racking** - Transfer off sediment
7. **Oaking** - Oak barrel aging (optional)
8. **Aging** - Continued aging, possibly with re-racking
9. **Bottling** - Final bottling

**Stage Flexibility:**
- Stages can be skipped (e.g., no oaking for certain wines)
- Not all wines need secondary fermentation
- Stages should be tracked but not enforced sequentially

## UI Structure

### Dashboard "Current Wines" Panel
Shows active vintages at a glance:
```
┌─────────────────────────────────────────┐
│ CURRENT WINES                           │
├─────────────────────────────────────────┤
│ 2024 CAB FRANC RED                      │
│ Stage: Primary Fermentation (Day 8)     │
│ pH 3.4 | TA 6.2 | Brix 12              │
│ Notes: "Dark cherry, good tannins..."   │
│ Next: Check temp, measure in 2 days     │
├─────────────────────────────────────────┤
│ 2024 CAB FRANC ROSÉ                     │
│ Stage: Secondary Fermentation (Day 14)  │
│ pH 3.3 | TA 7.1                         │
│ Notes: "Bright strawberry, clean..."    │
│ Next: Rack this week                    │
└─────────────────────────────────────────┘
```

### Winery Tab

**Active Wines Section:**
- Cards showing wines currently being worked on
- Current stage with days in stage
- Latest measurements
- Quick "Add Measurement" button
- Click card to expand detail view

**Aging Wines Section:**
- Wines in barrel/tank (less frequent attention needed)
- Show days aging, last tasting date
- Less prominent than active wines

**Bottled Wines Section:**
- Archive/reference view
- Final volume, bottle date, final notes
- Can be filtered by year, variety, type

### Wine Detail View
```
┌─────────────────────────────────────────┐
│ 2024 CAB FRANC RED                      │
│ 12.5 gallons | Blocks A, B             │
│ Red Wine | Cab Franc                    │
├─────────────────────────────────────────┤
│ STAGES:                                 │
│ ✓ Pre-Harvest (Aug 15)                 │
│ ✓ Harvest (Sep 20)                     │
│ ✓ Crush (Sep 20)                       │
│ → Primary Fermentation (Day 8)         │
│ ○ Secondary Fermentation               │
│ ○ Racking                              │
│ ⊗ Oaking (skipped)                     │
│ ○ Aging                                │
│ ○ Bottling                             │
│                                         │
│ [Mark Current Stage Complete]          │
│ [Skip Current Stage]                   │
├─────────────────────────────────────────┤
│ MEASUREMENT HISTORY:                    │
│ Date       Stage    pH   TA   Brix     │
│ Nov 12     Primary  3.4  6.2  12      │
│ Nov 10     Primary  3.5  6.5  14      │
│ Nov 8      Primary  3.6  6.8  16      │
│                                         │
│ [+ ADD MEASUREMENT]                    │
├─────────────────────────────────────────┤
│ TASTING NOTES:                          │
│ Nov 12: Dark cherry, good tannins...   │
│ Nov 10: More fruit forward, softening..│
│                                         │
│ [+ ADD TASTING NOTE]                   │
└─────────────────────────────────────────┘
```

### Measurement Entry Form
```
┌─────────────────────────────────────────┐
│ ADD MEASUREMENT                         │
├─────────────────────────────────────────┤
│ Date: [Nov 12, 2024]                   │
│ Stage: [Primary Fermentation ▼]       │
│                                         │
│ pH:          [3.4]  ⚠ Slightly high    │
│ TA (g/L):    [6.2]  ✓ Good             │
│ Brix (%):    [12]   ✓ Good             │
│ Temp (°F):   [68]   (optional)         │
│                                         │
│ Tasting Notes:                          │
│ [Dark cherry, good tannins,            │
│  nice structure developing...]          │
│                                         │
│ General Notes:                          │
│ [Temperature stable, fermentation      │
│  progressing well...]                   │
│                                         │
│ [CANCEL]  [SAVE MEASUREMENT]           │
└─────────────────────────────────────────┘
```

**Inline Warnings:**
- Real-time validation against measurement_range table
- Show ⚠ icon with suggested corrective action
- Color-code: green (ideal), yellow (acceptable), red (concerning)

## User Goals

**Dashboard Priority:**
At a glance, show:
1. Current stage for all active wines
2. Days in current stage
3. Latest measurements (pH, TA, Brix if relevant)
4. Most recent tasting notes
5. Suggested next action/timeline

## Implementation Phases

### Phase 1: Foundation
1. Create database migrations (vintage, stage_event, measurement, measurement_range tables)
2. Seed measurement_range with common ranges
3. Create Vintage creation form
4. Basic Winery tab with vintage list

### Phase 2: Stage Tracking
1. Stage event creation/completion
2. Stage skip functionality
3. Stage timeline visualization
4. Days-in-stage calculation

### Phase 3: Measurement Tracking
1. Measurement entry form with validation
2. Measurement history table view
3. Inline warnings for out-of-range values
4. Suggested corrective actions
5. Graphing measurements over time (optional enhancement)

### Phase 4: Dashboard Integration
1. Current Wines panel on dashboard
2. Show active vintages
3. Latest measurements and notes
4. Next action suggestions

### Phase 5: Polish
1. Tasting notes chronological view
2. Volume tracking (racking losses)
3. Export vintage report
4. Photo attachments for stages

## Notes

- Blends are treated as new vintage entries (can reference source vintages in notes)
- Volume decreases through racking losses - track `current_volume_gallons` separately
- Multiple vintages can be in different stages simultaneously
- Not all measurements are relevant at all stages (Brix primarily pre-fermentation)
- Real-world workflow is non-linear - support flexibility
