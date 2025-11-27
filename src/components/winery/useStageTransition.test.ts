import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { renderHook, waitFor } from '@testing-library/react';
import { useStageTransition } from './useStageTransition';

// Mock dependencies
const mockStageHistoryUpdate = rs.fn().mockResolvedValue(undefined);
const mockStageHistoryInsert = rs.fn().mockResolvedValue(undefined);
const mockWineUpdate = rs.fn().mockResolvedValue(undefined);
const mockVintageUpdate = rs.fn().mockResolvedValue(undefined);
const mockTaskInsert = rs.fn().mockResolvedValue(undefined);

// Mock data that will be returned by useQuery
let mockStageHistoryData: any[] = [];
let mockTemplatesData: any[] = [];

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-123',
    },
  }),
}));

rs.mock('./taskHelpers', () => ({
  calculateDueDate: (baseTime: number) => baseTime + 86400000, // Add 1 day
}));

// Mock queries to return objects with customQueryID for useQuery pattern
rs.mock('../../shared/queries', () => ({
  myStageHistoryByEntity: () => ({ customQueryID: { name: 'myStageHistoryByEntity' } }),
  taskTemplates: () => ({ customQueryID: { name: 'taskTemplates' } }),
}));

// Mock useQuery to return reactive data based on query name
rs.mock('@rocicorp/zero/react', () => ({
  useQuery: (query: any) => {
    const queryName = query?.customQueryID?.name;
    if (queryName === 'myStageHistoryByEntity') {
      return [mockStageHistoryData];
    }
    if (queryName === 'taskTemplates') {
      return [mockTemplatesData];
    }
    return [[]];
  },
}));

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    mutate: {
      stage_history: {
        update: mockStageHistoryUpdate,
        insert: mockStageHistoryInsert,
      },
      wine: {
        update: mockWineUpdate,
      },
      vintage: {
        update: mockVintageUpdate,
      },
      task: {
        insert: mockTaskInsert,
      },
    },
  }),
}));

