import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCompletionModal } from './TaskCompletionModal';

const mockTaskUpdate = rs.fn().mockResolvedValue(undefined);

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    mutate: {
      task: {
        update: mockTaskUpdate,
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

rs.mock('./taskHelpers', () => ({
  formatDueDate: (timestamp: number) => new Date(timestamp).toLocaleDateString(),
  isOverdue: (dueDate: number, completedAt: number | null, skipped: number) => {
    if (completedAt || skipped) return false;
    return dueDate < Date.now();
  },
}));

describe('TaskCompletionModal', () => {
  afterEach(() => {
    cleanup();
    mockTaskUpdate.mockClear();
  });

  describe('rendering', () => {
    test('does not render when closed', () => {
      render(
        <TaskCompletionModal
          isOpen={false}
          onClose={() => {}}
          onSuccess={() => {}}
          taskId="task-1"
          taskName="Test Task"
          taskDescription="Test description"
          dueDate={Date.now()}
          currentlySkipped={false}
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    test('renders when open', () => {
      render(
        <TaskCompletionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          taskId="task-1"
          taskName="Test Task"
          taskDescription="Test description"
          dueDate={Date.now()}
          currentlySkipped={false}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'COMPLETE TASK' })).toBeInTheDocument();
    });

    test('shows task name and description', () => {
      render(
        <TaskCompletionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          taskId="task-1"
          taskName="Test Task"
          taskDescription="Test description"
          dueDate={Date.now()}
          currentlySkipped={false}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    test('shows SKIPPED TASK title when currentlySkipped is true', () => {
      render(
        <TaskCompletionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          taskId="task-1"
          taskName="Test Task"
          taskDescription="Test description"
          dueDate={Date.now()}
          currentlySkipped={true}
        />
      );

      expect(screen.getByRole('heading', { name: 'SKIPPED TASK' })).toBeInTheDocument();
    });

    test('shows notes textarea', () => {
      render(
        <TaskCompletionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          taskId="task-1"
          taskName="Test Task"
          taskDescription=""
          dueDate={Date.now()}
          currentlySkipped={false}
        />
      );

      expect(screen.getByPlaceholderText(/any notes/i)).toBeInTheDocument();
    });
  });

  describe('task completion', () => {
    test('completes task when complete button clicked', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <TaskCompletionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          taskId="task-1"
          taskName="Test Task"
          taskDescription=""
          dueDate={Date.now()}
          currentlySkipped={false}
        />
      );

      const completeButton = screen.getByRole('button', { name: 'COMPLETE' });
      await user.click(completeButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-1',
          skipped: false,
        })
      );

      expect(mockOnSuccess).toHaveBeenCalledWith('Completed: Test Task');
    });

    test('completes task with notes', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <TaskCompletionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          taskId="task-1"
          taskName="Test Task"
          taskDescription=""
          dueDate={Date.now()}
          currentlySkipped={false}
        />
      );

      const notesInput = screen.getByPlaceholderText(/any notes/i);
      await user.type(notesInput, 'Completed successfully');

      const completeButton = screen.getByRole('button', { name: 'COMPLETE' });
      await user.click(completeButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-1',
          notes: 'Completed successfully',
          skipped: false,
        })
      );

      expect(mockOnSuccess).toHaveBeenCalledWith('Completed: Test Task');
    });

    test('skips task when skip button clicked', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <TaskCompletionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          taskId="task-1"
          taskName="Test Task"
          taskDescription=""
          dueDate={Date.now()}
          currentlySkipped={false}
        />
      );

      const skipButton = screen.getByRole('button', { name: 'SKIP' });
      await user.click(skipButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-1',
          skipped: true,
          completed_at: null,
        })
      );

      expect(mockOnSuccess).toHaveBeenCalledWith('Skipped: Test Task');
    });
  });

  describe('modal actions', () => {
    test('shows cancel, skip, and complete buttons', () => {
      render(
        <TaskCompletionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          taskId="task-1"
          taskName="Test Task"
          taskDescription=""
          dueDate={Date.now()}
          currentlySkipped={false}
        />
      );

      expect(screen.getByRole('button', { name: 'CANCEL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SKIP' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'COMPLETE' })).toBeInTheDocument();
    });

    test('closes modal when cancel clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = rs.fn();

      render(
        <TaskCompletionModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={() => {}}
          taskId="task-1"
          taskName="Test Task"
          taskDescription=""
          dueDate={Date.now()}
          currentlySkipped={false}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'CANCEL' });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
