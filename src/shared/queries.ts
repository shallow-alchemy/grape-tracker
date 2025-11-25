// Synced queries - shared between frontend and queries-service
// These must match the definitions in queries-service/src/queries.ts

import { syncedQueryWithContext } from '@rocicorp/zero';
import { z } from 'zod';
import { builder } from '../../schema';

// Admin user ID from Clerk
const ADMIN_USER_ID = 'user_34zvb6YsnjkI4IFo9qDJyUXGQfK';

const ACTIVE_STAGES = [
  'crush',
  'primary_fermentation',
  'secondary_fermentation',
  'racking',
  'oaking',
  'aging',
];

export const activeWines = syncedQueryWithContext(
  'activeWines',
  z.tuple([]),
  (userID: string | undefined) => {
    // Client passes userID, server provides authenticated userID
    // Only return data for admin user
    if (userID !== ADMIN_USER_ID) {
      return builder.wine.where('id', '___never_match___');
    }
    // Return wines in active stages (not bottled)
    return builder.wine.where('current_stage', 'IN', ACTIVE_STAGES);
  }
);
