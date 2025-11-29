import { syncedQueryWithContext } from '@rocicorp/zero';
import { z } from 'zod';
import { builder } from '../schema.js';

const ACTIVE_STAGES = [
  'crush',
  'primary_fermentation',
  'secondary_fermentation',
  'racking',
  'oaking',
  'aging',
];

// User query - uses Clerk ID as primary key
export const myUser = syncedQueryWithContext(
  'myUser',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.user.where('id', '___never_match___');
    return builder.user.where('id', userID);
  }
);

// Vineyard queries
export const myVineyards = syncedQueryWithContext(
  'myVineyards',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.vineyard.where('id', '___never_match___');
    return builder.vineyard.where('user_id', userID);
  }
);

// Block queries
export const myBlocks = syncedQueryWithContext(
  'myBlocks',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.block.where('id', '___never_match___');
    return builder.block.where('user_id', userID);
  }
);

// Vine queries
export const myVines = syncedQueryWithContext(
  'myVines',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.vine.where('id', '___never_match___');
    return builder.vine.where('user_id', userID);
  }
);

export const myVinesByBlock = syncedQueryWithContext(
  'myVinesByBlock',
  z.tuple([z.string()]),
  (userID: string | undefined, blockId: string) => {
    if (!userID) return builder.vine.where('id', '___never_match___');
    return builder.vine.where('user_id', userID).where('block', blockId);
  }
);

export const myVineById = syncedQueryWithContext(
  'myVineById',
  z.tuple([z.string()]),
  (userID: string | undefined, vineId: string) => {
    if (!userID) return builder.vine.where('id', '___never_match___');
    return builder.vine.where('user_id', userID).where('id', vineId);
  }
);

// Vintage queries
export const myVintages = syncedQueryWithContext(
  'myVintages',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.vintage.where('id', '___never_match___');
    return builder.vintage.where('user_id', userID);
  }
);

export const myVintageById = syncedQueryWithContext(
  'myVintageById',
  z.tuple([z.string()]),
  (userID: string | undefined, vintageId: string) => {
    if (!userID) return builder.vintage.where('id', '___never_match___');
    return builder.vintage.where('user_id', userID).where('id', vintageId);
  }
);

// Wine queries
export const myWines = syncedQueryWithContext(
  'myWines',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.wine.where('id', '___never_match___');
    return builder.wine.where('user_id', userID);
  }
);

export const myWineById = syncedQueryWithContext(
  'myWineById',
  z.tuple([z.string()]),
  (userID: string | undefined, wineId: string) => {
    if (!userID) return builder.wine.where('id', '___never_match___');
    return builder.wine.where('user_id', userID).where('id', wineId);
  }
);

export const myWinesByVintage = syncedQueryWithContext(
  'myWinesByVintage',
  z.tuple([z.string()]),
  (userID: string | undefined, vintageId: string) => {
    if (!userID) return builder.wine.where('id', '___never_match___');
    return builder.wine.where('user_id', userID).where('vintage_id', vintageId);
  }
);

export const activeWines = syncedQueryWithContext(
  'activeWines',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.wine.where('id', '___never_match___');
    return builder.wine.where('user_id', userID).where('current_stage', 'IN', ACTIVE_STAGES);
  }
);

// Stage history queries
export const myStageHistory = syncedQueryWithContext(
  'myStageHistory',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.stage_history.where('id', '___never_match___');
    return builder.stage_history.where('user_id', userID);
  }
);

export const myStageHistoryByEntity = syncedQueryWithContext(
  'myStageHistoryByEntity',
  z.tuple([z.string(), z.string()]),
  (userID: string | undefined, entityType: string, entityId: string) => {
    if (!userID) return builder.stage_history.where('id', '___never_match___');
    return builder.stage_history
      .where('user_id', userID)
      .where('entity_type', entityType)
      .where('entity_id', entityId);
  }
);

// Task template queries
export const myTaskTemplates = syncedQueryWithContext(
  'myTaskTemplates',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.task_template.where('id', '___never_match___');
    return builder.task_template.where('user_id', userID);
  }
);

export const myTaskTemplatesByStage = syncedQueryWithContext(
  'myTaskTemplatesByStage',
  z.tuple([z.string()]),
  (userID: string | undefined, stage: string) => {
    if (!userID) return builder.task_template.where('id', '___never_match___');
    return builder.task_template.where('user_id', userID).where('stage', stage);
  }
);

export const taskTemplates = syncedQueryWithContext(
  'taskTemplates',
  z.tuple([]),
  (_userID: string | undefined) => {
    // Task templates can be global (no user filter) or user-specific
    // For now, return all templates
    return builder.task_template;
  }
);

// Task queries
export const myTasks = syncedQueryWithContext(
  'myTasks',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.task.where('id', '___never_match___');
    return builder.task.where('user_id', userID);
  }
);

export const myTasksByEntity = syncedQueryWithContext(
  'myTasksByEntity',
  z.tuple([z.string(), z.string()]),
  (userID: string | undefined, entityType: string, entityId: string) => {
    if (!userID) return builder.task.where('id', '___never_match___');
    return builder.task
      .where('user_id', userID)
      .where('entity_type', entityType)
      .where('entity_id', entityId);
  }
);

// Measurement queries
export const myMeasurements = syncedQueryWithContext(
  'myMeasurements',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.measurement.where('id', '___never_match___');
    return builder.measurement.where('user_id', userID);
  }
);

export const myMeasurementsByEntity = syncedQueryWithContext(
  'myMeasurementsByEntity',
  z.tuple([z.string(), z.string()]),
  (userID: string | undefined, entityType: string, entityId: string) => {
    if (!userID) return builder.measurement.where('id', '___never_match___');
    return builder.measurement
      .where('user_id', userID)
      .where('entity_type', entityType)
      .where('entity_id', entityId);
  }
);

// Measurement range queries (global, no user filter)
export const measurementRanges = syncedQueryWithContext(
  'measurementRanges',
  z.tuple([]),
  (_userID: string | undefined) => {
    return builder.measurement_range;
  }
);

// Pruning log queries
export const myPruningLogsByVine = syncedQueryWithContext(
  'myPruningLogsByVine',
  z.tuple([z.string()]),
  (userID: string | undefined, vineId: string) => {
    if (!userID) return builder.pruning_log.where('id', '___never_match___');
    return builder.pruning_log
      .where('user_id', userID)
      .where('vine_id', vineId);
  }
);
