# Winery Frontend Implementation Plan

**Status**: Planning Phase (Nov 13, 2025)
**Backend**: ✅ Complete (migrations, schema, seed data)
**Next**: Frontend component implementation

---

## Component Architecture Overview

```
WineryView (Main Container)
  ├─ Header
  │    ├─ "WINERY" label
  │    ├─ "ADD VINTAGE" button
  │    ├─ "ADD WINE" button
  │    ├─ "MANAGE INVENTORY" button
  │    └─ ⚙ Settings gear icon
  │
  ├─ Vintage/Wine List
  │    ├─ Active Wines Section (status='active')
  │    ├─ Aging Wines Section (status='aging')
  │    └─ Bottled Wines Section (status='bottled')
  │
  └─ Modals (rendered conditionally)
       ├─ AddVintageModal (Component #1)
       ├─ AddWineModal (Component #2)
       ├─ StageTransitionModal (Component #3)
       ├─ TaskListModal (Component #4)
       ├─ MeasurementModal (Component #5)
       └─ InventoryManagementModal (Component #6)
```

---

## Component Breakdown

### Component #1: Vintage Creation Form (`AddVintageModal`)

**Purpose**: Create a new vintage (harvest record)

**Trigger**: "ADD VINTAGE" button in header

**Form Fields:**
```typescript
{
  vintageYear: number,        // Dropdown: current year ± 5 years
  variety: string,            // Dropdown: CAB_FRANC, PINOT_NOIR, etc. (from existing vines)
  blockIds: string[],         // Multi-select: which blocks harvested from
  harvestDate: Date,          // Date picker (default: today)
  harvestWeightLbs: number,   // Number input (optional)
  harvestVolumeGallons: number, // Number input (optional)
  brixAtHarvest: number,      // Number input (optional, 0-40 range)
  currentStage: string,       // Fixed: 'bud_break' or dropdown (bud_break → harvest)
  notes: string,              // Textarea (optional)
}
```

**Validation:**
- ✅ Vintage year required
- ✅ Variety required
- ✅ At least one block selected (or allow no blocks for off-site grapes)
- ⚠️ Check uniqueness: vineyard_id + variety + vintage_year (unique constraint in DB)
- ⚠️ If duplicate exists, show error: "2025 Cab Franc vintage already exists"

