import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { renderHook, waitFor } from '@testing-library/react';
import { useVines, useBlocks, useVineyard } from './vineyard-hooks';

const createMockZero = () => {
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

  return {
    query: {
      vine: {
        run: rs.fn().mockResolvedValue(mockVineData),
        subscribe: rs.fn(),
      },
      block: {
        run: rs.fn().mockResolvedValue(mockBlockData),
        subscribe: rs.fn(),
      },
      vineyard: {
        run: rs.fn().mockResolvedValue(mockVineyardData),
        subscribe: rs.fn(),
      },
    },
  };
};

rs.mock('../contexts/ZeroContext', () => ({
  useZero: rs.fn(() => createMockZero()),
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
      const { useZero } = require('../contexts/ZeroContext');
      const mockZero = createMockZero();
      mockZero.query.vine.subscribe = rs.fn((callback) => {
        callback([]);
        return rs.fn();
      });
      useZero.mockReturnValue(mockZero);

      const { result } = renderHook(() => useVines());

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });

    test.todo('updates when new vines are added', async () => {
      const { useZero } = require('../contexts/ZeroContext');
      const mockZero = createMockZero();
      let subscribeCallback: any = null;

      mockZero.query.vine.subscribe = rs.fn((callback) => {
        subscribeCallback = callback;
        callback([]);
        return rs.fn();
      });
      useZero.mockReturnValue(mockZero);

      const { result } = renderHook(() => useVines());

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });

      const newVine = {
        id: 'vine-2',
        block: 'South Block',
        sequence_number: 2,
        variety: 'Pinot Noir',
        planting_date: new Date(),
        health: 'Good',
        notes: '',
        qr_generated: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      if (subscribeCallback) {
        subscribeCallback([newVine]);
      }

      await waitFor(() => {
        expect(result.current).toHaveLength(1);
        expect(result.current[0].variety).toBe('Pinot Noir');
      });
    });

    test.todo('cleans up subscription on unmount', () => {
      const { useZero } = require('../contexts/ZeroContext');
      const mockZero = createMockZero();
      const unsubscribe = rs.fn();
      mockZero.query.vine.subscribe = rs.fn(() => unsubscribe);
      useZero.mockReturnValue(mockZero);

      const { unmount } = renderHook(() => useVines());

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
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
      const { useZero } = require('../contexts/ZeroContext');
      const mockZero = createMockZero();
      mockZero.query.block.subscribe = rs.fn((callback) => {
        callback([]);
        return rs.fn();
      });
      useZero.mockReturnValue(mockZero);

      const { result } = renderHook(() => useBlocks());

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });

    test.todo('cleans up subscription on unmount', () => {
      const { useZero } = require('../contexts/ZeroContext');
      const mockZero = createMockZero();
      const unsubscribe = rs.fn();
      mockZero.query.block.subscribe = rs.fn(() => unsubscribe);
      useZero.mockReturnValue(mockZero);

      const { unmount } = renderHook(() => useBlocks());

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
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
      const { useZero } = require('../contexts/ZeroContext');
      const mockZero = createMockZero();
      mockZero.query.vineyard.subscribe = rs.fn((callback) => {
        callback([]);
        return rs.fn();
      });
      useZero.mockReturnValue(mockZero);

      const { result } = renderHook(() => useVineyard());

      await waitFor(() => {
        expect(result.current).toBeNull();
      });
    });

    test.todo('cleans up subscription on unmount', () => {
      const { useZero } = require('../contexts/ZeroContext');
      const mockZero = createMockZero();
      const unsubscribe = rs.fn();
      mockZero.query.vineyard.subscribe = rs.fn(() => unsubscribe);
      useZero.mockReturnValue(mockZero);

      const { unmount } = renderHook(() => useVineyard());

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
