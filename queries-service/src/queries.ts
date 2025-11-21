import { syncedQuery, syncedQueryWithContext } from '@rocicorp/zero';
import { z } from 'zod';
import { builder } from '../../schema.js';

export type QueryContext = {
  userID: string;
};

export const myVineyards = syncedQueryWithContext(
  'myVineyards',
  z.tuple([]),
  (ctx: QueryContext) => builder.vineyard.where('user_id', ctx.userID)
);

export const myBlocks = syncedQueryWithContext(
  'myBlocks',
  z.tuple([]),
  (ctx: QueryContext) => builder.block.where('user_id', ctx.userID)
);

export const myVines = syncedQueryWithContext(
  'myVines',
  z.tuple([]),
  (ctx: QueryContext) => builder.vine.where('user_id', ctx.userID)
);

export const myVinesByBlock = syncedQueryWithContext(
  'myVinesByBlock',
  z.tuple([z.string()]),
  (ctx: QueryContext, blockId: string) =>
    builder.vine.where('user_id', ctx.userID).where('block', blockId)
);

export const myVineById = syncedQueryWithContext(
  'myVineById',
  z.tuple([z.string()]),
  (ctx: QueryContext, id: string) =>
    builder.vine.where('user_id', ctx.userID).where('id', id)
);

export const myVintages = syncedQueryWithContext(
  'myVintages',
  z.tuple([]),
  (ctx: QueryContext) => builder.vintage.where('user_id', ctx.userID)
);

export const myVintageById = syncedQueryWithContext(
  'myVintageById',
  z.tuple([z.string()]),
  (ctx: QueryContext, id: string) =>
    builder.vintage.where('user_id', ctx.userID).where('id', id)
);

export const myWines = syncedQueryWithContext(
  'myWines',
  z.tuple([]),
  (ctx: QueryContext) => builder.wine.where('user_id', ctx.userID)
);

export const myWineById = syncedQueryWithContext(
  'myWineById',
  z.tuple([z.string()]),
  (ctx: QueryContext, id: string) =>
    builder.wine.where('user_id', ctx.userID).where('id', id)
);

export const myWinesByVintage = syncedQueryWithContext(
  'myWinesByVintage',
  z.tuple([z.string()]),
  (ctx: QueryContext, vintageId: string) =>
    builder.wine.where('user_id', ctx.userID).where('vintage_id', vintageId)
);

export const myStageHistory = syncedQueryWithContext(
  'myStageHistory',
  z.tuple([]),
  (ctx: QueryContext) => builder.stage_history.where('user_id', ctx.userID)
);

export const myStageHistoryByEntity = syncedQueryWithContext(
  'myStageHistoryByEntity',
  z.tuple([z.string(), z.string()]),
  (ctx: QueryContext, entityType: string, entityId: string) =>
    builder.stage_history
      .where('user_id', ctx.userID)
      .where('entity_type', entityType)
      .where('entity_id', entityId)
);

export const myTaskTemplates = syncedQueryWithContext(
  'myTaskTemplates',
  z.tuple([]),
  (ctx: QueryContext) => builder.task_template.where('user_id', ctx.userID)
);

export const myTaskTemplatesByStage = syncedQueryWithContext(
  'myTaskTemplatesByStage',
  z.tuple([z.string()]),
  (ctx: QueryContext, stage: string) =>
    builder.task_template.where('user_id', ctx.userID).where('stage', stage)
);

export const myTasks = syncedQueryWithContext(
  'myTasks',
  z.tuple([]),
  (ctx: QueryContext) => builder.task.where('user_id', ctx.userID)
);

export const myTasksByEntity = syncedQueryWithContext(
  'myTasksByEntity',
  z.tuple([z.string(), z.string()]),
  (ctx: QueryContext, entityType: string, entityId: string) =>
    builder.task
      .where('user_id', ctx.userID)
      .where('entity_type', entityType)
      .where('entity_id', entityId)
);

export const myMeasurements = syncedQueryWithContext(
  'myMeasurements',
  z.tuple([]),
  (ctx: QueryContext) => builder.measurement.where('user_id', ctx.userID)
);

export const myMeasurementsByEntity = syncedQueryWithContext(
  'myMeasurementsByEntity',
  z.tuple([z.string(), z.string()]),
  (ctx: QueryContext, entityType: string, entityId: string) =>
    builder.measurement
      .where('user_id', ctx.userID)
      .where('entity_type', entityType)
      .where('entity_id', entityId)
);

// Global queries - no user filtering
export const taskTemplates = syncedQuery(
  'taskTemplates',
  z.tuple([]),
  () => builder.task_template
);

export const measurementRanges = syncedQuery(
  'measurementRanges',
  z.tuple([]),
  () => builder.measurement_range
);

export const queries = {
  myVineyards,
  myBlocks,
  myVines,
  myVinesByBlock,
  myVineById,
  myVintages,
  myVintageById,
  myWines,
  myWineById,
  myWinesByVintage,
  myStageHistory,
  myStageHistoryByEntity,
  myTaskTemplates,
  myTaskTemplatesByStage,
  myTasks,
  myTasksByEntity,
  myMeasurements,
  myMeasurementsByEntity,
  taskTemplates,
  measurementRanges,
};