**Zero Mutation:**
```typescript
await zero.mutate.vintage.insert({
  id: crypto.randomUUID(),
  vineyardId: 'default',
  vintageYear: data.vintageYear,
  variety: data.variety.toUpperCase(),
  blockIds: data.blockIds,
  currentStage: data.currentStage || 'bud_break',
  harvestDate: data.harvestDate?.getTime() || null,
  harvestWeightLbs: data.harvestWeightLbs || null,
  harvestVolumeGallons: data.harvestVolumeGallons || null,
  brixAtHarvest: data.brixAtHarvest || null,
  notes: data.notes || '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Also create initial stage history entry
await zero.mutate.stageHistory.insert({
  id: crypto.randomUUID(),
  entityType: 'vintage',
  entityId: vintageId,
  stage: data.currentStage || 'bud_break',
  startedAt: Date.now(),
  completedAt: null,
  skipped: 0,
  notes: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

**UI/UX:**
- Modal with faded black background, green border
- "CREATE VINTAGE" primary button
- "CANCEL" secondary button
- Show success message on creation
- Close modal and refresh list

---

### Component #2: Wine Creation Form (`AddWineModal`)

**Purpose**: Create a wine from an existing vintage

**Trigger**:
- "ADD WINE" button in header
- OR "Create Wine" button in vintage detail view

**Form Fields:**
```typescript
{
  vintageId: string,          // Dropdown: available vintages (year + variety)
  name: string,               // Text input (REQUIRED) - e.g., "Lodi", "Azure"
  wineType: string,           // Dropdown: red, white, rosé, dessert, sparkling
  volumeGallons: number,      // Number input - portion of vintage used
  currentStage: string,       // Fixed: 'crush' or dropdown (crush → bottling)
  notes: string,              // Textarea (optional)
}
```

**Validation:**
- ✅ Vintage required
- ✅ Name required (cannot be empty string)
- ✅ Wine type required
- ✅ Volume > 0
- ⚠️ Volume should not exceed remaining vintage volume (soft warning, not blocker)

**Zero Mutations:**
```typescript
await zero.mutate.wine.insert({
  id: crypto.randomUUID(),
  vintageId: data.vintageId,
  vineyardId: 'default',
  name: data.name.trim().toUpperCase(), // Uppercase for consistency
  wineType: data.wineType,
  volumeGallons: data.volumeGallons,
  currentVolumeGallons: data.volumeGallons, // Initially same as starting volume
  currentStage: data.currentStage || 'crush',
  status: 'active',
  lastTastingNotes: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Create initial stage history
await zero.mutate.stageHistory.insert({
  id: crypto.randomUUID(),
  entityType: 'wine',
  entityId: wineId,
  stage: data.currentStage || 'crush',
  startedAt: Date.now(),
  completedAt: null,
  skipped: 0,
  notes: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Optionally: Query task templates and prompt user to create initial tasks
// (same pattern as StageTransitionModal)
```

**UI/UX:**
- Modal with faded black background, green border
- Name field prominently labeled as REQUIRED
- Show vintage details when selected (year, variety, remaining volume)
- "CREATE WINE" primary button
- "CANCEL" secondary button

---

### Component #3: Stage Transition UI (`StageTransitionModal`)

**Purpose**: Move a vintage or wine to the next stage, creating tasks

**Trigger**:
- "Advance Stage" button in vintage/wine detail view
- OR click current stage indicator

**Two-Step Process:**

**Step 1: Confirm Stage Change**
```
ADVANCE STAGE

Current: PRIMARY FERMENTATION
Next: SECONDARY FERMENTATION

[CANCEL] [CONTINUE →]
```

**Step 2: Select Tasks to Create**
```
CONFIGURE TASKS FOR SECONDARY FERMENTATION

Select tasks to create:

☑ Inoculate with ML bacteria (once)
   Add malolactic bacteria culture

☑ Monitor MLF progress (weekly)
   Test for malic acid conversion

☑ Check temperature (daily)
   Ensure stable temperature

☐ Add custom task...

[← BACK] [CREATE TASKS & ADVANCE]
```

**Data Flow:**
1. Query task_template table for:
   - stage = newStage
   - entity_type = 'wine'
   - wine_type = wineType
   - default_enabled = 1
2. Display checkboxes (all checked by default)
3. User deselects unwanted tasks or adds custom tasks
4. On submit:
   - Create task records for checked templates
   - Complete current stage_history entry (set completed_at)
   - Create new stage_history entry for new stage
   - Update entity current_stage field

**Zero Mutations:**
```typescript
// 1. Complete current stage
const currentStageHistory = await zero.query.stageHistory
  .where('entityType', entityType)
  .where('entityId', entityId)
  .where('completedAt', null)
  .run();

await zero.mutate.stageHistory.update({
  id: currentStageHistory[0].id,
  completedAt: Date.now(),
  updatedAt: Date.now(),
});

// 2. Create new stage history
await zero.mutate.stageHistory.insert({
  id: crypto.randomUUID(),
  entityType: entityType,
  entityId: entityId,
  stage: newStage,
  startedAt: Date.now(),
  completedAt: null,
  skipped: 0,
  notes: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// 3. Update entity current stage
await zero.mutate[entityType === 'vintage' ? 'vintage' : 'wine'].update({
  id: entityId,
  currentStage: newStage,
  updatedAt: Date.now(),
});

// 4. Create selected tasks
for (const template of selectedTemplates) {
  await zero.mutate.task.insert({
    id: crypto.randomUUID(),
    taskTemplateId: template.id,
    entityType: entityType,
    entityId: entityId,
    stage: newStage,
    name: template.name,
    description: template.description,
    dueDate: calculateDueDate(template.frequency, Date.now()),
    completedAt: null,
    completedBy: '',
    notes: '',
    skipped: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}
```

**Due Date Calculation:**
```typescript
const calculateDueDate = (frequency: string, startDate: number): number => {
  const start = new Date(startDate);

  switch (frequency) {
    case 'once':
      return startDate; // Due now
    case 'daily':
      return start.getTime() + 86400000; // +1 day
    case 'twice_daily':
      return start.getTime() + 43200000; // +12 hours
    case 'weekly':
      return start.getTime() + 604800000; // +7 days
    case 'monthly':
      return start.getTime() + 2592000000; // +30 days
    default:
      return startDate;
  }
};
```

**UI/UX:**
- Two-step modal to avoid accidental stage changes
- Show task descriptions to help user decide
- Allow "Add custom task" to create ad-hoc tasks
- Show loading state during mutations

---

### Component #4: Task List Component (`TaskListView`)

**Purpose**: Display and manage tasks for a vintage or wine

**Integration**: Can be standalone modal OR embedded in wine/vintage detail view

**Display Structure:**
```
TASKS - PRIMARY FERMENTATION

☑ Inoculate with yeast (Nov 12 - completed)
☑ Punch cap (Nov 12 - completed)
☑ Punch cap (Nov 13 - completed)
○ Punch cap (Nov 13 - due today) ⚠
○ Measure pH/TA/Brix (Nov 14 - due tomorrow)
⊗ Check temperature (skipped)

[+ ADD TASK]
```

**Task States:**
- ☑ Completed (green text, strikethrough name)
- ○ Pending (white text)
- ⚠ Overdue (orange text, warning icon)
- ⊗ Skipped (gray text, line-through)

**Data Query:**
```typescript
const tasks = await zero.query.task
  .where('entityType', entityType)
  .where('entityId', entityId)
  .orderBy('dueDate', 'asc')
  .run();

// Group by stage for better organization
const tasksByStage = tasks.reduce((acc, task) => {
  if (!acc[task.stage]) acc[task.stage] = [];
  acc[task.stage].push(task);
  return acc;
}, {});
```

**Task Actions:**
- **Complete**: Click checkbox or task name → Show completion modal with notes field
- **Skip**: Right-click or swipe → Mark as skipped with reason
- **Add Task**: Show inline form to create ad-hoc task

**Complete Task Mutation:**
```typescript
await zero.mutate.task.update({
  id: taskId,
  completedAt: Date.now(),
  completedBy: user.id, // Clerk user ID
  notes: completionNotes,
  updatedAt: Date.now(),
});
```

**Add Ad-Hoc Task:**
```typescript
await zero.mutate.task.insert({
  id: crypto.randomUUID(),
  taskTemplateId: null, // Ad-hoc (no template)
  entityType: entityType,
  entityId: entityId,
  stage: currentStage,
  name: customTaskName,
  description: customTaskDescription,
  dueDate: selectedDueDate.getTime(),
  completedAt: null,
  notes: '',
  skipped: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

**UI/UX:**
- Clean checkbox list with icons
- Show due dates with relative time ("due today", "due tomorrow", "2 days overdue")
- Collapsible sections per stage
- Highlight overdue tasks in orange

---

### Component #5: Measurement Form (`MeasurementModal`)

**Purpose**: Record chemistry and tasting measurements with real-time validation

**Trigger**:
- "Add Measurement" button in wine/vintage detail view
- OR "Measure pH/TA/Brix" task completion

**Form Fields:**
```typescript
{
  date: Date,                 // Date picker (default: today)
  stage: string,              // Auto-filled from current stage (can override)
  ph: number,                 // Number input (0-14 range, step: 0.1)
  ta: number,                 // Number input (titratable acid, 0-20 range, step: 0.1)
  brix: number,               // Number input (0-40 range, step: 0.1)
  temperature: number,        // Number input (optional, °F)
  tastingNotes: string,       // Textarea (optional)
  notes: string,              // Textarea (optional, general observations)
}
```

**Real-Time Validation:**

As user types pH/TA/Brix values, query measurement_range table and show inline feedback:

```typescript
const validateMeasurement = async (
  wineType: string,
  measurementType: string,
  value: number
) => {
  const range = await zero.query.measurementRange
    .where('wineType', wineType)
    .where('measurementType', measurementType)
    .run();

  if (!range || range.length === 0) return null;

  const r = range[0];

  if (value < r.minValue) {
    return { status: 'critical', message: r.lowWarning, color: 'red' };
  } else if (value < r.idealMin) {
    return { status: 'warning', message: r.lowWarning, color: 'orange' };
  } else if (value > r.maxValue) {
    return { status: 'critical', message: r.highWarning, color: 'red' };
  } else if (value > r.idealMax) {
    return { status: 'warning', message: r.highWarning, color: 'orange' };
  } else {
    return { status: 'good', message: 'In ideal range', color: 'green' };
  }
};
```

**UI Display:**
```
MEASUREMENT

Date: [Nov 13, 2024]
Stage: [Primary Fermentation ▼]

pH:         [3.8] ⚠ Consider tartaric acid addition to lower pH
TA (g/L):   [6.2] ✓ In ideal range
Brix (%):   [12]  ✓ In ideal range
Temp (°F):  [68]  (optional)

Tasting Notes:
[Dark cherry, good tannins, nice structure...]

General Notes:
[Temperature stable, fermentation progressing well...]

[CANCEL] [SAVE MEASUREMENT]
```

**Zero Mutation:**
```typescript
await zero.mutate.measurement.insert({
  id: crypto.randomUUID(),
  entityType: entityType,
  entityId: entityId,
  date: data.date.getTime(),
  stage: data.stage,
  ph: data.ph || null,
  ta: data.ta || null,
  brix: data.brix || null,
  temperature: data.temperature || null,
  tastingNotes: data.tastingNotes || '',
  notes: data.notes || '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Optionally: Update wine.lastTastingNotes if tasting notes provided
if (data.tastingNotes && entityType === 'wine') {
  await zero.mutate.wine.update({
    id: entityId,
    lastTastingNotes: data.tastingNotes,
    updatedAt: Date.now(),
  });
}
```

**UI/UX:**
- Color-coded validation: green (✓), orange (⚠), red (✕)
- Show warnings inline below each input
- Allow saving even with warnings (not blocking)
- Autofocus first empty field

---

### Component #6: Winery Tab / Main View (`WineryView`)

**Purpose**: Main interface for viewing and managing vintages and wines

**Layout Structure:**

```
┌─────────────────────────────────────────────┐
│ WINERY   [ADD VINTAGE] [ADD WINE] [MANAGE  │
│                        INVENTORY] ⚙         │
├─────────────────────────────────────────────┤
│                                             │
│ ACTIVE WINES (3)                            │
│ ┌─────────────────────────────────────────┐ │
│ │ 2024 LODI (CAB FRANC RED)               │ │
│ │ PRIMARY FERMENTATION (DAY 8)            │ │
│ │ pH 3.4 | TA 6.2 | 8 gal                 │ │
│ │ > Punch cap due in 4 hours              │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 2024 AZURE (CAB FRANC ROSÉ)             │ │
│ │ SECONDARY FERMENTATION (DAY 14)         │ │
│ │ pH 3.3 | TA 7.1 | 4 gal                 │ │
│ │ > Check MLF progress                    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ AGING WINES (2)                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 2023 ESTATE RED (PINOT NOIR)            │ │
│ │ OAKING (6 MONTHS)                       │ │
│ │ Last tasted: 2 weeks ago                │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ BOTTLED WINES (5)                           │
│ ┌─────────────────────────────────────────┐ │
│ │ 2022 RESERVE (CAB FRANC RED)            │ │
│ │ 60 bottles | Bottled Mar 2024           │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Data Queries:**
```typescript
// Active wines
const activeWines = await zero.query.wine
  .where('status', 'active')
  .orderBy('updatedAt', 'desc')
  .run();

// Aging wines
const agingWines = await zero.query.wine
  .where('status', 'aging')
  .orderBy('updatedAt', 'desc')
  .run();

// Bottled wines
const bottledWines = await zero.query.wine
  .where('status', 'bottled')
  .orderBy('updatedAt', 'desc')
  .run();

// For each wine, fetch related data:
// - Vintage (for year + variety)
// - Latest measurement
// - Next pending task
```

**Wine Card Display:**
```
[Year] [Name] ([Variety] [Type])
[Stage] ([Days in Stage])
[Latest Measurements]
> [Next Pending Task]
```

**Click Actions:**
- **Click wine card**: Open wine detail view (shows stage history, all tasks, measurement history, etc.)
- **Click "ADD VINTAGE"**: Open AddVintageModal
- **Click "ADD WINE"**: Open AddWineModal
- **Click "MANAGE INVENTORY"**: Open inventory modal (bottled wines with bottle counts)
- **Click ⚙**: Open winery settings (task template configuration)

**Sections:**
1. **Active Wines**: Wines currently being worked on (most attention needed)
2. **Aging Wines**: Wines in barrel/tank (less frequent attention)
3. **Bottled Wines**: Completed wines (archive/reference)

**UI/UX:**
- Use same ListItem component pattern as VineyardView
- Collapsible sections
- Show count badges on section headers
- Empty states with helpful CTAs ("Create your first vintage to begin tracking wines")

---

## Implementation Order

### Phase 1: Foundation (Components #1, #2, #6)
1. ✅ Backend complete (migrations, seed data)
2. 🔲 Create `WineryView` skeleton with header and empty states
3. 🔲 Build `AddVintageModal` (Component #1)
4. 🔲 Build `AddWineModal` (Component #2)
5. 🔲 Update `WineryView` to display vintage/wine lists
6. 🔲 Test creating vintages and wines end-to-end

**Why this order?**
- Establishes core data flow (create vintages → create wines)
- Provides immediate value (can start tracking harvests)
- Tests Zero sync with winery tables

### Phase 2: Stage & Task Management (Components #3, #4)
1. 🔲 Build `StageTransitionModal` (Component #3)
2. 🔲 Build `TaskListView` (Component #4)
3. 🔲 Integrate task list into wine detail view
4. 🔲 Test stage transitions with task creation
5. 🔲 Test task completion and skipping

**Why this order?**
- Stage transitions are core workflow
- Tasks make stages actionable
- Natural progression: create wine → advance through stages → complete tasks

### Phase 3: Measurements (Component #5)
1. 🔲 Build `MeasurementModal` (Component #5)
2. 🔲 Implement real-time validation against measurement_range
3. 🔲 Display measurement history in wine detail view
4. 🔲 Link measurement modal to "Measure pH/TA/Brix" tasks
5. 🔲 Test validation warnings for all wine types

**Why this order?**
- Measurements build on existing stages/tasks
- Can test full workflow: create wine → advance stage → complete tasks → record measurements

### Phase 4: Polish & Additional Features
1. 🔲 Build inventory management modal (bottle counts, etc.)
2. 🔲 Add measurement history graphs (optional, nice-to-have)
3. 🔲 Add stage history timeline visualization
4. 🔲 Build task template configuration UI (settings gear)
5. 🔲 Add export/print vintage report

---

## Key Design Decisions Summary

1. **Vintages track grapes, wines track products** - Clearer mental model
2. **Wine names are required** - Ensures UI always has labels
3. **User confirms tasks when transitioning** - Not auto-created, gives control
4. **Real-time measurement validation** - Immediate feedback, non-blocking
5. **All operations through Zero** - No backend APIs needed
6. **Reusable modal/form components** - DRY principle, consistent UX
7. **Three-section wine list** - Active, Aging, Bottled (clear organization)
8. **Task list can be standalone or embedded** - Flexibility in UI
