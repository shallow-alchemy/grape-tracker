import { createSchema, table, string, number, json, ANYONE_CAN, definePermissions } from '@rocicorp/zero';

const vineyardTable = table('vineyard')
  .columns({
    id: string(),
    name: string(),
    location: string(),
    varieties: json(),
    createdAt: number(),
    updatedAt: number(),
  })
  .primaryKey('id');

const blockTable = table('block')
  .columns({
    id: string(),
    name: string(),
    location: string(),
    sizeAcres: number(),
    soilType: string(),
    notes: string(),
    createdAt: number(),
    updatedAt: number(),
  })
  .primaryKey('id');

const vineTable = table('vine')
  .columns({
    id: string(),
    block: string(),
    sequenceNumber: number(),
    variety: string(),
    plantingDate: number(),
    health: string(),
    notes: string(),
    qrGenerated: number(),
    createdAt: number(),
    updatedAt: number(),
  })
  .primaryKey('id');

const vintageTable = table('vintage')
  .columns({
    id: string(),
    vineyardId: string(),
    vintageYear: number(),
    variety: string(),
    blockIds: json(),
    currentStage: string(),
    harvestDate: number(),
    harvestWeightLbs: number(),
    harvestVolumeGallons: number(),
    brixAtHarvest: number(),
    notes: string(),
    createdAt: number(),
    updatedAt: number(),
  })
  .primaryKey('id');

const wineTable = table('wine')
  .columns({
    id: string(),
    vintageId: string(),
    vineyardId: string(),
    name: string(),
    wineType: string(),
    volumeGallons: number(),
    currentVolumeGallons: number(),
    currentStage: string(),
    status: string(),
    lastTastingNotes: string(),
    createdAt: number(),
    updatedAt: number(),
  })
  .primaryKey('id');

const stageHistoryTable = table('stageHistory')
  .columns({
    id: string(),
    entityType: string(),
    entityId: string(),
    stage: string(),
    startedAt: number(),
    completedAt: number(),
    skipped: number(),
    notes: string(),
    createdAt: number(),
    updatedAt: number(),
  })
  .primaryKey('id');

const taskTemplateTable = table('taskTemplate')
  .columns({
    id: string(),
    vineyardId: string(),
    stage: string(),
    entityType: string(),
    wineType: string(),
    name: string(),
    description: string(),
    frequency: string(),
    frequencyCount: number(),
    frequencyUnit: string(),
    defaultEnabled: number(),
    sortOrder: number(),
    createdAt: number(),
    updatedAt: number(),
  })
  .primaryKey('id');

const taskTable = table('task')
  .columns({
    id: string(),
    taskTemplateId: string(),
    entityType: string(),
    entityId: string(),
    stage: string(),
    name: string(),
    description: string(),
    dueDate: number(),
    completedAt: number(),
    completedBy: string(),
    notes: string(),
    skipped: number(),
    createdAt: number(),
    updatedAt: number(),
  })
  .primaryKey('id');

const measurementTable = table('measurement')
  .columns({
    id: string(),
    entityType: string(),
    entityId: string(),
    date: number(),
    stage: string(),
    ph: number(),
    ta: number(),
    brix: number(),
    temperature: number(),
    tastingNotes: string(),
    notes: string(),
    createdAt: number(),
    updatedAt: number(),
  })
  .primaryKey('id');

const measurementRangeTable = table('measurementRange')
  .columns({
    id: string(),
    wineType: string(),
    measurementType: string(),
    minValue: number(),
    maxValue: number(),
    idealMin: number(),
    idealMax: number(),
    lowWarning: string(),
    highWarning: string(),
    createdAt: number(),
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

export const permissions = definePermissions<{ sub: string }, Schema>(
  schema,
  () => ({
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
    stageHistory: {
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
    taskTemplate: {
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
    measurementRange: {
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
  })
);
