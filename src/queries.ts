// Client-side query references
// These create query objects that Zero can serialize and send to queries-service

import { builder } from '../schema';

export type QueryContext = {
  userID: string;
};

// Create a client-side query reference that Zero can intercept
// When getQueriesURL is configured, Zero sends these to the queries-service
function createClientQuery(queryName: string) {
  return (...args: any[]) => {
    // Return a regular Zero query with a customQueryID marker
    const query = builder.vineyard as any; // Start with any table (doesn't matter)
    query.customQueryID = { name: queryName, args };
    return query;
  };
}

// User-specific query references
export const myVineyards = createClientQuery('myVineyards');
export const myBlocks = createClientQuery('myBlocks');
export const myVines = createClientQuery('myVines');
export const myVinesByBlock = createClientQuery('myVinesByBlock');
export const myVineById = createClientQuery('myVineById');
export const myVintages = createClientQuery('myVintages');
export const myVintageById = createClientQuery('myVintageById');
export const myWines = createClientQuery('myWines');
export const myWineById = createClientQuery('myWineById');
export const myWinesByVintage = createClientQuery('myWinesByVintage');
export const myStageHistory = createClientQuery('myStageHistory');
export const myStageHistoryByEntity = createClientQuery('myStageHistoryByEntity');
export const myTaskTemplates = createClientQuery('myTaskTemplates');
export const myTaskTemplatesByStage = createClientQuery('myTaskTemplatesByStage');
export const myTasks = createClientQuery('myTasks');
export const myTasksByEntity = createClientQuery('myTasksByEntity');
export const myMeasurements = createClientQuery('myMeasurements');
export const myMeasurementsByEntity = createClientQuery('myMeasurementsByEntity');

// Global query references
export const taskTemplates = createClientQuery('taskTemplates');
export const measurementRanges = createClientQuery('measurementRanges');
