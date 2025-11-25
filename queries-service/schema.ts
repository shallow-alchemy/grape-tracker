import { createSchema, createBuilder, table, string, number, json, boolean, ANYONE_CAN, definePermissions } from '@rocicorp/zero';

const vineyardTable = table('vineyard')
  .columns({
    id: string(),
    user_id: string(),
    name: string(),
    location: string(),
    varieties: json(),
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

export const schema = createSchema({
  tables: [
    vineyardTable,
    blockTable,
    vineTable,
    vintageTable,
    wineTable,
    stageHistoryTable,
    taskTemplateTable,
    taskTable,
    measurementTable,
    measurementRangeTable,
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
    };
  }
);
