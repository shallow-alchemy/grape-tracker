import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createMutators, type AuthData } from './mutators.js';

// Mock transaction object for client-side behavior (tx.location !== 'server')
const createMockClientTx = () => ({
  location: 'client' as const,
  mutate: {
    user: {
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    vineyard: {
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    block: {
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    vine: {
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    vintage: {
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    wine: {
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    stage_history: {
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    task_template: {
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    task: {
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    measurement: {
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
});

describe('Server Mutators - Auth Enforcement', () => {
  describe('requireAuth', () => {
    test('throws when authData is undefined', async () => {
      const mutators = createMutators(undefined);
      const mockTx = createMockClientTx();

      await expect(
        mutators.user.insert(mockTx as any, {
          id: 'user-1',
          email: 'test@example.com',
          display_name: 'Test',
          role: 'user',
          onboarding_completed: false,
          created_at: 1000,
          updated_at: 1000,
        })
      ).rejects.toThrow('Authentication required');
    });

    test('throws when authData.userID is empty', async () => {
      const mutators = createMutators({ userID: '' } as AuthData);
      const mockTx = createMockClientTx();

      await expect(
        mutators.vineyard.insert(mockTx as any, {
          id: 'vineyard-1',
          user_id: 'user-1',
          name: 'Test',
          location: '',
          varieties: [],
          created_at: 1000,
          updated_at: 1000,
        })
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('user mutations - self-only restriction', () => {
    test('user.insert throws when creating record for another user', async () => {
      const mutators = createMutators({ userID: 'user-1' });
      const mockTx = createMockClientTx();

      await expect(
        mutators.user.insert(mockTx as any, {
          id: 'user-2', // Different from authenticated user
          email: 'test@example.com',
          display_name: 'Test',
          role: 'user',
          onboarding_completed: false,
          created_at: 1000,
          updated_at: 1000,
        })
      ).rejects.toThrow('Cannot create user record for another user');
    });

    test('user.insert succeeds when creating own record', async () => {
      const mutators = createMutators({ userID: 'user-1' });
      const mockTx = createMockClientTx();

      await mutators.user.insert(mockTx as any, {
        id: 'user-1', // Same as authenticated user
        email: 'test@example.com',
        display_name: 'Test',
        role: 'user',
        onboarding_completed: false,
        created_at: 1000,
        updated_at: 1000,
      });

      expect(mockTx.mutate.user.insert).toHaveBeenCalled();
    });

    test('user.update throws when updating another user', async () => {
      const mutators = createMutators({ userID: 'user-1' });
      const mockTx = createMockClientTx();

      await expect(
        mutators.user.update(mockTx as any, {
          id: 'user-2', // Different user
          display_name: 'Hacked Name',
        })
      ).rejects.toThrow('Cannot update another user');
    });

    test('user.delete throws when deleting another user', async () => {
      const mutators = createMutators({ userID: 'user-1' });
      const mockTx = createMockClientTx();

      await expect(
        mutators.user.delete(mockTx as any, { id: 'user-2' })
      ).rejects.toThrow('Cannot delete another user');
    });
  });

  describe('entity mutations - user_id enforcement', () => {
    test('vineyard.insert enforces authenticated user_id', async () => {
      const mutators = createMutators({ userID: 'auth-user-123' });
      const mockTx = createMockClientTx();

      await mutators.vineyard.insert(mockTx as any, {
        id: 'vineyard-1',
        user_id: 'attacker-user', // Attacker tries to set different user_id
        name: 'Test Vineyard',
        location: '',
        varieties: [],
        created_at: 1000,
        updated_at: 1000,
      });

      // Should be called with the authenticated user's ID, not the attacker's
      expect(mockTx.mutate.vineyard.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'auth-user-123',
        })
      );
    });

    test('vine.insert enforces authenticated user_id', async () => {
      const mutators = createMutators({ userID: 'auth-user-123' });
      const mockTx = createMockClientTx();

      await mutators.vine.insert(mockTx as any, {
        id: 'vine-1',
        user_id: 'attacker-user',
        block: 'block-1',
        sequence_number: 1,
        variety: 'CABERNET',
        planting_date: 1000,
        health: 'GOOD',
        notes: '',
        qr_generated: 0,
        created_at: 1000,
        updated_at: 1000,
      });

      expect(mockTx.mutate.vine.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'auth-user-123',
        })
      );
    });

    test('block.insert enforces authenticated user_id', async () => {
      const mutators = createMutators({ userID: 'auth-user-123' });
      const mockTx = createMockClientTx();

      await mutators.block.insert(mockTx as any, {
        id: 'block-1',
        user_id: 'attacker-user',
        name: 'Block A',
        location: '',
        size_acres: 1,
        soil_type: 'clay',
        notes: '',
        created_at: 1000,
        updated_at: 1000,
      });

      expect(mockTx.mutate.block.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'auth-user-123',
        })
      );
    });

    test('vintage.insert enforces authenticated user_id', async () => {
      const mutators = createMutators({ userID: 'auth-user-123' });
      const mockTx = createMockClientTx();

      await mutators.vintage.insert(mockTx as any, {
        id: 'vintage-1',
        user_id: 'attacker-user',
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
      });

      expect(mockTx.mutate.vintage.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'auth-user-123',
        })
      );
    });

    test('wine.insert enforces authenticated user_id', async () => {
      const mutators = createMutators({ userID: 'auth-user-123' });
      const mockTx = createMockClientTx();

      await mutators.wine.insert(mockTx as any, {
        id: 'wine-1',
        user_id: 'attacker-user',
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
      });

      expect(mockTx.mutate.wine.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'auth-user-123',
        })
      );
    });

    test('measurement.insert enforces authenticated user_id', async () => {
      const mutators = createMutators({ userID: 'auth-user-123' });
      const mockTx = createMockClientTx();

      await mutators.measurement.insert(mockTx as any, {
        id: 'measurement-1',
        user_id: 'attacker-user',
        entity_type: 'wine',
        entity_id: 'wine-1',
        date: 1000,
        stage: 'crush',
        tasting_notes: '',
        notes: '',
        created_at: 1000,
        updated_at: 1000,
      });

      expect(mockTx.mutate.measurement.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'auth-user-123',
        })
      );
    });
  });
});