describe('useStageTransition', () => {
  afterEach(() => {
    mockStageHistoryData = [];
    mockTemplatesData = [];
    mockStageHistoryUpdate.mockClear();
    mockStageHistoryInsert.mockClear();
    mockWineUpdate.mockClear();
    mockVintageUpdate.mockClear();
    mockTaskInsert.mockClear();
  });

  describe('hook initialization', () => {
    test('returns advanceStage function and initial state', () => {
      const { result } = renderHook(() => useStageTransition('wine', 'wine-1'));

      expect(result.current.advanceStage).toBeInstanceOf(Function);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('advanceStage for wine', () => {
    test('completes current stage and creates new stage', async () => {
      mockStageHistoryData = [
        {
          id: 'history-1',
          entity_type: 'wine',
          entity_id: 'wine-1',
          stage: 'crush',
          started_at: Date.now() - 1000000,
          completed_at: null,
          skipped: false,
        },
      ];
      mockTemplatesData = [];

      const { result } = renderHook(() => useStageTransition('wine', 'wine-1'));

      const response = await result.current.advanceStage('crush', {
        toStage: 'primary_fermentation',
        notes: 'Test notes',
        skipCurrentStage: false,
      });

      expect(response.success).toBe(true);
      expect(mockStageHistoryUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'history-1',
          completed_at: expect.any(Number),
          skipped: false,
          notes: 'Test notes',
        })
      );
      expect(mockStageHistoryInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'wine',
          entity_id: 'wine-1',
          stage: 'primary_fermentation',
          notes: '',
        })
      );
      expect(mockWineUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wine-1',
          current_stage: 'primary_fermentation',
        })
      );
    });

    test('marks stage as skipped when skipCurrentStage is true', async () => {
      mockStageHistoryData = [
        {
          id: 'history-1',
          entity_type: 'wine',
          entity_id: 'wine-1',
          stage: 'crush',
          started_at: Date.now() - 1000000,
          completed_at: null,
          skipped: false,
        },
      ];
      mockTemplatesData = [];

      const { result } = renderHook(() => useStageTransition('wine', 'wine-1'));

      await result.current.advanceStage('crush', {
        toStage: 'primary_fermentation',
        notes: '',
        skipCurrentStage: true,
      });

      expect(mockStageHistoryUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          skipped: true,
        })
      );
    });

    test('handles case where no current stage history exists', async () => {
      mockStageHistoryData = [];
      mockTemplatesData = [];

      const { result } = renderHook(() => useStageTransition('wine', 'wine-1'));

      const response = await result.current.advanceStage('crush', {
        toStage: 'primary_fermentation',
        notes: '',
        skipCurrentStage: false,
      });

      expect(response.success).toBe(true);
      expect(mockStageHistoryUpdate).not.toHaveBeenCalled();
      expect(mockStageHistoryInsert).toHaveBeenCalled();
    });
  });

  describe('advanceStage for vintage', () => {
    test('updates vintage current_stage instead of wine', async () => {
      mockStageHistoryData = [];
      mockTemplatesData = [];

      const { result } = renderHook(() => useStageTransition('vintage', 'vintage-1'));

      await result.current.advanceStage('harvested', {
        toStage: 'allocated',
        notes: '',
        skipCurrentStage: false,
      });

      expect(mockVintageUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'vintage-1',
          current_stage: 'allocated',
        })
      );
      expect(mockWineUpdate).not.toHaveBeenCalled();
    });
  });

  describe('task creation from templates', () => {
    test('creates tasks from matching templates', async () => {
      mockStageHistoryData = [];
      mockTemplatesData = [
        {
          id: 'template-1',
          stage: 'primary_fermentation',
          entity_type: 'wine',
          wine_type: null,
          name: 'Check temperature',
          description: 'Monitor fermentation temp',
          frequency: 'daily',
          frequency_count: 1,
          default_enabled: true,
        },
        {
          id: 'template-2',
          stage: 'primary_fermentation',
          entity_type: 'wine',
          wine_type: null,
          name: 'Take gravity reading',
          description: 'Measure specific gravity',
          frequency: 'weekly',
          frequency_count: 1,
          default_enabled: true,
        },
      ];

      const { result } = renderHook(() => useStageTransition('wine', 'wine-1'));

      const response = await result.current.advanceStage('crush', {
        toStage: 'primary_fermentation',
        notes: '',
        skipCurrentStage: false,
      });

      expect(response.tasksCreated).toBe(2);
      expect(mockTaskInsert).toHaveBeenCalledTimes(2);
    });

    test('filters templates by entity type', async () => {
      mockStageHistoryData = [];
      mockTemplatesData = [
        {
          id: 'template-1',
          stage: 'primary_fermentation',
          entity_type: 'wine',
          wine_type: null,
          name: 'Wine task',
          description: '',
          frequency: 'once',
          frequency_count: 1,
          default_enabled: true,
        },
        {
          id: 'template-2',
          stage: 'primary_fermentation',
          entity_type: 'vintage',
          wine_type: null,
          name: 'Vintage task',
          description: '',
          frequency: 'once',
          frequency_count: 1,
          default_enabled: true,
        },
      ];

      const { result } = renderHook(() => useStageTransition('wine', 'wine-1'));

      const response = await result.current.advanceStage('crush', {
        toStage: 'primary_fermentation',
        notes: '',
        skipCurrentStage: false,
      });

      expect(response.tasksCreated).toBe(1);
      expect(mockTaskInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wine task',
        })
      );
    });

    test('filters templates by wine type when provided', async () => {
      mockStageHistoryData = [];
      mockTemplatesData = [
        {
          id: 'template-1',
          stage: 'primary_fermentation',
          entity_type: 'wine',
          wine_type: 'red',
          name: 'Red wine task',
          description: '',
          frequency: 'once',
          frequency_count: 1,
          default_enabled: true,
        },
        {
          id: 'template-2',
          stage: 'primary_fermentation',
          entity_type: 'wine',
          wine_type: 'white',
          name: 'White wine task',
          description: '',
          frequency: 'once',
          frequency_count: 1,
          default_enabled: true,
        },
      ];

      const { result } = renderHook(() => useStageTransition('wine', 'wine-1', 'red'));

      const response = await result.current.advanceStage('crush', {
        toStage: 'primary_fermentation',
        notes: '',
        skipCurrentStage: false,
      });

      expect(response.tasksCreated).toBe(1);
      expect(mockTaskInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Red wine task',
        })
      );
    });

    test('skips disabled templates', async () => {
      mockStageHistoryData = [];
      mockTemplatesData = [
        {
          id: 'template-1',
          stage: 'primary_fermentation',
          entity_type: 'wine',
          wine_type: null,
          name: 'Enabled task',
          description: '',
          frequency: 'once',
          frequency_count: 1,
          default_enabled: true,
        },
        {
          id: 'template-2',
          stage: 'primary_fermentation',
          entity_type: 'wine',
          wine_type: null,
          name: 'Disabled task',
          description: '',
          frequency: 'once',
          frequency_count: 1,
          default_enabled: false,
        },
      ];

      const { result } = renderHook(() => useStageTransition('wine', 'wine-1'));

      const response = await result.current.advanceStage('crush', {
        toStage: 'primary_fermentation',
        notes: '',
        skipCurrentStage: false,
      });

      expect(response.tasksCreated).toBe(1);
    });
  });

  describe('error handling', () => {
    test('returns error result when mutation fails', async () => {
      mockStageHistoryData = [];
      mockTemplatesData = [];
      mockStageHistoryInsert.mockRejectedValueOnce(new Error('Database error'));

      const { result } = renderHook(() => useStageTransition('wine', 'wine-1'));

      const response = await result.current.advanceStage('crush', {
        toStage: 'primary_fermentation',
        notes: '',
        skipCurrentStage: false,
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Database error');
    });

    test('sets error state when operation fails', async () => {
      mockStageHistoryData = [];
      mockTemplatesData = [];
      mockStageHistoryInsert.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useStageTransition('wine', 'wine-1'));

      await result.current.advanceStage('crush', {
        toStage: 'primary_fermentation',
        notes: '',
        skipCurrentStage: false,
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });

    test('sets loading state during operation', async () => {
      mockStageHistoryData = [];
      mockTemplatesData = [];

      let resolveInsert: () => void;
      const insertPromise = new Promise<void>((resolve) => {
        resolveInsert = resolve;
      });
      mockStageHistoryInsert.mockReturnValueOnce(insertPromise);

      const { result } = renderHook(() => useStageTransition('wine', 'wine-1'));

      const promise = result.current.advanceStage('crush', {
        toStage: 'primary_fermentation',
        notes: '',
        skipCurrentStage: false,
      });

      // Should be loading immediately
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      resolveInsert!();
      await promise;

      // Should not be loading after completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
