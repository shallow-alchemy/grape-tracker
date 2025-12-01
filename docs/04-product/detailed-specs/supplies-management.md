# Supplies Management

**Status:** Planning
**Priority:** High
**Dependencies:** Task Templates system (complete)

## Overview

Supplies management allows users to track what equipment and consumables they need for each winemaking task, with predictive forecasting to give them time to order supplies before they're needed.

## Goals

1. **Reduce surprises** - Users know what they need before starting a task
2. **Enable planning** - Lead times let users order supplies in advance
3. **Customizable** - Users can edit supply lists to match their setup
4. **Future monetization** - Foundation for dropshipping supply orders

## Data Model

### supply_template

Defines a supply item attached to a task template (reusable definition).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | string | Owner (null for system defaults) |
| task_template_id | uuid | FK to task_template |
| name | string | "5-gallon bucket" |
| quantity_formula | string | "1 per 30 lbs grapes" (optional) |
| quantity_fixed | number | Fallback quantity (default: 1) |
| lead_time_days | number | Days before task to surface (default: 7) |
| notes | string | "Food-grade plastic or stainless" |
| is_archived | boolean | Soft delete |
| sort_order | number | Display order within task |
| created_at | timestamp | |
| updated_at | timestamp | |

### supply_instance

Created when a task is instantiated for a specific wine/vintage.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | string | Owner |
| supply_template_id | uuid | FK to supply_template |
| task_id | uuid | FK to task |
| entity_type | string | 'wine' or 'vintage' |
| entity_id | uuid | FK to wine or vintage |
| calculated_quantity | number | Computed from formula if possible |
| verified_at | timestamp | When user confirmed they have it |
| verified_by | string | User who verified |
| created_at | timestamp | |
| updated_at | timestamp | |

## Quantity Calculation

When a supply has a `quantity_formula`, we attempt to calculate the actual quantity needed:

### Supported Formulas

| Formula Pattern | Example | Calculation |
|----------------|---------|-------------|
| `{n} per {x} lbs grapes` | "1 per 30 lbs grapes" | `ceil(harvest_weight_lbs / 30)` |
| `{n} per {x} gallons` | "1 per 5 gallons" | `ceil(volume_gallons / 5)` |
| `{n} per batch` | "1 per batch" | Always returns n |

### Fallback Behavior

If calculation isn't possible (missing data), display the formula as-is:
- **With data:** "2 buckets (1 per 30 lbs)"
- **Without data:** "1 bucket per 30 lbs grapes"

## Lead Time & Forecasting

### How It Works

1. Each supply has a `lead_time_days` (default: 7 days)
2. Dashboard shows supplies where: `task.due_date - lead_time_days <= today`
3. Supplies are grouped by stage, then by task

### Example Timeline

```
Today: Nov 1
Task "Add yeast" due: Nov 10
Supply "Yeast" lead_time: 10 days

Nov 1: Yeast appears on dashboard (10 days before due)
Nov 10: Task is due, yeast should be ready
```

### Default Lead Times

| Supply Type | Default Lead Time |
|-------------|-------------------|
| Consumables (yeast, chemicals) | 10 days |
| Equipment (carboys, tubing) | 14 days |
| Specialty items | 21 days |

Users can customize per supply.

## UI/UX

### Dashboard Card

```
┌─────────────────────────────────────────┐
│ SUPPLIES NEEDED                    →    │
│ Upcoming in next 14 days                │
├─────────────────────────────────────────┤
│ PRIMARY FERMENTATION                    │
│ Due in 8 days (Nov 15)                  │
│ ├─ Pitch Yeast                          │
│ │  ○ Yeast (Red Star Premier Rouge)     │
│ │  ○ Yeast nutrient (2 packets)         │
│ └─ Punch Down                           │
│    ○ Punch-down tool                    │
│                                         │
│ RACKING                                 │
│ Due in 21 days (Nov 28)                 │
│ └─ First Rack                           │
│    ○ Carboy (2 needed)                  │
│    ○ Racking cane                       │
│    ○ Silicone tubing (6 ft)             │
│                                         │
│ View all supplies →                     │
└─────────────────────────────────────────┘
```

### Supplies Page (`/supplies`)

Full supplies management:
- Filter by: All | Upcoming | Verified | Needed
- Group by: Stage | Task | Wine/Vintage
- Bulk verify supplies
- Edit lead times
- Link to purchase (future: dropship integration)

### Settings: Supply Templates

In Settings > Stages & Tasks, each task template shows its supplies:

```
┌─────────────────────────────────────────┐
│ TASK: Pitch Yeast                    ⚙  │
│ Primary Fermentation · Required         │
├─────────────────────────────────────────┤
│ Supplies:                               │
│ ├─ Yeast                    10 days ✎  │
│ ├─ Yeast nutrient           10 days ✎  │
│ └─ + Add supply                         │
└─────────────────────────────────────────┘
```

## Default Supplies by Stage

### Crush

| Task | Supplies | Lead Time |
|------|----------|-----------|
| Crush & Destem | Crusher/destemmer (or buckets), Food-grade buckets (1 per 30 lbs), Garbage bags | 14 days |
| Add SO2 | Potassium metabisulfite, Measuring spoons, Long stir spoon | 10 days |
| Initial Measurements | pH meter or test strips, TA kit, Hydrometer, Graduated cylinder | 14 days |

### Primary Fermentation

| Task | Supplies | Lead Time |
|------|----------|-----------|
| Pitch Yeast | Wine yeast, Yeast nutrient, Yeast rehydration vessel | 10 days |
| Punch Down | Punch-down tool or long spoon, Thermometer | 7 days |
| Monitor Fermentation | Hydrometer, Thermometer | 7 days |

### Press

| Task | Supplies | Lead Time |
|------|----------|-----------|
| Press Wine | Wine press (or mesh bags), Collection vessel, Sanitizer | 14 days |

### Malolactic Fermentation

| Task | Supplies | Lead Time |
|------|----------|-----------|
| Add ML Culture | Malolactic culture, Chromatography kit (to test completion) | 10 days |

### Aging

| Task | Supplies | Lead Time |
|------|----------|-----------|
| Transfer to Aging Vessel | Carboys/barrels, Airlocks, Bungs, Siphon/racking cane | 14 days |
| Top Up | Extra wine (same variety) or marbles | 7 days |

### Racking

| Task | Supplies | Lead Time |
|------|----------|-----------|
| Rack Off Lees | Racking cane, Silicone tubing, Clean carboy, Sanitizer | 7 days |

### Fining & Filtering

| Task | Supplies | Lead Time |
|------|----------|-----------|
| Fine Wine | Bentonite/gelatin/other fining agent | 10 days |
| Filter Wine | Wine filter, Filter pads | 14 days |

### Bottling

| Task | Supplies | Lead Time |
|------|----------|-----------|
| Bottle Wine | Wine bottles (5 per gallon), Corks, Corker, Sanitizer, Bottle brush | 14 days |
| Add Sulfite | Potassium metabisulfite | 10 days |

## Implementation Phases

### Phase 1: Data Model & Basic UI
- [ ] Add `supply_template` table
- [ ] Add `supply_instance` table
- [ ] Create migrations
- [ ] Add Zero queries
- [ ] Settings UI: Add supplies to task templates

### Phase 2: Dashboard & Supplies Page
- [ ] Dashboard card showing upcoming supplies
- [ ] Dedicated `/supplies` page
- [ ] Verify/unverify supplies
- [ ] Filter and grouping options

### Phase 3: Smart Calculation
- [ ] Parse quantity formulas
- [ ] Calculate based on wine/vintage data
- [ ] Display calculated vs formula fallback

### Phase 4: Default Supplies
- [ ] Research comprehensive supply lists
- [ ] Add default supplies to default task templates
- [ ] Migration to populate existing users

### Phase 5: Future - Monetization
- [ ] Product catalog integration
- [ ] "Order this" links
- [ ] Dropship partner integration
- [ ] Affiliate/commission tracking

## Technical Notes

### Zero Sync Queries

```typescript
// Get supplies for upcoming tasks (with lead time consideration)
const upcomingSupplies = myUpcomingSupplies(userId, daysAhead);

// Get supply templates for a task template
const taskSupplyTemplates = mySupplyTemplatesByTask(userId, taskTemplateId);

// Get supply instances for a specific wine/vintage
const entitySupplies = mySuppliesByEntity(userId, entityType, entityId);
```

### Creating Supply Instances

When a task is created (stage transition with task generation):
1. Look up supply templates for the task template
2. Create supply instances for each
3. Attempt quantity calculation
4. Set `verified_at = null`

## Open Questions

1. **Shared supplies across tasks** - If two tasks need "Sanitizer", show once or twice?
   - *Recommendation:* Show once per stage, deduplicated

2. **Recurring supplies** - How to handle "Sanitizer" appearing every stage?
   - *Recommendation:* Let users archive from template if they don't need reminders

3. **Equipment vs Consumables** - Different UX for one-time purchases?
   - *Recommendation:* Future enhancement, start simple

---

*Last updated: 2024-11-30*
