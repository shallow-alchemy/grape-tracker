# Winery Backend Implementation Plan

## Database Migrations

✅ **Created:**
- `20251113000001_create_winery_tables.sql` - Creates all winery tables
- `20251113000002_seed_winery_reference_data.sql` - Seeds measurement ranges and default task templates

### Tables Created:
1. `vintage` - Harvest records (variety + year)
2. `wine` - Finished wine products made from vintages
3. `stage_history` - Tracks stage transitions
4. `task_template` - Configurable tasks per stage/wine-type
5. `task` - Actual task instances
6. `measurement` - Chemistry and tasting measurements
7. `measurement_range` - Reference data for validation

## Zero Schema

✅ **Updated:**
- `schema.ts` - Added all 7 winery tables
- `schema.js` - Compiled for zero-cache server
- Permissions configured (ANYONE_CAN for all operations)

## Backend API Needs

**TL;DR: Zero handles everything. No backend API endpoints needed for winery feature.**

### Why No Backend APIs Needed?

All winery operations can be handled through Zero sync:

#### 1. **Vintage & Wine Management**
```typescript
// Create vintage
await zero.mutate.vintage.insert({
  id: crypto.randomUUID(),
  vineyardId: 'default',
  vintageYear: 2025,
  variety: 'CAB_FRANC',
  blockIds: ['block-a', 'block-b'],
  currentStage: 'bud_break',
  // ... other fields
});

// Create wine from vintage
await zero.mutate.wine.insert({
  id: crypto.randomUUID(),
  vintageId: 'vintage-123',
  vineyardId: 'default',
  name: 'Lodi',
  wineType: 'red',
  currentStage: 'crush',
  status: 'active',
  // ... other fields
});
```

#### 2. **Stage Transitions with Task Generation**

When user transitions a wine to a new stage:

```typescript
// Frontend logic when stage changes
const transitionToStage = async (wineId: string, newStage: string, wineType: string) => {
  // 1. Query task templates for this stage/wine-type
  const templates = await zero.query.taskTemplate
    .where('stage', newStage)
    .where('entityType', 'wine')
    .where('wineType', wineType)
    .where('defaultEnabled', 1)
    .run();

  // 2. Show user a checklist modal to confirm which tasks to create
  const selectedTemplates = await showTaskSelectionModal(templates);

  // 3. Create selected tasks
  const now = Date.now();
  for (const template of selectedTemplates) {
    await zero.mutate.task.insert({
      id: crypto.randomUUID(),
      taskTemplateId: template.id,
      entityType: 'wine',
      entityId: wineId,
      stage: newStage,
      name: template.name,
      description: template.description,
      dueDate: calculateDueDate(template.frequency), // frontend util
      createdAt: now,
      updatedAt: now,
    });
  }

  // 4. Update wine stage
  await zero.mutate.wine.update({
    id: wineId,
    currentStage: newStage,
    updatedAt: now,
  });

  // 5. Record stage history
  await zero.mutate.stageHistory.insert({
    id: crypto.randomUUID(),
    entityType: 'wine',
    entityId: wineId,
    stage: newStage,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  });
};
```

#### 3. **Measurement Validation**

```typescript
// Frontend validation against ranges
const validateMeasurement = async (wineType: string, ph: number, ta: number, brix: number) => {
  const ranges = await zero.query.measurementRange
    .where('wineType', wineType)
    .run();

  const warnings = [];

  // Check pH
  const phRange = ranges.find(r => r.measurementType === 'ph');
  if (ph < phRange.idealMin) warnings.push({ type: 'ph', message: phRange.lowWarning });
  if (ph > phRange.idealMax) warnings.push({ type: 'ph', message: phRange.highWarning });

  // Check TA
  const taRange = ranges.find(r => r.measurementType === 'ta');
  if (ta < taRange.idealMin) warnings.push({ type: 'ta', message: taRange.lowWarning });
  // ... etc

  return warnings;
};
```

#### 4. **Task Completion**

```typescript
// Mark task complete
await zero.mutate.task.update({
  id: taskId,
  completedAt: Date.now(),
  completedBy: user.id,
  notes: 'Completed successfully',
  updatedAt: Date.now(),
});
```

#### 5. **Ad-Hoc Tasks**

```typescript
// Create ad-hoc task (taskTemplateId = null)
await zero.mutate.task.insert({
  id: crypto.randomUUID(),
  taskTemplateId: null, // No template
  entityType: 'wine',
  entityId: wineId,
  stage: currentStage,
  name: 'Custom task name',
  description: 'User-defined task',
  dueDate: Date.now() + 86400000, // Tomorrow
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

### What Zero Handles Well:

✅ **CRUD operations** - Insert, update, delete, query
✅ **Real-time sync** - Multiple clients see changes instantly
✅ **Offline support** - Mutations work offline, sync when reconnected
✅ **Client-side joins** - Can query related data in frontend
✅ **Filtering & sorting** - `.where()`, `.orderBy()` clauses
✅ **Transactions** - Multiple mutations in sequence

### When You WOULD Need Backend APIs:

❌ **Complex calculations** - If you needed statistical analysis, ML predictions
❌ **External integrations** - Third-party APIs (e.g., label printing service)
❌ **Email/SMS** - Sending notifications
❌ **File processing** - Image uploads, PDF generation
❌ **Scheduled jobs** - Cron tasks, automated reminders
❌ **Server-side validation** - If client-side validation isn't sufficient

**For the winery feature: None of these apply!**

## Implementation Approach

### Phase 1: Foundation (Current)
✅ Database migrations created
✅ Zero schema updated
✅ Seed data for measurement ranges and task templates

### Phase 2: Frontend Components (Next)
1. Create vintage form modal
2. Create wine form modal
3. Winery tab with vintage/wine lists
4. Stage transition UI with task selection
5. Task list component
6. Measurement entry form
7. Stage history timeline

### Phase 3: Dashboard Integration
1. Add "Current Wines" panel to dashboard
2. Show active wines with current stage
3. Show pending tasks
4. Show recent measurements

## Running Migrations

```bash
# Start backend (runs migrations automatically)
cd backend
cargo run

# Or in development with full stack
yarn dev
```

Migrations will run automatically via SQLx when the backend starts.

## Testing Migrations

```bash
# Connect to database
psql postgresql://user@localhost:5432/gilbert

# Verify tables created
\dt

# Check seed data
SELECT * FROM measurement_range;
SELECT * FROM task_template WHERE vineyard_id = 'default';
```

## Next Steps

1. ✅ Migrations created
2. ✅ Zero schema updated
3. 🔲 Create TypeScript types from schema
4. 🔲 Build frontend components
5. 🔲 Implement stage transition logic
6. 🔲 Build task management UI
7. 🔲 Create measurement forms

**No backend API work needed** - proceed directly to frontend implementation!
