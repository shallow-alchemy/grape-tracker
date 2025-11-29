import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { renderHook, waitFor } from '@testing-library/react';
import { useVines, useBlocks, useVineyard, usePruningLogs } from './vineyard-hooks';

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}));

const mockVineData = [
  {
    id: 'vine-1',
    block: 'North Block',
    sequence_number: 1,
    variety: 'Cabernet Sauvignon',
    planting_date: new Date(),
    health: 'Good',
    notes: '',
    qr_generated: 0,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockBlockData = [
  {
    id: 'block-1',
    name: 'North Block',
    location: 'North',
    size_acres: 2,
    soil_type: 'Clay',
    notes: '',
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockVineyardData = [
  {
    id: 'vineyard-1',
    name: 'Test Vineyard',
    location: 'Test Location',
    varieties: ['Cabernet Sauvignon'],
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockPruningLogData = [
  {
    id: 'pruning-1',
    user_id: 'test-user-id',
    vine_id: 'vine-1',
    date: new Date('2024-01-15').getTime(),
    pruning_type: 'dormant',
    spurs_left: 8,
    canes_before: 12,
    canes_after: 6,
    notes: 'Winter pruning',
    created_at: new Date().getTime(),
    updated_at: new Date().getTime(),
  },
];

rs.mock('../contexts/ZeroContext', () => ({
  useZero: rs.fn(() => ({})),
}));

// Mock useQuery to return data based on the customQueryID set by createClientQuery
rs.mock('@rocicorp/zero/react', () => ({
  useQuery: rs.fn((query: any) => {
    const queryName = query?.customQueryID?.name;
    if (queryName === 'myVines') {
      return [mockVineData];
    }
    if (queryName === 'myBlocks') {
      return [mockBlockData];
    }
    if (queryName === 'myVineyards') {
      return [mockVineyardData];
    }
    if (queryName === 'myPruningLogsByVine') {
      return [mockPruningLogData];
    }
    return [[]];
  }),
}));

describe('vineyard-hooks', () => {
  afterEach(() => {
    rs.clearAllMocks();
  });

  describe('useVines', () => {
    test('returns vine data to caller', async () => {
      const { result } = renderHook(() => useVines());

      await waitFor(() => {
        expect(result.current).toHaveLength(1);
        expect(result.current[0].variety).toBe('Cabernet Sauvignon');
      });
    });

    test('returns empty array when no vines exist', async () => {
      const { useQuery } = require('@rocicorp/zero/react');
      useQuery.mockReturnValueOnce([[]]);

      const { result } = renderHook(() => useVines());

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });

    test.todo('updates when new vines are added');
  });

  describe('useBlocks', () => {
    test('returns block data to caller', async () => {
      const { result } = renderHook(() => useBlocks());

      await waitFor(() => {
        expect(result.current).toHaveLength(1);
        expect(result.current[0].name).toBe('North Block');
      });
    });

    test('returns empty array when no blocks exist', async () => {
      const { useQuery } = require('@rocicorp/zero/react');
      useQuery.mockReturnValueOnce([[]]);

      const { result } = renderHook(() => useBlocks());

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });

    test.todo('cleans up subscription on unmount');
  });

  describe('useVineyard', () => {
    test('returns vineyard data to caller', async () => {
      const { result } = renderHook(() => useVineyard());

      await waitFor(() => {
        expect(result.current).not.toBeNull();
        expect(result.current?.name).toBe('Test Vineyard');
      });
    });

    test('returns null when no vineyard exists', async () => {
      const { useQuery } = require('@rocicorp/zero/react');
      useQuery.mockReturnValueOnce([[]]);

      const { result } = renderHook(() => useVineyard());

      await waitFor(() => {
        expect(result.current).toBeNull();
      });
    });

    test.todo('cleans up subscription on unmount');
  });

  describe('usePruningLogs', () => {
    test('returns pruning log data for specified vine', async () => {
      const { result } = renderHook(() => usePruningLogs('vine-1'));

      await waitFor(() => {
        expect(result.current).toHaveLength(1);
        expect(result.current[0].pruning_type).toBe('dormant');
        expect(result.current[0].vine_id).toBe('vine-1');
      });
    });

    test('returns empty array when no pruning logs exist', async () => {
      const { useQuery } = require('@rocicorp/zero/react');
      useQuery.mockReturnValueOnce([[]]);

      const { result } = renderHook(() => usePruningLogs('vine-2'));

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });

    test('includes all pruning log fields', async () => {
      const { result } = renderHook(() => usePruningLogs('vine-1'));

      await waitFor(() => {
        const log = result.current[0];
        expect(log.id).toBe('pruning-1');
        expect(log.spurs_left).toBe(8);
        expect(log.canes_before).toBe(12);
        expect(log.canes_after).toBe(6);
        expect(log.notes).toBe('Winter pruning');
      });
    });

    test.todo('updates when new pruning logs are added');
  });
});
