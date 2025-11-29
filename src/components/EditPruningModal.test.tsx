import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditPruningModal } from './EditPruningModal';
import { type PruningLogData } from './vineyard-hooks';

const mockPruningLogUpdate = rs.fn().mockResolvedValue(undefined);
const mockPruningLogDelete = rs.fn().mockResolvedValue(undefined);

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-123',
    },
  }),
}));

rs.mock('../contexts/ZeroContext', () => ({
  useZero: () => ({
    mutate: {
      pruning_log: {
        update: mockPruningLogUpdate,
        delete: mockPruningLogDelete,
      },
    },
  }),
}));

rs.mock('./Modal', () => ({
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

const mockPruningLog: PruningLogData = {
  id: 'pruning-1',
  user_id: 'test-user-123',
  vine_id: 'vine-1',
  date: new Date('2024-01-15T12:00:00').getTime(),
  pruning_type: 'dormant',
  spurs_left: 8,
  canes_before: 12,
  canes_after: 6,
  notes: 'Winter pruning complete',
  photo_id: null,
  created_at: Date.now(),
  updated_at: Date.now(),
};

describe('EditPruningModal', () => {
  afterEach(() => {
    cleanup();
    mockPruningLogUpdate.mockClear();
    mockPruningLogDelete.mockClear();
  });

  describe('rendering', () => {
    test('does not render when closed', () => {
      render(
        <EditPruningModal
          isOpen={false}
          onClose={() => {}}
          onSuccess={() => {}}
          pruningLog={mockPruningLog}
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    test('does not render when pruningLog is null', () => {
      render(
        <EditPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          pruningLog={null}
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    test('renders when open with pruning log', () => {
      render(
        <EditPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          pruningLog={mockPruningLog}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'EDIT PRUNING LOG' })).toBeInTheDocument();
    });

    test('pre-fills form with existing data', () => {
      render(
        <EditPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          pruningLog={mockPruningLog}
        />
      );

      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('8')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12')).toBeInTheDocument();
      expect(screen.getByDisplayValue('6')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Winter pruning complete')).toBeInTheDocument();
    });

    test('shows all pruning type options', () => {
      render(
        <EditPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          pruningLog={mockPruningLog}
        />
      );

      expect(screen.getByText('Dormant (Winter)')).toBeInTheDocument();
      expect(screen.getByText('Summer')).toBeInTheDocument();
      expect(screen.getByText('Corrective')).toBeInTheDocument();
      expect(screen.getByText('Training')).toBeInTheDocument();
    });

    test('shows save and cancel buttons', () => {
      render(
        <EditPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          pruningLog={mockPruningLog}
        />
      );

      expect(screen.getByRole('button', { name: 'CANCEL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SAVE CHANGES' })).toBeInTheDocument();
    });

    test('shows delete button', () => {
      render(
        <EditPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          pruningLog={mockPruningLog}
        />
      );

      expect(screen.getByRole('button', { name: 'DELETE LOG' })).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    test('updates pruning log with changed values', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <EditPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          pruningLog={mockPruningLog}
        />
      );

      const typeSelect = screen.getByRole('combobox');
      await user.selectOptions(typeSelect, 'summer');

      const spursInput = screen.getByDisplayValue('8');
      await user.clear(spursInput);
      await user.type(spursInput, '10');

      const submitButton = screen.getByRole('button', { name: 'SAVE CHANGES' });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPruningLogUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'pruning-1',
          pruning_type: 'summer',
          spurs_left: 10,
        })
      );

      expect(mockOnSuccess).toHaveBeenCalledWith('Summer pruning log updated');
    });

    test('closes modal after successful update', async () => {
      const user = userEvent.setup();
      const mockOnClose = rs.fn();

      render(
        <EditPruningModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={() => {}}
          pruningLog={mockPruningLog}
        />
      );

      const submitButton = screen.getByRole('button', { name: 'SAVE CHANGES' });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('delete functionality', () => {
    test('shows delete confirmation when delete button clicked', async () => {
      const user = userEvent.setup();

      render(
        <EditPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          pruningLog={mockPruningLog}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'DELETE LOG' });
      await user.click(deleteButton);

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'CONFIRM DELETE' })).toBeInTheDocument();
    });

    test('can cancel delete confirmation', async () => {
      const user = userEvent.setup();

      render(
        <EditPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          pruningLog={mockPruningLog}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'DELETE LOG' });
      await user.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: 'CANCEL' });
      await user.click(cancelButton);

      // Should be back to edit form
      expect(screen.getByRole('button', { name: 'SAVE CHANGES' })).toBeInTheDocument();
      expect(mockPruningLogDelete).not.toHaveBeenCalled();
    });

    test('deletes pruning log when confirmed', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();
      const mockOnClose = rs.fn();

      render(
        <EditPruningModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          pruningLog={mockPruningLog}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'DELETE LOG' });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: 'CONFIRM DELETE' });
      await user.click(confirmButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPruningLogDelete).toHaveBeenCalledWith({ id: 'pruning-1' });
      expect(mockOnSuccess).toHaveBeenCalledWith('Pruning log deleted');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('modal actions', () => {
    test('closes modal when cancel clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = rs.fn();

      render(
        <EditPruningModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={() => {}}
          pruningLog={mockPruningLog}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'CANCEL' });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('with empty optional fields', () => {
    test('handles pruning log without optional values', () => {
      const logWithoutOptionals: PruningLogData = {
        ...mockPruningLog,
        spurs_left: null,
        canes_before: null,
        canes_after: null,
        notes: '',
      };

      render(
        <EditPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          pruningLog={logWithoutOptionals}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Number of spurs after pruning')).toHaveValue(null);
    });
  });
});
