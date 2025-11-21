// Client-side query wrappers
// These return unfiltered Zero queries that components can use
// The queries-service provides the server-side filtered versions

import { builder } from '../schema';

export type QueryContext = {
  userID: string;
};

// User-specific queries (unfiltered on client)
export const myVineyards = () => builder.vineyard;
export const myBlocks = () => builder.block;
export const myVines = () => builder.vine;
export const myVinesByBlock = (blockId: string) => builder.vine.where('block', blockId);
export const myVineById = (id: string) => builder.vine.where('id', id);
export const myVintages = () => builder.vintage;
export const myVintageById = (id: string) => builder.vintage.where('id', id);
export const myWines = () => builder.wine;
export const myWineById = (id: string) => builder.wine.where('id', id);
export const myWinesByVintage = (vintageId: string) => builder.wine.where('vintage_id', vintageId);
export const myStageHistory = () => builder.stage_history;
export const myStageHistoryByEntity = (entityType: string, entityId: string) =>
  builder.stage_history.where('entity_type', entityType).where('entity_id', entityId);
export const myTaskTemplates = () => builder.task_template;
export const myTaskTemplatesByStage = (stage: string) => builder.task_template.where('stage', stage);
export const myTasks = () => builder.task;
export const myTasksByEntity = (entityType: string, entityId: string) =>
  builder.task.where('entity_type', entityType).where('entity_id', entityId);
export const myMeasurements = () => builder.measurement;
export const myMeasurementsByEntity = (entityType: string, entityId: string) =>
  builder.measurement.where('entity_type', entityType).where('entity_id', entityId);

// Global queries
export const taskTemplates = () => builder.task_template;
export const measurementRanges = () => builder.measurement_range;
