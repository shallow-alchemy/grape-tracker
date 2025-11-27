import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskListView } from './TaskListView';

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}));

const now = Date.now();
const mockTasksData = [
  {
    id: 'task-1',
    name: 'Check Temperature',
    description: 'Monitor fermentation temp',
    entity_type: 'wine',
    entity_id: 'wine-1',
    due_date: now - 86400000, // 1 day ago (overdue)
    completed_at: null,
    skipped: false,
  },
  {
    id: 'task-2',
    name: 'Take Gravity Reading',
    description: 'Measure specific gravity',
    entity_type: 'wine',
    entity_id: 'wine-1',
    due_date: now + 86400000, // 1 day from now (upcoming)
    completed_at: null,
    skipped: false,
  },
  {
    id: 'task-3',
    name: 'Rack Wine',
    description: '',
    entity_type: 'wine',
    entity_id: 'wine-1',
    due_date: now - 172800000, // 2 days ago
    completed_at: now - 86400000, // completed 1 day ago
    skipped: false,
  },
  {
    id: 'task-4',
    name: 'Add Oak Chips',
    description: '',
    entity_type: 'wine',
    entity_id: 'wine-1',
    due_date: now,
    completed_at: null,
    skipped: true,
  },
];

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    query: {
      task: {
        where: rs.fn().mockReturnThis(),
      },
    },
  }),
}));

let mockQueryData = mockTasksData;
rs.mock('@rocicorp/zero/react', () => ({
  useQuery: () => [mockQueryData],
}));

rs.mock('./TaskCompletionModal', () => ({
  TaskCompletionModal: ({ isOpen, taskName }: { isOpen: boolean; taskName: string }) => {
    if (!isOpen) return null;
    return <div data-testid="task-completion-modal">Completing: {taskName}</div>;
  },
}));

rs.mock('./CreateTaskModal', () => ({
  CreateTaskModal: ({ isOpen }: { isOpen: boolean }) => {
    if (!isOpen) return null;
    return <div data-testid="create-task-modal">Create Task Modal</div>;
  },
}));

rs.mock('./taskHelpers', () => ({
  formatDueDate: (timestamp: number) => {
    if (timestamp < Date.now()) return 'OVERDUE';
    return new Date(timestamp).toLocaleDateString();
  },
  isOverdue: (dueDate: number, completedAt: number | null, skipped: number) => {
    return dueDate < Date.now() && !completedAt && skipped === 0;
  },
}));

describe('TaskListView', () => {
  afterEach(() => {
    cleanup();
    mockQueryData = mockTasksData;
  });

  describe('header', () => {
    test('displays entity name in title', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="2024 Cabernet"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.getByText('TASKS: 2024 Cabernet')).toBeInTheDocument();
    });

    test('renders back button', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.getByText('← BACK')).toBeInTheDocument();
    });

    test('calls onBack when back button clicked', async () => {
      const user = userEvent.setup();
      const mockOnBack = rs.fn();

      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={mockOnBack}
        />
      );

      const backButton = screen.getByRole('button', { name: '← BACK' });
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });

    test('renders create task button', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.getByText('CREATE TASK')).toBeInTheDocument();
    });
  });

  describe('task categorization', () => {
    test('displays overdue tasks section with count', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.getByText(/OVERDUE \(1\)/)).toBeInTheDocument();
    });

    test('displays upcoming tasks section with count', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.getByText(/UPCOMING \(1\)/)).toBeInTheDocument();
    });

    test('displays completed tasks section with count', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.getByText(/COMPLETED \(1\)/)).toBeInTheDocument();
    });

    test('displays skipped tasks section with count', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.getByText(/SKIPPED \(1\)/)).toBeInTheDocument();
    });

    test('shows appropriate tasks in each section', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      // Overdue section should have the overdue task
      const overdueSection = screen.getByText(/OVERDUE \(1\)/).parentElement;
      expect(overdueSection).toHaveTextContent('Check Temperature');

      // Upcoming section should have the upcoming task
      const upcomingSection = screen.getByText(/UPCOMING \(1\)/).parentElement;
      expect(upcomingSection).toHaveTextContent('Take Gravity Reading');

      // Completed section should have the completed task
      const completedSection = screen.getByText(/COMPLETED \(1\)/).parentElement;
      expect(completedSection).toHaveTextContent('Rack Wine');

      // Skipped section should have the skipped task
      const skippedSection = screen.getByText(/SKIPPED \(1\)/).parentElement;
      expect(skippedSection).toHaveTextContent('Add Oak Chips');
    });
  });

  describe('empty state', () => {
    test('shows empty state message when no tasks exist', () => {
      mockQueryData = [];

      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.getByText(/No tasks yet/)).toBeInTheDocument();
      expect(screen.getByText(/Create one or advance the stage/)).toBeInTheDocument();
    });

    test('does not show sections when no tasks exist', () => {
      mockQueryData = [];

      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.queryByText(/OVERDUE/)).not.toBeInTheDocument();
      expect(screen.queryByText(/UPCOMING/)).not.toBeInTheDocument();
      expect(screen.queryByText(/COMPLETED/)).not.toBeInTheDocument();
      expect(screen.queryByText(/SKIPPED/)).not.toBeInTheDocument();
    });
  });

  describe('task card display', () => {
    test('displays task name', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.getByText('Check Temperature')).toBeInTheDocument();
      expect(screen.getByText('Take Gravity Reading')).toBeInTheDocument();
    });

    test('displays task description when present', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.getByText('Monitor fermentation temp')).toBeInTheDocument();
      expect(screen.getByText('Measure specific gravity')).toBeInTheDocument();
    });

    test('shows OVERDUE badge for overdue tasks', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      const overdueBadges = screen.getAllByText('OVERDUE');
      expect(overdueBadges.length).toBeGreaterThan(0);
    });

    test('shows COMPLETED badge for completed tasks', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });

    test('shows SKIPPED badge for skipped tasks', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.getByText('SKIPPED')).toBeInTheDocument();
    });
  });

  describe('task interaction', () => {
    test('opens task completion modal when task card clicked', async () => {
      const user = userEvent.setup();

      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      const taskCard = screen.getByText('Check Temperature');
      await user.click(taskCard);

      expect(screen.getByTestId('task-completion-modal')).toBeInTheDocument();
      expect(screen.getByText('Completing: Check Temperature')).toBeInTheDocument();
    });

    test('opens create task modal when create button clicked', async () => {
      const user = userEvent.setup();

      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      const createButton = screen.getByText('CREATE TASK');
      await user.click(createButton);

      expect(screen.getByTestId('create-task-modal')).toBeInTheDocument();
    });
  });

  describe('success message', () => {
    test('does not show success message initially', () => {
      render(
        <TaskListView
          entityType="wine"
          entityId="wine-1"
          entityName="Test Wine"
          currentStage="primary_fermentation"
          onBack={() => {}}
        />
      );

      expect(screen.queryByText(/Task completed/)).not.toBeInTheDocument();
    });
  });
});
