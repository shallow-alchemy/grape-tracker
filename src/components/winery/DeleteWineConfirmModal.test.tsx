import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteWineConfirmModal } from './DeleteWineConfirmModal';

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}));

// Mock dependencies
const mockStageHistoryDelete = rs.fn().mockResolvedValue(undefined);
const mockMeasurementDelete = rs.fn().mockResolvedValue(undefined);
const mockTaskDelete = rs.fn().mockResolvedValue(undefined);
const mockWineDelete = rs.fn().mockResolvedValue(undefined);

const mockWineData = [
  {
    id: 'wine-1',
    name: 'Cabernet Barrel 1',
    vintage_id: 'vintage-1',
  },
];

const mockVintageData = [
  {
    id: 'vintage-1',
    vintage_year: 2024,
    variety: 'Cabernet Sauvignon',
  },
];

const mockStageHistoryData = [
  { id: 'stage-1', entity_type: 'wine', entity_id: 'wine-1' },
  { id: 'stage-2', entity_type: 'wine', entity_id: 'wine-1' },
];

const mockMeasurementsData = [
  { id: 'measurement-1', entity_type: 'wine', entity_id: 'wine-1' },
];

const mockTasksData = [
  { id: 'task-1', entity_type: 'wine', entity_id: 'wine-1' },
  { id: 'task-2', entity_type: 'wine', entity_id: 'wine-1' },
];

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    query: {
      wine: {
        where: rs.fn().mockReturnThis(),
      },
      vintage: {
        where: rs.fn().mockReturnThis(),
      },
      stage_history: {
        where: rs.fn().mockReturnThis(),
      },
      measurement: {
        where: rs.fn().mockReturnThis(),
      },
      task: {
        where: rs.fn().mockReturnThis(),
      },
    },
    mutate: {
      stage_history: {
        delete: mockStageHistoryDelete,
      },
      measurement: {
        delete: mockMeasurementDelete,
      },
      task: {
        delete: mockTaskDelete,
      },
      wine: {
        delete: mockWineDelete,
      },
    },
  }),
}));

let queryCallCount = 0;
rs.mock('@rocicorp/zero/react', () => ({
  useQuery: rs.fn(() => {
    // Return different data based on call order
    const calls = [
      mockWineData,         // 1st call: wine data
      mockVintageData,      // 2nd call: vintage data
      mockStageHistoryData, // 3rd call: stage history
      mockMeasurementsData, // 4th call: measurements
      mockTasksData,        // 5th call: tasks
    ];
    const result = calls[queryCallCount % calls.length] || [[]];
    queryCallCount++;
    return [result];
  }),
}));

rs.mock('../Modal', () => ({
  Modal: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
      </div>
    );
  },
}));

describe('DeleteWineConfirmModal', () => {
  afterEach(() => {
    cleanup();
    mockStageHistoryDelete.mockClear();
    mockMeasurementDelete.mockClear();
    mockTaskDelete.mockClear();
    mockWineDelete.mockClear();
    queryCallCount = 0; // Reset query call count
  });

  describe('rendering', () => {
    test('does not render when closed', () => {
      render(
        <DeleteWineConfirmModal
          isOpen={false}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    test('renders when open', () => {
      render(
        <DeleteWineConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'DELETE WINE?' })).toBeInTheDocument();
    });

    test('shows wine name in confirmation message', () => {
      render(
        <DeleteWineConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      expect(screen.getByText(/2024 Cabernet Barrel 1/)).toBeInTheDocument();
    });

    test('displays count of related records to be deleted', () => {
      render(
        <DeleteWineConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      expect(screen.getByText(/2 stage history records/)).toBeInTheDocument();
      expect(screen.getByText(/1 measurement/)).toBeInTheDocument();
      expect(screen.getByText(/2 tasks/)).toBeInTheDocument();
    });

    test('shows warning message', () => {
      render(
        <DeleteWineConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });
  });

  describe('user actions', () => {
    test('calls onClose when cancel button clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = rs.fn();

      render(
        <DeleteWineConfirmModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'CANCEL' });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('deletes all related records when delete confirmed', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();
      const mockOnClose = rs.fn();

      render(
        <DeleteWineConfirmModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          wineId="wine-1"
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'DELETE WINE' });
      await user.click(deleteButton);

      // Wait for async operations
      await waitFor(() => {
        expect(mockStageHistoryDelete).toHaveBeenCalledTimes(2);
      });

      expect(mockMeasurementDelete).toHaveBeenCalledTimes(1);
      expect(mockTaskDelete).toHaveBeenCalledTimes(2);
      expect(mockWineDelete).toHaveBeenCalledWith({ id: 'wine-1' });
    });

    test('calls onSuccess with message after deletion', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <DeleteWineConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          wineId="wine-1"
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'DELETE WINE' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('2024 Cabernet Barrel 1 deleted successfully');
      });
    });
  });

  describe('loading state', () => {
    test('shows loading text on delete button while deleting', async () => {
      const user = userEvent.setup();

      // Make delete operations delay
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockWineDelete.mockReturnValue(deletePromise);

      render(
        <DeleteWineConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'DELETE WINE' });
      await user.click(deleteButton);

      expect(screen.getByRole('button', { name: 'DELETING...' })).toBeInTheDocument();

      // Clean up
      resolveDelete!();
      mockWineDelete.mockResolvedValue(undefined);
    });

    test('disables buttons while deleting', async () => {
      const user = userEvent.setup();

      // Make delete operations delay
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockWineDelete.mockReturnValue(deletePromise);

      render(
        <DeleteWineConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'DELETE WINE' });
      await user.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: 'CANCEL' });
      expect(cancelButton).toBeDisabled();
      expect(screen.getByRole('button', { name: 'DELETING...' })).toBeDisabled();

      // Clean up
      resolveDelete!();
      mockWineDelete.mockResolvedValue(undefined);
    });
  });

  describe('error handling', () => {
    test('displays error message when deletion fails', async () => {
      const user = userEvent.setup();
      mockWineDelete.mockRejectedValue(new Error('Network error'));

      render(
        <DeleteWineConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'DELETE WINE' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to delete wine. Please try again.')).toBeInTheDocument();
      });

      // Reset mock
      mockWineDelete.mockResolvedValue(undefined);
    });
  });
});
