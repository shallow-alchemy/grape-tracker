import { test, describe, expect, rs, beforeEach } from '@rstest/core';
import { createMutators } from './mutators';

// Mock transaction object
const createMockTx = () => ({
  mutate: {
    user: {
      insert: rs.fn(),
      update: rs.fn(),
      delete: rs.fn(),
    },
    vineyard: {
      insert: rs.fn(),
      update: rs.fn(),
      delete: rs.fn(),
    },
    block: {
      insert: rs.fn(),
      update: rs.fn(),
      delete: rs.fn(),
    },
    vine: {
      insert: rs.fn(),
      update: rs.fn(),
      delete: rs.fn(),
    },
    vintage: {
      insert: rs.fn(),
      update: rs.fn(),
      delete: rs.fn(),
    },
    wine: {
      insert: rs.fn(),
      update: rs.fn(),
      delete: rs.fn(),
    },
    stage_history: {
      insert: rs.fn(),
      update: rs.fn(),
      delete: rs.fn(),
    },
    task_template: {
      insert: rs.fn(),
      update: rs.fn(),
      delete: rs.fn(),
    },
    task: {
      insert: rs.fn(),
      update: rs.fn(),
      delete: rs.fn(),
    },
    measurement: {
      insert: rs.fn(),
      update: rs.fn(),
      delete: rs.fn(),
    },
  },
});

describe('Client Mutators', () => {
  let mockTx: ReturnType<typeof createMockTx>;
  let mutators: ReturnType<typeof createMutators>;

  beforeEach(() => {
    mockTx = createMockTx();
    mutators = createMutators();
  });

  describe('user mutators', () => {
    test('insert calls tx.mutate.user.insert with args', async () => {
      const args = {
        id: 'user-1',
        email: 'test@example.com',
        display_name: 'Test User',
        role: 'user',
        onboarding_completed: false,
        created_at: 1000,
        updated_at: 1000,
      };

      await mutators.user.insert(mockTx as any, args);

      expect(mockTx.mutate.user.insert).toHaveBeenCalledWith(args);
    });

    test('update calls tx.mutate.user.update with updated_at', async () => {
      const now = Date.now();
      const args = { id: 'user-1', display_name: 'New Name' };

      await mutators.user.update(mockTx as any, args);

      expect(mockTx.mutate.user.update).toHaveBeenCalled();
      const calledArgs = (mockTx.mutate.user.update as any).mock.calls[0][0];
      expect(calledArgs.id).toBe('user-1');
      expect(calledArgs.display_name).toBe('New Name');
      expect(calledArgs.updated_at).toBeGreaterThanOrEqual(now);
    });

    test('delete calls tx.mutate.user.delete with args', async () => {
      const args = { id: 'user-1' };

      await mutators.user.delete(mockTx as any, args);

      expect(mockTx.mutate.user.delete).toHaveBeenCalledWith(args);
    });
  });

  describe('vineyard mutators', () => {
    test('insert calls tx.mutate.vineyard.insert with args', async () => {
      const args = {
        id: 'vineyard-1',
        user_id: 'user-1',
        name: 'Test Vineyard',
        location: '37.0, -122.0',
        varieties: ['CABERNET'],
        created_at: 1000,
        updated_at: 1000,
      };

      await mutators.vineyard.insert(mockTx as any, args);

      expect(mockTx.mutate.vineyard.insert).toHaveBeenCalledWith(args);
    });

    test('update sets updated_at automatically', async () => {
      const now = Date.now();
      const args = { id: 'vineyard-1', name: 'Updated Name' };

      await mutators.vineyard.update(mockTx as any, args);

      const calledArgs = (mockTx.mutate.vineyard.update as any).mock.calls[0][0];
      expect(calledArgs.updated_at).toBeGreaterThanOrEqual(now);
    });
  });

  describe('vine mutators', () => {
    test('insert calls tx.mutate.vine.insert with args', async () => {
      const args = {
        id: 'vine-1',
        user_id: 'user-1',
        block: 'block-1',
        sequence_number: 1,
        variety: 'CABERNET',
        planting_date: 1000,
        health: 'GOOD',
        notes: '',
        qr_generated: 0,
        created_at: 1000,
        updated_at: 1000,
      };

      await mutators.vine.insert(mockTx as any, args);

      expect(mockTx.mutate.vine.insert).toHaveBeenCalledWith(args);
    });

    test('update sets updated_at automatically', async () => {
      const now = Date.now();
      const args = { id: 'vine-1', health: 'FAIR' };

      await mutators.vine.update(mockTx as any, args);

      const calledArgs = (mockTx.mutate.vine.update as any).mock.calls[0][0];
      expect(calledArgs.updated_at).toBeGreaterThanOrEqual(now);
    });

    test('delete calls tx.mutate.vine.delete with args', async () => {
      const args = { id: 'vine-1' };

      await mutators.vine.delete(mockTx as any, args);

      expect(mockTx.mutate.vine.delete).toHaveBeenCalledWith(args);
    });
  });

  describe('vintage mutators', () => {
    test('insert calls tx.mutate.vintage.insert with args', async () => {
      const args = {
        id: 'vintage-1',
        user_id: 'user-1',
        vineyard_id: 'vineyard-1',
        vintage_year: 2024,
        variety: 'CABERNET',
        block_ids: [],
        current_stage: 'harvest',
        harvest_date: 1000,
        grape_source: 'estate',
        notes: '',
        created_at: 1000,
        updated_at: 1000,
      };

      await mutators.vintage.insert(mockTx as any, args);

      expect(mockTx.mutate.vintage.insert).toHaveBeenCalledWith(args);
    });
  });

  describe('wine mutators', () => {
    test('insert calls tx.mutate.wine.insert with args', async () => {
      const args = {
        id: 'wine-1',
        user_id: 'user-1',
        vintage_id: 'vintage-1',
        vineyard_id: 'vineyard-1',
        name: 'Test Wine',
        wine_type: 'red',
        volume_gallons: 10,
        current_volume_gallons: 10,
        current_stage: 'crush',
        status: 'active',
        last_tasting_notes: '',
        blend_components: [],
        created_at: 1000,
        updated_at: 1000,
      };

      await mutators.wine.insert(mockTx as any, args);

      expect(mockTx.mutate.wine.insert).toHaveBeenCalledWith(args);
    });
  });

  describe('measurement mutators', () => {
    test('insert calls tx.mutate.measurement.insert with args', async () => {
      const args = {
        id: 'measurement-1',
        user_id: 'user-1',
        entity_type: 'wine',
        entity_id: 'wine-1',
        date: 1000,
        stage: 'crush',
        ph: 3.5,
        ta: 6.0,
        brix: 24,
        tasting_notes: '',
        notes: '',
        created_at: 1000,
        updated_at: 1000,
      };

      await mutators.measurement.insert(mockTx as any, args);

      expect(mockTx.mutate.measurement.insert).toHaveBeenCalledWith(args);
    });
  });
});
