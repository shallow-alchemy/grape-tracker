import { type Transaction, type ReadonlyJSONValue } from '@rocicorp/zero';
import { type Schema } from '../schema.js';

// Auth data passed from request context
export type AuthData = {
  userID: string;
} | undefined;

// Helper to verify ownership - returns the row if owned by user, throws if not
const verifyOwnership = async <T extends { user_id: string }>(
  tx: Transaction<Schema>,
  table: string,
  id: string,
  userID: string
): Promise<T> => {
  // Use raw SQL query on server transaction to check ownership
  if (tx.location === 'server') {
    const result = await tx.dbTransaction.query(
      `SELECT * FROM "${table}" WHERE id = $1`,
      [id]
    );
    const rows = Array.from(result);
    if (rows.length === 0) {
      throw new Error(`${table} not found`);
    }
    const row = rows[0] as T;
    if (row.user_id !== userID) {
      throw new Error(`Access denied to ${table}`);
    }
    return row;
  }
  // On client, just return a placeholder - server will validate
  return { user_id: userID } as T;
};

// Creates mutators with auth context
// Server mutators enforce user ownership and validate data
export const createMutators = (authData: AuthData) => {
  const requireAuth = () => {
    if (!authData?.userID) {
      throw new Error('Authentication required');
    }
    return authData.userID;
  };

  return {
    user: {
      insert: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          email: string;
          display_name: string;
          vineyard_id?: string | null;
          role: string;
          onboarding_completed: boolean;
          created_at: number;
          updated_at: number;
        }
      ) => {
        const userID = requireAuth();
        // Users can only create their own user record
        if (args.id !== userID) {
          throw new Error('Cannot create user record for another user');
        }
        await tx.mutate.user.insert(args);
      },
      update: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          email?: string;
          display_name?: string;
          vineyard_id?: string | null;
          role?: string;
          onboarding_completed?: boolean;
          updated_at?: number;
        }
      ) => {
        const userID = requireAuth();
        // Users can only update their own record
        if (args.id !== userID) {
          throw new Error('Cannot update another user');
        }
        await tx.mutate.user.update({
          ...args,
          updated_at: Date.now(),
        });
      },
      delete: async (
        tx: Transaction<Schema>,
        args: { id: string }
      ) => {
        const userID = requireAuth();
        if (args.id !== userID) {
          throw new Error('Cannot delete another user');
        }
        await tx.mutate.user.delete(args);
      },
    },

    vineyard: {
      insert: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          user_id: string;
          name: string;
          location: string;
          varieties: ReadonlyJSONValue;
          created_at: number;
          updated_at: number;
        }
      ) => {
        const userID = requireAuth();
        // Server enforces the user_id, ignoring client-provided value
        await tx.mutate.vineyard.insert({
          ...args,
          user_id: userID,
        });
      },
      update: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          name?: string;
          location?: string;
          varieties?: ReadonlyJSONValue;
          updated_at?: number;
        }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'vineyard', args.id, userID);
        await tx.mutate.vineyard.update({
          ...args,
          updated_at: Date.now(),
        });
      },
      delete: async (
        tx: Transaction<Schema>,
        args: { id: string }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'vineyard', args.id, userID);
        await tx.mutate.vineyard.delete(args);
      },
    },

    block: {
      insert: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          user_id: string;
          name: string;
          location: string;
          size_acres: number;
          soil_type: string;
          notes: string;
          created_at: number;
          updated_at: number;
        }
      ) => {
        const userID = requireAuth();
        await tx.mutate.block.insert({
          ...args,
          user_id: userID,
        });
      },
      update: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          name?: string;
          location?: string;
          size_acres?: number;
          soil_type?: string;
          notes?: string;
          updated_at?: number;
        }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'block', args.id, userID);
        await tx.mutate.block.update({
          ...args,
          updated_at: Date.now(),
        });
      },
      delete: async (
        tx: Transaction<Schema>,
        args: { id: string }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'block', args.id, userID);
        await tx.mutate.block.delete(args);
      },
    },

    vine: {
      insert: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          user_id: string;
          block: string;
          sequence_number: number;
          variety: string;
          planting_date: number;
          health: string;
          notes: string;
          qr_generated: number;
          created_at: number;
          updated_at: number;
        }
      ) => {
        const userID = requireAuth();
        await tx.mutate.vine.insert({
          ...args,
          user_id: userID,
        });
      },
      update: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          block?: string;
          sequence_number?: number;
          variety?: string;
          planting_date?: number;
          health?: string;
          notes?: string;
          qr_generated?: number;
          updated_at?: number;
        }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'vine', args.id, userID);
        await tx.mutate.vine.update({
          ...args,
          updated_at: Date.now(),
        });
      },
      delete: async (
        tx: Transaction<Schema>,
        args: { id: string }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'vine', args.id, userID);
        await tx.mutate.vine.delete(args);
      },
    },

    vintage: {
      insert: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          user_id: string;
          vineyard_id: string;
          vintage_year: number;
          variety: string;
          block_ids: ReadonlyJSONValue;
          current_stage: string;
          harvest_date: number;
          harvest_weight_lbs?: number | null;
          harvest_volume_gallons?: number | null;
          grape_source: string;
          supplier_name?: string | null;
          notes: string;
          created_at: number;
          updated_at: number;
        }
      ) => {
        const userID = requireAuth();
        await tx.mutate.vintage.insert({
          ...args,
          user_id: userID,
        });
      },
      update: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          vineyard_id?: string;
          vintage_year?: number;
          variety?: string;
          block_ids?: ReadonlyJSONValue;
          current_stage?: string;
          harvest_date?: number;
          harvest_weight_lbs?: number | null;
          harvest_volume_gallons?: number | null;
          grape_source?: string;
          supplier_name?: string | null;
          notes?: string;
          updated_at?: number;
        }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'vintage', args.id, userID);
        await tx.mutate.vintage.update({
          ...args,
          updated_at: Date.now(),
        });
      },
      delete: async (
        tx: Transaction<Schema>,
        args: { id: string }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'vintage', args.id, userID);
        await tx.mutate.vintage.delete(args);
      },
    },

    wine: {
      insert: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          user_id: string;
          vintage_id: string;
          vineyard_id: string;
          name: string;
          wine_type: string;
          volume_gallons: number;
          current_volume_gallons: number;
          current_stage: string;
          status: string;
          last_tasting_notes: string;
          blend_components: ReadonlyJSONValue;
          created_at: number;
          updated_at: number;
        }
      ) => {
        const userID = requireAuth();
        await tx.mutate.wine.insert({
          ...args,
          user_id: userID,
        });
      },
      update: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          vintage_id?: string;
          vineyard_id?: string;
          name?: string;
          wine_type?: string;
          volume_gallons?: number;
          current_volume_gallons?: number;
          current_stage?: string;
          status?: string;
          last_tasting_notes?: string;
          blend_components?: ReadonlyJSONValue;
          updated_at?: number;
        }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'wine', args.id, userID);
        await tx.mutate.wine.update({
          ...args,
          updated_at: Date.now(),
        });
      },
      delete: async (
        tx: Transaction<Schema>,
        args: { id: string }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'wine', args.id, userID);
        await tx.mutate.wine.delete(args);
      },
    },

    stage_history: {
      insert: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          user_id: string;
          entity_type: string;
          entity_id: string;
          stage: string;
          started_at: number;
          completed_at?: number | null;
          skipped: boolean;
          notes: string;
          created_at: number;
          updated_at: number;
        }
      ) => {
        const userID = requireAuth();
        await tx.mutate.stage_history.insert({
          ...args,
          user_id: userID,
        });
      },
      update: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          entity_type?: string;
          entity_id?: string;
          stage?: string;
          started_at?: number;
          completed_at?: number | null;
          skipped?: boolean;
          notes?: string;
          updated_at?: number;
        }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'stage_history', args.id, userID);
        await tx.mutate.stage_history.update({
          ...args,
          updated_at: Date.now(),
        });
      },
      delete: async (
        tx: Transaction<Schema>,
        args: { id: string }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'stage_history', args.id, userID);
        await tx.mutate.stage_history.delete(args);
      },
    },

    task_template: {
      insert: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          user_id: string;
          vineyard_id: string;
          stage: string;
          entity_type: string;
          wine_type: string;
          name: string;
          description: string;
          frequency: string;
          frequency_count: number;
          frequency_unit: string;
          default_enabled: boolean;
          sort_order: number;
          created_at: number;
          updated_at: number;
        }
      ) => {
        const userID = requireAuth();
        await tx.mutate.task_template.insert({
          ...args,
          user_id: userID,
        });
      },
      update: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          vineyard_id?: string;
          stage?: string;
          entity_type?: string;
          wine_type?: string;
          name?: string;
          description?: string;
          frequency?: string;
          frequency_count?: number;
          frequency_unit?: string;
          default_enabled?: boolean;
          sort_order?: number;
          updated_at?: number;
        }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'task_template', args.id, userID);
        await tx.mutate.task_template.update({
          ...args,
          updated_at: Date.now(),
        });
      },
      delete: async (
        tx: Transaction<Schema>,
        args: { id: string }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'task_template', args.id, userID);
        await tx.mutate.task_template.delete(args);
      },
    },

    task: {
      insert: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          user_id: string;
          task_template_id: string;
          entity_type: string;
          entity_id: string;
          stage: string;
          name: string;
          description: string;
          due_date: number;
          completed_at: number;
          completed_by: string;
          notes: string;
          skipped: boolean;
          created_at: number;
          updated_at: number;
        }
      ) => {
        const userID = requireAuth();
        await tx.mutate.task.insert({
          ...args,
          user_id: userID,
        });
      },
      update: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          task_template_id?: string;
          entity_type?: string;
          entity_id?: string;
          stage?: string;
          name?: string;
          description?: string;
          due_date?: number;
          completed_at?: number;
          completed_by?: string;
          notes?: string;
          skipped?: boolean;
          updated_at?: number;
        }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'task', args.id, userID);
        await tx.mutate.task.update({
          ...args,
          updated_at: Date.now(),
        });
      },
      delete: async (
        tx: Transaction<Schema>,
        args: { id: string }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'task', args.id, userID);
        await tx.mutate.task.delete(args);
      },
    },

    measurement: {
      insert: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          user_id: string;
          entity_type: string;
          entity_id: string;
          date: number;
          stage: string;
          ph?: number | null;
          ta?: number | null;
          brix?: number | null;
          temperature?: number | null;
          tasting_notes: string;
          notes: string;
          created_at: number;
          updated_at: number;
        }
      ) => {
        const userID = requireAuth();
        await tx.mutate.measurement.insert({
          ...args,
          user_id: userID,
        });
      },
      update: async (
        tx: Transaction<Schema>,
        args: {
          id: string;
          entity_type?: string;
          entity_id?: string;
          date?: number;
          stage?: string;
          ph?: number | null;
          ta?: number | null;
          brix?: number | null;
          temperature?: number | null;
          tasting_notes?: string;
          notes?: string;
          updated_at?: number;
        }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'measurement', args.id, userID);
        await tx.mutate.measurement.update({
          ...args,
          updated_at: Date.now(),
        });
      },
      delete: async (
        tx: Transaction<Schema>,
        args: { id: string }
      ) => {
        const userID = requireAuth();
        await verifyOwnership(tx, 'measurement', args.id, userID);
        await tx.mutate.measurement.delete(args);
      },
    },

    // measurement_range is read-only (no mutations allowed per schema)
  } as const;
};

export type Mutators = ReturnType<typeof createMutators>;
