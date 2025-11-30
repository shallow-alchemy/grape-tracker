// Synced queries - shared between frontend and queries-service
// These must match the definitions in queries-service/src/queries.ts

import { syncedQueryWithContext } from '@rocicorp/zero';
import { z } from 'zod';
import { builder } from '../../schema';

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

export const activeWines = syncedQueryWithContext(
  'activeWines',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.wine.where('id', '___never_match___');
    return builder.wine.where('user_id', userID).where('current_stage', 'IN', ACTIVE_STAGES);
  }
);

export const myVineyards = syncedQueryWithContext(
  'myVineyards',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.vineyard.where('id', '___never_match___');
    return builder.vineyard.where('user_id', userID);
  }
);

export const myBlocks = syncedQueryWithContext(
  'myBlocks',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.block.where('id', '___never_match___');
    return builder.block.where('user_id', userID);
  }
);

export const myVines = syncedQueryWithContext(
  'myVines',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.vine.where('id', '___never_match___');
    return builder.vine.where('user_id', userID);
  }
);

export const myTasks = syncedQueryWithContext(
  'myTasks',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.task.where('id', '___never_match___');
    return builder.task.where('user_id', userID);
  }
);

export const myVintages = syncedQueryWithContext(
  'myVintages',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.vintage.where('id', '___never_match___');
    return builder.vintage.where('user_id', userID);
  }
);

export const myWines = syncedQueryWithContext(
  'myWines',
  z.tuple([]),
  (userID: string | undefined) => {
    if (!userID) return builder.wine.where('id', '___never_match___');
    return builder.wine.where('user_id', userID);
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

export const taskTemplates = syncedQueryWithContext(
  'taskTemplates',
  z.tuple([]),
  (_userID: string | undefined) => {
    // Task templates can be global - no user filter
    return builder.task_template;
  }
);

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

export const mySeasonalTasksByWeek = syncedQueryWithContext(
  'mySeasonalTasksByWeek',
  z.tuple([z.number()]),
  (userID: string | undefined, weekStart: number) => {
    if (!userID) return builder.seasonal_task.where('id', '___never_match___');
    return builder.seasonal_task
      .where('user_id', userID)
      .where('week_start', weekStart);
  }
);
