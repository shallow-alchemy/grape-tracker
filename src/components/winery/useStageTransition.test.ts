import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { renderHook, waitFor } from '@testing-library/react';
import { useStageTransition } from './useStageTransition';

// Mock dependencies
const mockStageHistoryRun = rs.fn();
const mockStageHistoryUpdate = rs.fn().mockResolvedValue(undefined);
const mockStageHistoryInsert = rs.fn().mockResolvedValue(undefined);
const mockWineUpdate = rs.fn().mockResolvedValue(undefined);
const mockVintageUpdate = rs.fn().mockResolvedValue(undefined);
const mockTaskTemplateRun = rs.fn();
const mockTaskInsert = rs.fn().mockResolvedValue(undefined);

rs.mock('./taskHelpers', () => ({
  calculateDueDate: (baseTime: number) => baseTime + 86400000, // Add 1 day
}));

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    query: {
      stage_history: {
        where: rs.fn().mockReturnThis(),
        run: mockStageHistoryRun,
      },
      task_template: {
        run: mockTaskTemplateRun,
      },
    },
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
    mockStageHistoryRun.mockClear();
    mockStageHistoryUpdate.mockClear();
    mockStageHistoryInsert.mockClear();
    mockWineUpdate.mockClear();
    mockVintageUpdate.mockClear();
    mockTaskTemplateRun.mockClear();
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
      const currentStageHistory = [
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

      mockStageHistoryRun.mockResolvedValue(currentStageHistory);
      mockTaskTemplateRun.mockResolvedValue([]);

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
      const currentStageHistory = [
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

      mockStageHistoryRun.mockResolvedValue(currentStageHistory);
      mockTaskTemplateRun.mockResolvedValue([]);

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
      mockStageHistoryRun.mockResolvedValue([]);
      mockTaskTemplateRun.mockResolvedValue([]);

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
      mockStageHistoryRun.mockResolvedValue([]);
      mockTaskTemplateRun.mockResolvedValue([]);

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
      mockStageHistoryRun.mockResolvedValue([]);
      const templates = [
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
      mockTaskTemplateRun.mockResolvedValue(templates);

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
      mockStageHistoryRun.mockResolvedValue([]);
      const templates = [
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
      mockTaskTemplateRun.mockResolvedValue(templates);

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
      mockStageHistoryRun.mockResolvedValue([]);
      const templates = [
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
      mockTaskTemplateRun.mockResolvedValue(templates);

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
      mockStageHistoryRun.mockResolvedValue([]);
      const templates = [
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
      mockTaskTemplateRun.mockResolvedValue(templates);

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
    test('returns error result when stage history update fails', async () => {
      mockStageHistoryRun.mockRejectedValue(new Error('Database error'));

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
      mockStageHistoryRun.mockRejectedValue(new Error('Network error'));

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
      let resolveStageHistory: (value: any) => void;
      const stageHistoryPromise = new Promise((resolve) => {
        resolveStageHistory = resolve;
      });
      mockStageHistoryRun.mockReturnValue(stageHistoryPromise);

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
      resolveStageHistory!([]);
      mockTaskTemplateRun.mockResolvedValue([]);
      await promise;

      // Should not be loading after completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
