# Task System Architecture

**Status:** Planned
**Last Updated:** Nov 29, 2025

## Overview

A unified task management system that supports three categories of tasks: winery stage tasks, vineyard seasonal tasks, and general recurring/one-time tasks. Users can customize task templates without affecting system defaults.

---

## Task Categories

### 1. Winery Stage Tasks
**Trigger:** Wine or Vintage transitions to a new stage

**Current State:** Partially implemented
- Stage tracking exists for wines (crush → primary fermentation → secondary → racking → oaking → aging → bottling)
- Stage tracking exists for vintages (bud break → flowering → fruiting → veraison → pre-harvest → harvest)
- Default task templates seeded in database
- Tasks auto-created on stage transition via `useStageTransition` hook

**Needed:**
- UI to view/edit/delete/add task templates per stage
- User customization layer (don't modify defaults)

### 2. Vineyard Seasonal Tasks
**Trigger:** Block or Vineyard enters a seasonal stage

**Current State:** Not implemented

**Needed:**
- Seasonal stage tracking for vineyard/blocks
- Stage definitions: Dormant → Bud Break → Flowering → Fruit Set → Veraison → Ripening → Harvest → Post-Harvest
- Allow blocks to be in different stages simultaneously
- Task templates attached to seasonal stages
- Tasks auto-created on stage transition

### 3. General Tasks
**Trigger:** Manual creation or recurring schedule

**Current State:** Not implemented

**Needed:**
- Tasks not tied to any stage
- One-time or recurring (daily, weekly, bi-weekly, monthly, custom)
- Examples: "Check water tubing integrity" every 2 weeks
- Foundation for inventory management integration

---

## Dependencies

### Prerequisite: Vineyard Seasonal Stage Tracking

Before vineyard seasonal tasks can work, we need to track which seasonal stage each block is in.

**Design Questions:**
1. **Granularity:** Per-vineyard or per-block?
   - Recommendation: Per-block, with vineyard showing aggregate/summary
   - Blocks in same vineyard can be in different stages (microclimate, variety differences)

2. **Transition Method:**
   - Manual: User marks block as entering new stage
   - Automatic: Based on date ranges or GDD accumulation
   - Hybrid: System suggests, user confirms
   - Recommendation: Start with manual, add automatic suggestions later

3. **Schema Addition:**
```sql
ALTER TABLE block ADD COLUMN current_stage VARCHAR(50);
ALTER TABLE block ADD COLUMN stage_entered_at BIGINT;

CREATE TABLE block_stage_history (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL,
  stage VARCHAR(50) NOT NULL,
  entered_at BIGINT NOT NULL,
  exited_at BIGINT,
  notes TEXT,
  created_at BIGINT NOT NULL
);
```

---

## User Customization Architecture

**Principle:** User modifications never alter system defaults. Defaults remain available for reset.

### Option A: Copy-on-Write
When user first edits a default template, create a user-specific copy:
- `task_template` with `vineyard_id = 'default'` = system defaults
- `task_template` with `vineyard_id = user's vineyard` = user customizations
- User sees their version; can "reset to default" by deleting their copy

**Pros:** Simple to implement, follows existing schema
**Cons:** Duplicates data

### Option B: Override Table
Separate table for user overrides:
```sql
CREATE TABLE task_template_override (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,  -- references default template
  vineyard_id TEXT NOT NULL,
  enabled BOOLEAN,            -- NULL = use default
  name TEXT,                  -- NULL = use default
  description TEXT,           -- NULL = use default
  frequency TEXT,             -- NULL = use default
  deleted BOOLEAN DEFAULT FALSE,
  created_at BIGINT,
  updated_at BIGINT
);
```

**Pros:** Cleaner, tracks what user actually changed
**Cons:** More complex queries, merge logic needed

### Recommendation: Option A (Copy-on-Write)
Simpler implementation, aligns with existing `vineyard_id` pattern. When user customizes:
1. Copy default template to user's vineyard
2. Apply user's changes to the copy
3. User's templates take precedence over defaults
4. "Reset to defaults" = delete user's copies

---

## UI Design

### Entry Point
**All Tasks View** → [Customize Task Settings] button in header

### Task Settings Page

```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Tasks              TASK SETTINGS              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Winery Tasks] [Vineyard Tasks] [General Tasks]  ← tabs │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ WINERY TASKS                                            │
│                                                         │
│ ▼ CRUSH                                                 │
│   ┌─────────────────────────────────────────────────┐   │
│   │ ☑ Crush and destem grapes          [Edit] [X]  │   │
│   │ ☑ Add SO2                          [Edit] [X]  │   │
│   │ ☑ Take initial measurements        [Edit] [X]  │   │
│   │                        [+ Add Task to Crush]    │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│ ▼ PRIMARY FERMENTATION                                  │
│   ┌─────────────────────────────────────────────────┐   │
│   │ Red Wine Tasks:                                 │   │
│   │ ☑ Inoculate with yeast             [Edit] [X]  │   │
│   │ ☑ Punch down cap (2x daily)        [Edit] [X]  │   │
│   │ ☑ Monitor temperature (2x daily)   [Edit] [X]  │   │
│   │                                                 │   │
│   │ White Wine Tasks:                               │   │
│   │ ☑ Inoculate with yeast             [Edit] [X]  │   │
│   │ ☑ Monitor temperature (daily)      [Edit] [X]  │   │
│   │                     [+ Add Task to Primary]     │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│ ... more stages ...                                     │
│                                                         │
│ [Reset All to Defaults]                                 │
└─────────────────────────────────────────────────────────┘
```

### Edit Task Modal
```
┌─────────────────────────────────────────────────────────┐
│                    EDIT TASK TEMPLATE                   │
├─────────────────────────────────────────────────────────┤
│ NAME                                                    │
│ [Punch down cap                                    ]    │
│                                                         │
│ DESCRIPTION                                             │
│ [Push cap down into must to extract color and     ]    │
│ [tannins                                          ]    │
│                                                         │
│ FREQUENCY                                               │
│ [Twice Daily ▼]  every [1] [days ▼]                    │
│                                                         │
│ WINE TYPE (optional)                                    │
│ [Red ▼]  ← Only show for this wine type                │
│                                                         │
│ ENABLED BY DEFAULT                                      │
│ [✓] Create this task automatically on stage entry      │
│                                                         │
│              [CANCEL]  [SAVE CHANGES]                   │
└─────────────────────────────────────────────────────────┘
```

### General Tasks Tab
```
┌─────────────────────────────────────────────────────────┐
│ GENERAL TASKS                                           │
│                                                         │
│ These tasks are not tied to any stage. They can be      │
│ one-time or recurring on a schedule.                    │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☑ Check water tubing integrity    Every 2 weeks    │ │
│ │ ☑ Inspect trellis posts           Every month      │ │
│ │ ☑ Clean fermentation equipment    One-time         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [+ Add General Task]                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Winery Task Customization
- [ ] Add "Customize Task Settings" button to All Tasks view
- [ ] Create Task Settings page with Winery Tasks tab
- [ ] Display existing templates grouped by stage
- [ ] Enable/disable toggle per template
- [ ] Edit task modal (name, description, frequency)
- [ ] Delete task (marks as deleted, doesn't remove default)
- [ ] Add new task to stage
- [ ] Copy-on-write when user modifies a default
- [ ] "Reset to defaults" functionality

### Phase 2: General Tasks
- [ ] Add General Tasks tab to Task Settings
- [ ] Create general task (not stage-associated)
- [ ] Recurring schedule options (daily, weekly, bi-weekly, monthly, custom)
- [ ] One-time task option
- [ ] Background job to create recurring task instances
- [ ] Display general tasks in All Tasks view

### Phase 3: Vineyard Seasonal Stage Tracking
- [ ] Add `current_stage` and `stage_entered_at` to block table
- [ ] Create `block_stage_history` table
- [ ] UI to view/change block stage
- [ ] Stage indicator on block cards
- [ ] Vineyard-level stage summary (aggregate of blocks)

### Phase 4: Vineyard Seasonal Tasks
- [ ] Add Vineyard Tasks tab to Task Settings
- [ ] Seasonal task templates (dormant, bud break, etc.)
- [ ] Auto-create tasks when block enters stage
- [ ] Block-level task assignment

### Phase 5: Inventory Integration (Future)
- [ ] Link tasks to inventory items
- [ ] "Use X bottles of SO2" depletes inventory
- [ ] Low stock warnings from task context

---

## Database Schema Changes

### New Tables

```sql
-- General recurring tasks (not stage-associated)
CREATE TABLE general_task_template (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  vineyard_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL,  -- 'once', 'daily', 'weekly', 'biweekly', 'monthly', 'custom'
  frequency_count INTEGER,
  frequency_unit TEXT,      -- 'days', 'weeks', 'months'
  next_due_at BIGINT,       -- For recurring: when to create next instance
  enabled BOOLEAN DEFAULT TRUE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Block stage history
CREATE TABLE block_stage_history (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  entered_at BIGINT NOT NULL,
  exited_at BIGINT,
  notes TEXT,
  created_at BIGINT NOT NULL
);
```

### Schema Modifications

```sql
-- Add stage tracking to blocks
ALTER TABLE block ADD COLUMN current_stage TEXT;
ALTER TABLE block ADD COLUMN stage_entered_at BIGINT;
```

---

## Open Questions

1. **Recurring task generation:** Background job (cron) or on-demand when viewing tasks?
2. **Vineyard stage transitions:** Should transitioning a block auto-transition its vines?
3. **Multi-vineyard:** How do task templates work when user has multiple vineyards?
4. **Notifications:** Should task due dates trigger push notifications?

---

## Related Documents

- [Winery Production Spec](./winery-production.md)
- [Database Schema](../../02-architecture/database-schema.md)
- [Roadmap](../roadmap.md)
