import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import postgres from 'postgres';
import { withValidation } from '@rocicorp/zero';
import { handleGetQueriesRequest, PushProcessor } from '@rocicorp/zero/server';
import { zeroPostgresJS } from '@rocicorp/zero/server/adapters/postgresjs';
import { schema } from '../schema.js';
import { createMutators, type AuthData } from './mutators.js';
import {
  myUser,
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
  activeWines,
  myStageHistory,
  myStageHistoryByEntity,
  myTaskTemplates,
  myTaskTemplatesByStage,
  taskTemplates,
  myTasks,
  myTasksByEntity,
  myMeasurements,
  myMeasurementsByEntity,
  measurementRanges,
  myPruningLogsByVine,
  mySeasonalTasksByWeek,
  myMeasurementAnalysisByMeasurement,
  myMeasurementAnalyses,
  stages,
  allStages,
  supplyTemplates,
  supplyTemplatesByTask,
  mySupplyInstances,
  mySupplyInstancesByTask,
  mySupplyInstancesByEntity,
} from './queries.js';

const app = new Hono();

// Enable CORS for zero-cache requests
app.use('/*', cors());

// Database connection for custom mutators
const databaseUrl = process.env.ZERO_UPSTREAM_DB;
if (!databaseUrl) {
  console.warn('[queries-service] ZERO_UPSTREAM_DB not set - mutations will fail');
}

// Create postgres connection and PushProcessor for custom mutators
const sql = databaseUrl ? postgres(databaseUrl) : null;
const zqlDB = sql ? zeroPostgresJS(schema, sql) : null;
const pushProcessor = zqlDB ? new PushProcessor(zqlDB) : null;

// Register all synced queries with validation
const validatedQueries = {
  [myUser.queryName]: withValidation(myUser),
  [myVineyards.queryName]: withValidation(myVineyards),
  [myBlocks.queryName]: withValidation(myBlocks),
  [myVines.queryName]: withValidation(myVines),
  [myVinesByBlock.queryName]: withValidation(myVinesByBlock),
  [myVineById.queryName]: withValidation(myVineById),
  [myVintages.queryName]: withValidation(myVintages),
  [myVintageById.queryName]: withValidation(myVintageById),
  [myWines.queryName]: withValidation(myWines),
  [myWineById.queryName]: withValidation(myWineById),
  [myWinesByVintage.queryName]: withValidation(myWinesByVintage),
  [activeWines.queryName]: withValidation(activeWines),
  [myStageHistory.queryName]: withValidation(myStageHistory),
  [myStageHistoryByEntity.queryName]: withValidation(myStageHistoryByEntity),
  [myTaskTemplates.queryName]: withValidation(myTaskTemplates),
  [myTaskTemplatesByStage.queryName]: withValidation(myTaskTemplatesByStage),
  [taskTemplates.queryName]: withValidation(taskTemplates),
  [myTasks.queryName]: withValidation(myTasks),
  [myTasksByEntity.queryName]: withValidation(myTasksByEntity),
  [myMeasurements.queryName]: withValidation(myMeasurements),
  [myMeasurementsByEntity.queryName]: withValidation(myMeasurementsByEntity),
  [measurementRanges.queryName]: withValidation(measurementRanges),
  [myPruningLogsByVine.queryName]: withValidation(myPruningLogsByVine),
  [mySeasonalTasksByWeek.queryName]: withValidation(mySeasonalTasksByWeek),
  [myMeasurementAnalysisByMeasurement.queryName]: withValidation(myMeasurementAnalysisByMeasurement),
  [myMeasurementAnalyses.queryName]: withValidation(myMeasurementAnalyses),
  [stages.queryName]: withValidation(stages),
  [allStages.queryName]: withValidation(allStages),
  [supplyTemplates.queryName]: withValidation(supplyTemplates),
  [supplyTemplatesByTask.queryName]: withValidation(supplyTemplatesByTask),
  [mySupplyInstances.queryName]: withValidation(mySupplyInstances),
  [mySupplyInstancesByTask.queryName]: withValidation(mySupplyInstancesByTask),
  [mySupplyInstancesByEntity.queryName]: withValidation(mySupplyInstancesByEntity),
};

// Extract user ID from request headers
// zero-cache forwards the user's JWT in Authorization header
const extractUserID = (req: Request): string | undefined => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.log('[queries-service] No Authorization header');
    return undefined;
  }

  try {
    // Bearer token format
    const token = authHeader.replace('Bearer ', '');

    // Decode JWT payload (base64url encoded, second part)
    // Note: In production, you should verify the JWT signature
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) {
      console.log('[queries-service] Invalid JWT format');
      return undefined;
    }

    // Base64url to Base64
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));

    console.log('[queries-service] Decoded userID:', payload.sub);
    return payload.sub;
  } catch (err) {
    console.log('[queries-service] Failed to decode JWT:', err);
    return undefined;
  }
};

// Query resolver - looks up query by name and applies auth context
const getQuery = (
  userID: string | undefined,
  name: string,
  args: readonly unknown[]
) => {
  const query = validatedQueries[name as keyof typeof validatedQueries];
  if (!query) {
    throw new Error(`Unknown query: ${name}`);
  }
  // Call query with userID as context (matches ztunes pattern)
  return query(userID, ...(args as any[]));
};

// POST /get-queries endpoint (zero-cache calls this)
app.post('/get-queries', async (c) => {
  console.log('[queries-service] Received /get-queries request');

  // Extract userID from JWT
  const userID = extractUserID(c.req.raw);

  const result = await handleGetQueriesRequest(
    (name, args) => ({ query: getQuery(userID, name, args) }),
    schema,
    c.req.raw
  );

  return c.json(result);
});

// POST /push endpoint for custom mutators (zero-cache calls this)
app.post('/push', async (c) => {
  console.log('[queries-service] Received /push request');

  if (!pushProcessor) {
    console.error('[queries-service] PushProcessor not initialized - ZERO_UPSTREAM_DB not set');
    return c.json({ error: 'Server not configured for mutations' }, 500);
  }

  // Extract userID from JWT for auth context
  const userID = extractUserID(c.req.raw);
  const authData: AuthData = userID ? { userID } : undefined;

  console.log('[queries-service] Processing push with authData:', authData ? 'authenticated' : 'anonymous');

  try {
    const mutators = createMutators(authData);
    const result = await pushProcessor.process(mutators, c.req.raw);
    return c.json(result);
  } catch (error) {
    console.error('[queries-service] Push error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok' }));

const port = parseInt(process.env.PORT || '3002', 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[queries-service] Listening on http://localhost:${info.port}`);
});
