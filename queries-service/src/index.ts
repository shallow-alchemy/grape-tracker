import express from 'express';
import cors from 'cors';
import { handleGetQueriesRequest } from '@rocicorp/zero/server';
import { withValidation } from '@rocicorp/zero';
import { createClerkClient } from '@clerk/backend';
import { schema } from '../../schema.js';
import type { QueryContext } from '../../src/queries.js';
import * as queries from '../../src/queries.js';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const authenticateUser = async (req: express.Request): Promise<QueryContext> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7);

  try {
    const verifiedToken = await clerkClient.verifyToken(token);

    if (!verifiedToken.sub) {
      throw new Error('Invalid token: missing subject');
    }

    console.log(`✅ Authenticated user: ${verifiedToken.sub}`);
    return { userID: verifiedToken.sub };
  } catch (error) {
    console.error('❌ Authentication error:', error);
    throw new Error('Authentication failed');
  }
};

const queryList = [
  queries.myVineyards,
  queries.myBlocks,
  queries.myVines,
  queries.myVinesByBlock,
  queries.myVineById,
  queries.myVintages,
  queries.myVintageById,
  queries.myWines,
  queries.myWineById,
  queries.myWinesByVintage,
  queries.myStageHistory,
  queries.myStageHistoryByEntity,
  queries.myTaskTemplates,
  queries.myTaskTemplatesByStage,
  queries.myTasks,
  queries.myTasksByEntity,
  queries.myMeasurements,
  queries.myMeasurementsByEntity,
  queries.taskTemplates,
  queries.measurementRanges,
];

const validatedQueries = Object.fromEntries(
  queryList.map(q => [q.queryName, withValidation(q)])
);

app.post('/get-queries', async (req, res) => {
  try {
    // Log incoming request for debugging
    console.log('📥 Incoming request body:', JSON.stringify(req.body, null, 2));

    // TEMPORARY: Hardcode the actual Clerk user ID for testing
    // TODO: Extract from JWT when Zero cache forwards auth headers
    const authContext = { userID: 'user_34zvb6YsnjkI4IFo9qDJyUXGQfK' };
    console.log(`📊 Processing queries for user ${authContext.userID}`);

    // Convert Express request to Web API Request format
    const webApiRequest = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method,
      headers: new Headers(req.headers as Record<string, string>),
      body: JSON.stringify(req.body),
    });

    const result = await handleGetQueriesRequest(
      (name, args) => {
        console.log(`📋 Callback called with name="${name}", args=${JSON.stringify(args)}`);
        const query = validatedQueries[name];

        if (!query) {
          console.error(`❌ Unknown query: ${name}`);
          throw new Error(`Unknown query: ${name}`);
        }

        // @ts-expect-error - takesContext not in type definitions but exists at runtime
        if (query.takesContext) {
          console.log(`  ↳ User query: ${name}`);
          const result = query(authContext, ...args);
          console.log(`  ↳ Result:`, result);
          return { query: result };
        } else {
          console.log(`  ↳ Global query: ${name}`);
          const result = query(...args);
          console.log(`  ↳ Result:`, result);
          return { query: result };
        }
      },
      schema,
      webApiRequest
    );

    console.log(`✅ Successfully processed queries`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in /get-queries:', error);

    if (error instanceof Error && error.message.includes('Authentication')) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'queries-service',
    timestamp: new Date().toISOString(),
    queriesCount: queryList.length,
    queries: queryList.map(q => q.queryName),
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Gilbert Queries Service (TypeScript Reference)',
    version: '1.0.0',
    purpose: [
      'Production user isolation for Gilbert',
      'Reference implementation for zero-query Rust crate',
    ],
    endpoints: {
      queries: 'POST /get-queries',
      health: 'GET /health',
    },
    availableQueries: queryList.map(q => q.queryName),
  });
});

app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Gilbert Queries Service');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Port: ${PORT}`);
  console.log(`📊 Queries: ${queryList.length}`);
  console.log(`🔑 Auth: Clerk JWT`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Available queries:');
  queryList.forEach(q => {
    console.log(`  • ${q.queryName}`);
  });
  console.log('');
  console.log('Ready to handle requests! 🎉');
});
