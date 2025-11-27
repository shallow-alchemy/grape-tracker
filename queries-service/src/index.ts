import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { withValidation } from '@rocicorp/zero';
import { handleGetQueriesRequest } from '@rocicorp/zero/server';
import { schema } from '../schema.js';
import {
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
} from './queries.js';

const app = new Hono();

// Enable CORS for zero-cache requests
app.use('/*', cors());

// Register all synced queries with validation
const validatedQueries = {
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

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok' }));

const port = parseInt(process.env.PORT || '3002', 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[queries-service] Listening on http://localhost:${info.port}`);
});
