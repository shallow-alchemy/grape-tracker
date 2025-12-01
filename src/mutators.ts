import { type Transaction, type ReadonlyJSONValue } from '@rocicorp/zero';
import { type Schema } from '../schema';

export const createMutators = () => ({
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
      await tx.mutate.user.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
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
        available_labor_hours?: number | null;
        created_at: number;
        updated_at: number;
      }
    ) => {
      await tx.mutate.vineyard.insert(args);
    },
    update: async (
      tx: Transaction<Schema>,
      args: {
        id: string;
        name?: string;
        location?: string;
        varieties?: ReadonlyJSONValue;
        available_labor_hours?: number | null;
        updated_at?: number;
      }
    ) => {
      await tx.mutate.vineyard.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
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
        training_method?: string | undefined;
        training_method_other?: string | undefined;
        created_at: number;
        updated_at: number;
      }
    ) => {
      await tx.mutate.block.insert(args);
    },
    update: async (
      tx: Transaction<Schema>,
      args: {
        id: string;
        name?: string;
        location?: string;
        size_acres?: number | undefined;
        soil_type?: string;
        notes?: string;
        training_method?: string | undefined;
        training_method_other?: string | undefined;
        updated_at?: number;
      }
    ) => {
      await tx.mutate.block.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
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
        training_method?: string | null;
        training_method_other?: string | null;
        created_at: number;
        updated_at: number;
      }
    ) => {
      await tx.mutate.vine.insert(args);
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
        training_method?: string | null;
        training_method_other?: string | null;
        updated_at?: number;
      }
    ) => {
      await tx.mutate.vine.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
      await tx.mutate.vine.delete(args);
    },
  },

  pruning_log: {
    insert: async (
      tx: Transaction<Schema>,
      args: {
        id: string;
        user_id: string;
        vine_id: string;
        date: number;
        pruning_type: string;
        spurs_left?: number | null;
        canes_before?: number | null;
        canes_after?: number | null;
        notes: string;
        photo_id?: string | null;
        created_at: number;
        updated_at: number;
      }
    ) => {
      await tx.mutate.pruning_log.insert(args);
    },
    update: async (
      tx: Transaction<Schema>,
      args: {
        id: string;
        vine_id?: string;
        date?: number;
        pruning_type?: string;
        spurs_left?: number | null;
        canes_before?: number | null;
        canes_after?: number | null;
        notes?: string;
        photo_id?: string | null;
        updated_at?: number;
      }
    ) => {
      await tx.mutate.pruning_log.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
      await tx.mutate.pruning_log.delete(args);
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
      await tx.mutate.vintage.insert(args);
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
      await tx.mutate.vintage.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
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
      await tx.mutate.wine.insert(args);
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
      await tx.mutate.wine.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
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
      await tx.mutate.stage_history.insert(args);
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
      await tx.mutate.stage_history.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
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
        is_archived: boolean;
        sort_order: number;
        created_at: number;
        updated_at: number;
      }
    ) => {
      await tx.mutate.task_template.insert(args);
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
        is_archived?: boolean;
        sort_order?: number;
        updated_at?: number;
      }
    ) => {
      await tx.mutate.task_template.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
      await tx.mutate.task_template.delete(args);
    },
  },

  stage: {
    insert: async (
      tx: Transaction<Schema>,
      args: {
        id: string;
        user_id: string;
        entity_type: string;
        value: string;
        label: string;
        description: string;
        sort_order: number;
        is_archived: boolean;
        is_default: boolean;
        applicability: ReadonlyJSONValue;
        created_at: number;
        updated_at: number;
      }
    ) => {
      await tx.mutate.stage.insert(args);
    },
    update: async (
      tx: Transaction<Schema>,
      args: {
        id: string;
        value?: string;
        label?: string;
        description?: string;
        sort_order?: number;
        is_archived?: boolean;
        applicability?: ReadonlyJSONValue;
        updated_at?: number;
      }
    ) => {
      await tx.mutate.stage.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
      await tx.mutate.stage.delete(args);
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
      await tx.mutate.task.insert(args);
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
      await tx.mutate.task.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
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
      await tx.mutate.measurement.insert(args);
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
      await tx.mutate.measurement.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
      await tx.mutate.measurement.delete(args);
    },
  },

  supply_template: {
    insert: async (
      tx: Transaction<Schema>,
      args: {
        id: string;
        user_id: string;
        task_template_id: string;
        name: string;
        quantity_formula?: string | null;
        quantity_fixed: number;
        lead_time_days: number;
        notes: string;
        is_archived: boolean;
        sort_order: number;
        created_at: number;
        updated_at: number;
      }
    ) => {
      await tx.mutate.supply_template.insert(args);
    },
    update: async (
      tx: Transaction<Schema>,
      args: {
        id: string;
        task_template_id?: string;
        name?: string;
        quantity_formula?: string | null;
        quantity_fixed?: number;
        lead_time_days?: number;
        notes?: string;
        is_archived?: boolean;
        sort_order?: number;
        updated_at?: number;
      }
    ) => {
      await tx.mutate.supply_template.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
      await tx.mutate.supply_template.delete(args);
    },
  },

  supply_instance: {
    insert: async (
      tx: Transaction<Schema>,
      args: {
        id: string;
        user_id: string;
        supply_template_id: string;
        task_id: string;
        entity_type: string;
        entity_id: string;
        calculated_quantity?: number | null;
        verified_at?: number | null;
        verified_by?: string | null;
        created_at: number;
        updated_at: number;
      }
    ) => {
      await tx.mutate.supply_instance.insert(args);
    },
    update: async (
      tx: Transaction<Schema>,
      args: {
        id: string;
        supply_template_id?: string;
        task_id?: string;
        entity_type?: string;
        entity_id?: string;
        calculated_quantity?: number | null;
        verified_at?: number | null;
        verified_by?: string | null;
        updated_at?: number;
      }
    ) => {
      await tx.mutate.supply_instance.update({ ...args, updated_at: Date.now() });
    },
    delete: async (tx: Transaction<Schema>, args: { id: string }) => {
      await tx.mutate.supply_instance.delete(args);
    },
  },
});

export type Mutators = ReturnType<typeof createMutators>;
