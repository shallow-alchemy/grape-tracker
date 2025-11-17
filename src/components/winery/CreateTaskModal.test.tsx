import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateTaskModal } from './CreateTaskModal';

const mockTaskInsert = rs.fn().mockResolvedValue(undefined);

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    mutate: {
      task: {
        insert: mockTaskInsert,
      },
    },
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

describe('CreateTaskModal', () => {
  afterEach(() => {
    cleanup();
    mockTaskInsert.mockClear();
  });

  describe('rendering', () => {
    test('does not render when closed', () => {
      render(
        <CreateTaskModal
          isOpen={false}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    test('renders when open', () => {
      render(
        <CreateTaskModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'CREATE TASK' })).toBeInTheDocument();
    });

    test('shows all form fields', () => {
      render(
        <CreateTaskModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      expect(screen.getByPlaceholderText(/task name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/task description/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/additional notes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    test('shows required field indicator for task name', () => {
      render(
        <CreateTaskModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      expect(screen.getByText(/task name \*/i)).toBeInTheDocument();
    });

    test('prevents submission with empty task name', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <CreateTaskModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      const submitButton = screen.getByRole('button', { name: 'CREATE TASK' });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockTaskInsert).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('task creation', () => {
    test('creates task with required fields only', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <CreateTaskModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      const nameInput = screen.getByPlaceholderText(/task name/i);
      await user.type(nameInput, 'Test Task');

      const submitButton = screen.getByRole('button', { name: 'CREATE TASK' });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockTaskInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'wine',
          entity_id: 'wine-1',
          stage: 'primary_fermentation',
          name: 'Test Task',
          description: '',
          notes: '',
          task_template_id: null,
          skipped: false,
        })
      );

      expect(mockOnSuccess).toHaveBeenCalledWith('Created task: Test Task');
    });

    test('creates task with all fields', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <CreateTaskModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          entityType="wine"
          entityId="wine-1"
          currentStage="aging"
        />
      );

      const nameInput = screen.getByPlaceholderText(/task name/i);
      const descriptionInput = screen.getByPlaceholderText(/task description/i);
      const notesInput = screen.getByPlaceholderText(/additional notes/i);
      const dueDateInput = screen.getByLabelText(/due date/i);

      await user.type(nameInput, 'Test Task');
      await user.type(descriptionInput, 'Test description');
      await user.type(notesInput, 'Test notes');
      await user.type(dueDateInput, '2025-12-31');

      const submitButton = screen.getByRole('button', { name: 'CREATE TASK' });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockTaskInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'wine',
          entity_id: 'wine-1',
          stage: 'aging',
          name: 'Test Task',
          description: 'Test description',
          notes: 'Test notes',
          task_template_id: null,
        })
      );

      expect(mockOnSuccess).toHaveBeenCalledWith('Created task: Test Task');
    });

    test('creates task for vintage entity type', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <CreateTaskModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          entityType="vintage"
          entityId="vintage-1"
          currentStage="harvested"
        />
      );

      const nameInput = screen.getByPlaceholderText(/task name/i);
      await user.type(nameInput, 'Vintage Task');

      const submitButton = screen.getByRole('button', { name: 'CREATE TASK' });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockTaskInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'vintage',
          entity_id: 'vintage-1',
          stage: 'harvested',
          name: 'Vintage Task',
        })
      );

      expect(mockOnSuccess).toHaveBeenCalledWith('Created task: Vintage Task');
    });
  });

  describe('modal actions', () => {
    test('shows cancel and create task buttons', () => {
      render(
        <CreateTaskModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      expect(screen.getByRole('button', { name: 'CANCEL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'CREATE TASK' })).toBeInTheDocument();
    });

    test('closes modal when cancel clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = rs.fn();

      render(
        <CreateTaskModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'CANCEL' });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('shows loading state while submitting', async () => {
      const user = userEvent.setup();

      // Create a promise that won't resolve immediately
      let resolveInsert: () => void;
      const insertPromise = new Promise<void>((resolve) => {
        resolveInsert = resolve;
      });
      mockTaskInsert.mockReturnValue(insertPromise);

      render(
        <CreateTaskModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      const nameInput = screen.getByPlaceholderText(/task name/i);
      await user.type(nameInput, 'Test Task');

      const submitButton = screen.getByRole('button', { name: 'CREATE TASK' });
      await user.click(submitButton);

      // Check for loading state (button text changes to "CREATING...")
      expect(screen.getByRole('button', { name: 'CREATING...' })).toBeInTheDocument();

      // Clean up by resolving the promise
      resolveInsert!();

      // Reset the mock back to normal
      mockTaskInsert.mockResolvedValue(undefined);
    });
  });
});
