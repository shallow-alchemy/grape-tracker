import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddPruningModal } from './AddPruningModal';

const mockPruningLogInsert = rs.fn().mockResolvedValue(undefined);

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
        insert: mockPruningLogInsert,
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

describe('AddPruningModal', () => {
  afterEach(() => {
    cleanup();
    mockPruningLogInsert.mockClear();
  });

  describe('rendering', () => {
    test('does not render when closed', () => {
      render(
        <AddPruningModal
          isOpen={false}
          onClose={() => {}}
          onSuccess={() => {}}
          vineId="vine-1"
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    test('renders when open', () => {
      render(
        <AddPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vineId="vine-1"
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'LOG PRUNING' })).toBeInTheDocument();
    });

    test('shows all pruning type options', () => {
      render(
        <AddPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vineId="vine-1"
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();

      expect(screen.getByText('Dormant (Winter)')).toBeInTheDocument();
      expect(screen.getByText('Summer')).toBeInTheDocument();
      expect(screen.getByText('Corrective')).toBeInTheDocument();
      expect(screen.getByText('Training')).toBeInTheDocument();
    });

    test('shows all form fields', () => {
      render(
        <AddPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vineId="vine-1"
        />
      );

      expect(screen.getByText('DATE')).toBeInTheDocument();
      expect(screen.getByText('PRUNING TYPE')).toBeInTheDocument();
      expect(screen.getByText('SPURS LEFT (OPTIONAL)')).toBeInTheDocument();
      expect(screen.getByText('CANES BEFORE')).toBeInTheDocument();
      expect(screen.getByText('CANES AFTER')).toBeInTheDocument();
      expect(screen.getByText('NOTES (OPTIONAL)')).toBeInTheDocument();
    });

    test('shows date field with today as default', () => {
      render(
        <AddPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vineId="vine-1"
        />
      );

      const today = new Date().toISOString().split('T')[0];
      const dateInput = screen.getByDisplayValue(today);
      expect(dateInput).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    test('creates pruning log with required fields', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <AddPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          vineId="vine-1"
        />
      );

      const typeSelect = screen.getByRole('combobox');
      await user.selectOptions(typeSelect, 'dormant');

      const submitButton = screen.getByRole('button', { name: 'LOG PRUNING' });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPruningLogInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          vine_id: 'vine-1',
          pruning_type: 'dormant',
          date: expect.any(Number),
        })
      );

      expect(mockOnSuccess).toHaveBeenCalledWith('Dormant (Winter) pruning logged successfully');
    });

    test('creates pruning log with all fields', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <AddPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          vineId="vine-1"
        />
      );

      const typeSelect = screen.getByRole('combobox');
      await user.selectOptions(typeSelect, 'summer');

      const spursInput = screen.getByPlaceholderText('Number of spurs after pruning');
      await user.type(spursInput, '8');

      const canesBeforeInput = screen.getByPlaceholderText('Before');
      await user.type(canesBeforeInput, '12');

      const canesAfterInput = screen.getByPlaceholderText('After');
      await user.type(canesAfterInput, '6');

      const notesInput = screen.getByPlaceholderText('Observations, techniques used, issues found...');
      await user.type(notesInput, 'Test notes');

      const submitButton = screen.getByRole('button', { name: 'LOG PRUNING' });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPruningLogInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          vine_id: 'vine-1',
          pruning_type: 'summer',
          spurs_left: 8,
          canes_before: 12,
          canes_after: 6,
          notes: 'Test notes',
        })
      );

      expect(mockOnSuccess).toHaveBeenCalledWith('Summer pruning logged successfully');
    });

    test('creates pruning log with optional fields empty', async () => {
      const user = userEvent.setup();

      render(
        <AddPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vineId="vine-1"
        />
      );

      const typeSelect = screen.getByRole('combobox');
      await user.selectOptions(typeSelect, 'corrective');

      const submitButton = screen.getByRole('button', { name: 'LOG PRUNING' });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPruningLogInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          pruning_type: 'corrective',
          spurs_left: null,
          canes_before: null,
          canes_after: null,
          notes: '',
        })
      );
    });
  });

  describe('validation', () => {
    test('pruning type select has required attribute', () => {
      render(
        <AddPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vineId="vine-1"
        />
      );

      const typeSelect = screen.getByRole('combobox');
      expect(typeSelect).toHaveAttribute('required');
    });

    test('date field has required attribute', () => {
      render(
        <AddPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vineId="vine-1"
        />
      );

      const today = new Date().toISOString().split('T')[0];
      const dateInput = screen.getByDisplayValue(today);
      expect(dateInput).toHaveAttribute('required');
    });
  });

  describe('modal actions', () => {
    test('shows cancel and submit buttons', () => {
      render(
        <AddPruningModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vineId="vine-1"
        />
      );

      expect(screen.getByRole('button', { name: 'CANCEL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'LOG PRUNING' })).toBeInTheDocument();
    });

    test('closes modal when cancel clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = rs.fn();

      render(
        <AddPruningModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={() => {}}
          vineId="vine-1"
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'CANCEL' });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('closes modal after successful submission', async () => {
      const user = userEvent.setup();
      const mockOnClose = rs.fn();

      render(
        <AddPruningModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={() => {}}
          vineId="vine-1"
        />
      );

      const typeSelect = screen.getByRole('combobox');
      await user.selectOptions(typeSelect, 'training');

      const submitButton = screen.getByRole('button', { name: 'LOG PRUNING' });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
