import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { withValidation } from '@rocicorp/zero';
import { handleGetQueriesRequest } from '@rocicorp/zero/server';
import { schema } from '../../schema.js';
import { activeWines } from './queries.js';

type AuthData = { sub: string } | null;

const app = new Hono();

// Enable CORS for zero-cache requests
app.use('/*', cors());

// Register all synced queries with validation
const validatedQueries = {
  [activeWines.queryName]: withValidation(activeWines),
};

// Extract auth data from request headers
// zero-cache forwards the user's JWT in Authorization header
const extractAuthData = (req: Request): AuthData => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.log('[queries-service] No Authorization header');
    return null;
  }

  try {
    // Bearer token format
    const token = authHeader.replace('Bearer ', '');

    // Decode JWT payload (base64url encoded, second part)
    // Note: In production, you should verify the JWT signature
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) {
      console.log('[queries-service] Invalid JWT format');
      return null;
    }

    // Base64url to Base64
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));

    console.log('[queries-service] Decoded auth:', { sub: payload.sub });
    return { sub: payload.sub };
  } catch (err) {
    console.log('[queries-service] Failed to decode JWT:', err);
    return null;
  }
};

// Query resolver - looks up query by name and applies auth context
const getQuery = (
  authData: AuthData,
  name: string,
  args: readonly unknown[]
) => {
  const query = validatedQueries[name as keyof typeof validatedQueries];
  if (!query) {
    throw new Error(`Unknown query: ${name}`);
  }
  // Call query with auth context
  return query(authData, ...args);
};

// GET /get-queries endpoint (zero-cache calls this)
app.post('/get-queries', async (c) => {
  console.log('[queries-service] Received /get-queries request');

  // Extract auth from request
  const authData = extractAuthData(c.req.raw);

  const result = await handleGetQueriesRequest(
    (name, args) => ({ query: getQuery(authData, name, args) }),
    schema,
    c.req.raw
  );

  return c.json(result);
});

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok' }));

const port = 3002;
console.log(`[queries-service] Starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
