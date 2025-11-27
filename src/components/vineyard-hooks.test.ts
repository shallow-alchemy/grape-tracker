import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { renderHook, waitFor } from '@testing-library/react';
import { useVines, useBlocks, useVineyard } from './vineyard-hooks';

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
});
