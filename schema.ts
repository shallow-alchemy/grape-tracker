import { createSchema, createBuilder, table, string, number, json, boolean, ANYONE_CAN, definePermissions } from '@rocicorp/zero';

const userTable = table('user')
  .columns({
    id: string(),           // Clerk ID as primary key
    email: string(),
    display_name: string(),
    vineyard_id: string().optional(),
    role: string(),         // 'owner' | 'member'
    onboarding_completed: boolean(),
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

const vineyardTable = table('vineyard')
  .columns({
    id: string(),
    user_id: string(),
    name: string(),
    location: string(),
    varieties: json(),
    available_labor_hours: number().optional(), // Weekly hours available for vineyard work
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

const blockTable = table('block')
  .columns({
    id: string(),
    user_id: string(),
    name: string(),
    location: string(),
    size_acres: number(),
    soil_type: string(),
    notes: string(),
    training_method: string().optional(),
    training_method_other: string().optional(),
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

const vineTable = table('vine')
  .columns({
    id: string(),
    user_id: string(),
    block: string(),
    sequence_number: number(),
    variety: string(),
    planting_date: number(),
    health: string(),
    notes: string(),
    qr_generated: number(),
    training_method: string().optional(),
    training_method_other: string().optional(),
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

const pruningLogTable = table('pruning_log')
  .columns({
    id: string(),
    user_id: string(),
    vine_id: string(),
    date: number(),
    pruning_type: string(),
    spurs_left: number().optional(),
    canes_before: number().optional(),
    canes_after: number().optional(),
    notes: string(),
    photo_id: string().optional(),
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

const vintageTable = table('vintage')
  .columns({
    id: string(),
    user_id: string(),
    vineyard_id: string(),
    vintage_year: number(),
    variety: string(),
    block_ids: json(),
    current_stage: string(),
    harvest_date: number(),
    harvest_weight_lbs: number().optional(),
    harvest_volume_gallons: number().optional(),
    grape_source: string(),
    supplier_name: string().optional(),
    notes: string(),
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

const wineTable = table('wine')
  .columns({
    id: string(),
    user_id: string(),
    vintage_id: string(),
    vineyard_id: string(),
    name: string(),
    wine_type: string(),
    volume_gallons: number(),
    current_volume_gallons: number(),
    current_stage: string(),
    status: string(),
    last_tasting_notes: string(),
    blend_components: json(),
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

const stageHistoryTable = table('stage_history')
  .columns({
    id: string(),
    user_id: string(),
    entity_type: string(),
    entity_id: string(),
    stage: string(),
    started_at: number(),
    completed_at: number().optional(),
    skipped: boolean(),
    notes: string(),
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

const taskTemplateTable = table('task_template')
  .columns({
    id: string(),
    user_id: string(),
    vineyard_id: string(),
    stage: string(),
    entity_type: string(),
    wine_type: string(),
    name: string(),
    description: string(),
    frequency: string(),
    frequency_count: number(),
    frequency_unit: string(),
    default_enabled: boolean(),
    is_archived: boolean(),
    sort_order: number(),
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

const taskTable = table('task')
  .columns({
    id: string(),
    user_id: string(),
    task_template_id: string(),
    entity_type: string(),
    entity_id: string(),
    stage: string(),
    name: string(),
    description: string(),
    due_date: number(),
    completed_at: number(),
    completed_by: string(),
    notes: string(),
    skipped: boolean(),
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

const measurementTable = table('measurement')
  .columns({
    id: string(),
    user_id: string(),
    entity_type: string(),
    entity_id: string(),
    date: number(),
    stage: string(),
    ph: number().optional(),
    ta: number().optional(),
    brix: number().optional(),
    temperature: number().optional(),
    tasting_notes: string(),
    notes: string(),
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

const measurementRangeTable = table('measurement_range')
  .columns({
    id: string(),
    wine_type: string(),
    measurement_type: string(),
    min_value: number(),
    max_value: number(),
    ideal_min: number(),
    ideal_max: number(),
    low_warning: string(),
    high_warning: string(),
    created_at: number(),
  })
  .primaryKey('id');

const seasonalTaskTable = table('seasonal_task')
  .columns({
    id: string(),
    user_id: string(),
    week_start: number(),    // Monday of the week (timestamp)
    season: string(),        // e.g., "Post-Harvest/Early Dormant"
    priority: number(),      // 1, 2, 3, etc.
    task_name: string(),
    timing: string(),        // e.g., "Immediately", "This week"
    details: string(),
    completed_at: number().optional(),
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

const measurementAnalysisTable = table('measurement_analysis')
  .columns({
    id: string(),
    user_id: string(),
    measurement_id: string(),  // FK to measurement table
    summary: string(),
    metrics: json(),           // Array of { name, value, status, analysis }
    projections: string().optional(),
    recommendations: json(),   // Array of strings
    created_at: number(),
  })
  .primaryKey('id');

const stageTable = table('stage')
  .columns({
    id: string(),
    user_id: string(),         // '' = global default, user_id = user-specific
    entity_type: string(),     // 'wine' or 'vintage'
    value: string(),           // Stage identifier (e.g., 'crush')
    label: string(),           // Display name (e.g., 'Crush')
    description: string(),
    sort_order: number(),
    is_archived: boolean(),
    is_default: boolean(),     // TRUE = came from system defaults
    applicability: json(),     // Wine type applicability: {"red": "required", ...}
    created_at: number(),
    updated_at: number(),
  })
  .primaryKey('id');

export const schema = createSchema({
  tables: [
    userTable,
    vineyardTable,
    blockTable,
    vineTable,
    pruningLogTable,
    vintageTable,
    wineTable,
    stageHistoryTable,
    stageTable,
    taskTemplateTable,
    taskTable,
    measurementTable,
    measurementRangeTable,
    seasonalTaskTable,
    measurementAnalysisTable,
  ],
});

export type Schema = typeof schema;

// Builder for synced queries
export const builder = createBuilder(schema);

// NOTE: Temporary ANYONE_CAN permissions until synced queries are fully deployed
// This allows zero-cache to start but provides NO multi-user isolation
// TODO: Replace with synced queries (see zero-queries/src/queries.ts)
export const permissions = definePermissions<{ sub: string }, Schema>(
  schema,
  () => {
    return {
      user: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
      vineyard: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
      block: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
      vine: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
      pruning_log: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
      vintage: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
      wine: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
      stage_history: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
      stage: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
      task_template: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
      task: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
      measurement: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
      measurement_range: {
        row: {
          select: ANYONE_CAN,
          insert: [],
          update: {
            preMutation: [],
            postMutation: [],
          },
          delete: [],
        },
      },
      seasonal_task: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
      measurement_analysis: {
        row: {
          select: ANYONE_CAN,
          insert: ANYONE_CAN,
          update: {
            preMutation: ANYONE_CAN,
            postMutation: ANYONE_CAN,
          },
          delete: ANYONE_CAN,
        },
      },
    };
  }
);
