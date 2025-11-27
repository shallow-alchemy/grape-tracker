import { test, describe, expect, rs, afterEach, beforeEach } from '@rstest/core';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteVintageConfirmModal } from './DeleteVintageConfirmModal';

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}));

// Mock dependencies
const mockStageHistoryDelete = rs.fn().mockResolvedValue(undefined);
const mockMeasurementDelete = rs.fn().mockResolvedValue(undefined);
const mockTaskDelete = rs.fn().mockResolvedValue(undefined);
const mockWineDelete = rs.fn().mockResolvedValue(undefined);
const mockVintageDelete = rs.fn().mockResolvedValue(undefined);

const mockVintage = {
  id: 'vintage-1',
  vintage_year: 2024,
  variety: 'Cabernet Sauvignon',
};

const mockWinesData = [
  { id: 'wine-1', name: 'Barrel 1', vintage_id: 'vintage-1' },
  { id: 'wine-2', name: 'Barrel 2', vintage_id: 'vintage-1' },
];

const mockVintageStageHistoryData = [
  { id: 'v-stage-1', entity_type: 'vintage', entity_id: 'vintage-1' },
];

const mockVintageMeasurementsData = [
  { id: 'v-measurement-1', entity_type: 'vintage', entity_id: 'vintage-1' },
];

const mockVintageTasksData = [
  { id: 'v-task-1', entity_type: 'vintage', entity_id: 'vintage-1' },
];

const mockWineTasksData = [
  { id: 'w-task-1', entity_type: 'wine', entity_id: 'wine-1' },
  { id: 'w-task-2', entity_type: 'wine', entity_id: 'wine-2' },
];

const mockWineMeasurementsData = [
  { id: 'w-measurement-1', entity_type: 'wine', entity_id: 'wine-1' },
];

const mockWineStageHistoryData = [
  { id: 'w-stage-1', entity_type: 'wine', entity_id: 'wine-1' },
  { id: 'w-stage-2', entity_type: 'wine', entity_id: 'wine-2' },
];

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    query: {
      wine: {
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
      vintage: {
        delete: mockVintageDelete,
      },
    },
  }),
}));

let queryCallCount = 0;
rs.mock('@rocicorp/zero/react', () => ({
  useQuery: rs.fn(() => {
    // Return different data based on call order matching DeleteVintageConfirmModal's query sequence
    const calls = [
      mockWinesData,                 // 1st: wines for vintage
      mockVintageStageHistoryData,   // 2nd: vintage stage history
      mockVintageMeasurementsData,   // 3rd: vintage measurements
      mockVintageTasksData,          // 4th: vintage tasks
      mockWineTasksData,             // 5th: all wine tasks
      mockWineMeasurementsData,      // 6th: all wine measurements
      mockWineStageHistoryData,      // 7th: all wine stage history
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

describe('DeleteVintageConfirmModal', () => {
  afterEach(() => {
    cleanup();
    mockStageHistoryDelete.mockClear();
    mockMeasurementDelete.mockClear();
    mockTaskDelete.mockClear();
    mockWineDelete.mockClear();
    mockVintageDelete.mockClear();
    queryCallCount = 0; // Reset query call count
  });

  describe('rendering', () => {
    test('does not render when closed', () => {
      render(
        <DeleteVintageConfirmModal
          isOpen={false}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    test('renders when open', () => {
      render(
        <DeleteVintageConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'DELETE VINTAGE?' })).toBeInTheDocument();
    });

    test('shows vintage name in confirmation message', () => {
      render(
        <DeleteVintageConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      expect(screen.getByText(/2024 Cabernet Sauvignon/)).toBeInTheDocument();
    });

    test('displays count of all related records to be deleted', () => {
      render(
        <DeleteVintageConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      expect(screen.getByText(/2 wines/)).toBeInTheDocument();
      expect(screen.getByText(/3 stage history records/)).toBeInTheDocument(); // 1 vintage + 2 wine
      expect(screen.getByText(/3 tasks/)).toBeInTheDocument(); // 1 vintage + 2 wine
      expect(screen.getByText(/2 measurements/)).toBeInTheDocument(); // 1 vintage + 1 wine
    });

    test('shows warning message', () => {
      render(
        <DeleteVintageConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
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
        <DeleteVintageConfirmModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'CANCEL' });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('deletes all related records in correct order when delete confirmed', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();
      const mockOnClose = rs.fn();

      render(
        <DeleteVintageConfirmModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          vintage={mockVintage}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'DELETE VINTAGE' });
      await user.click(deleteButton);

      // Wait for async operations
      await waitFor(() => {
        expect(mockVintageDelete).toHaveBeenCalledWith({ id: 'vintage-1' });
      });

      // Wine tasks should be deleted (2)
      expect(mockTaskDelete).toHaveBeenCalledWith({ id: 'w-task-1' });
      expect(mockTaskDelete).toHaveBeenCalledWith({ id: 'w-task-2' });

      // Wine measurements should be deleted (1)
      expect(mockMeasurementDelete).toHaveBeenCalledWith({ id: 'w-measurement-1' });

      // Wine stage history should be deleted (2)
      expect(mockStageHistoryDelete).toHaveBeenCalledWith({ id: 'w-stage-1' });
      expect(mockStageHistoryDelete).toHaveBeenCalledWith({ id: 'w-stage-2' });

      // Wines should be deleted (2)
      expect(mockWineDelete).toHaveBeenCalledWith({ id: 'wine-1' });
      expect(mockWineDelete).toHaveBeenCalledWith({ id: 'wine-2' });

      // Vintage tasks should be deleted (1)
      expect(mockTaskDelete).toHaveBeenCalledWith({ id: 'v-task-1' });

      // Vintage measurements should be deleted (1)
      expect(mockMeasurementDelete).toHaveBeenCalledWith({ id: 'v-measurement-1' });

      // Vintage stage history should be deleted (1)
      expect(mockStageHistoryDelete).toHaveBeenCalledWith({ id: 'v-stage-1' });
    });

    test('calls onSuccess with message after deletion', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <DeleteVintageConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          vintage={mockVintage}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'DELETE VINTAGE' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('2024 Cabernet Sauvignon deleted successfully');
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
      mockVintageDelete.mockReturnValue(deletePromise);

      render(
        <DeleteVintageConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'DELETE VINTAGE' });
      await user.click(deleteButton);

      expect(screen.getByRole('button', { name: 'DELETING...' })).toBeInTheDocument();

      // Clean up
      resolveDelete!();
      mockVintageDelete.mockResolvedValue(undefined);
    });

    test('disables buttons while deleting', async () => {
      const user = userEvent.setup();

      // Make delete operations delay
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockVintageDelete.mockReturnValue(deletePromise);

      render(
        <DeleteVintageConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'DELETE VINTAGE' });
      await user.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: 'CANCEL' });
      expect(cancelButton).toBeDisabled();
      expect(screen.getByRole('button', { name: 'DELETING...' })).toBeDisabled();

      // Clean up
      resolveDelete!();
      mockVintageDelete.mockResolvedValue(undefined);
    });
  });

  describe('error handling', () => {
    let originalConsoleError: typeof console.error;

    beforeEach(() => {
      originalConsoleError = console.error;
      console.error = rs.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });

    test('displays error message when deletion fails', async () => {
      const user = userEvent.setup();
      mockVintageDelete.mockRejectedValue(new Error('Network error'));

      render(
        <DeleteVintageConfirmModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'DELETE VINTAGE' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to delete vintage. Please try again.')).toBeInTheDocument();
      });

      // Reset mock
      mockVintageDelete.mockResolvedValue(undefined);
    });
  });
});
