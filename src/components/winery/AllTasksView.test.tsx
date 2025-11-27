import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllTasksView } from './AllTasksView';

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}));

const now = Date.now();
const oneDayMs = 86400000;

const mockCompletedTask = {
  id: 'task-1',
  name: 'Completed Task',
  description: 'This task is done',
  entity_type: 'wine',
  entity_id: 'wine-1',
  due_date: now - oneDayMs * 5,
  completed_at: now - oneDayMs * 2,
  skipped: false,
};

const mockOverdueTask = {
  id: 'task-2',
  name: 'Overdue Task',
  description: 'This task is overdue',
  entity_type: 'vintage',
  entity_id: 'vintage-1',
  due_date: now - oneDayMs * 3,
  completed_at: null,
  skipped: false,
};

const mockUpcomingTask = {
  id: 'task-3',
  name: 'Upcoming Task',
  description: 'This task is coming up',
  entity_type: 'wine',
  entity_id: 'wine-2',
  due_date: now + oneDayMs * 7,
  completed_at: null,
  skipped: false,
};

const mockSkippedTask = {
  id: 'task-4',
  name: 'Skipped Task',
  description: 'This task was skipped',
  entity_type: 'vintage',
  entity_id: 'vintage-2',
  due_date: now - oneDayMs * 10,
  completed_at: null,
  skipped: true,
};

let mockTasksData = [mockCompletedTask, mockOverdueTask, mockUpcomingTask, mockSkippedTask];
let mockSetLocation = rs.fn();

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    query: {
      task: {},
    },
  }),
}));

rs.mock('@rocicorp/zero/react', () => ({
  useQuery: () => [mockTasksData],
}));

rs.mock('wouter', () => ({
  useLocation: () => ['/tasks', mockSetLocation],
}));

rs.mock('./taskHelpers', () => ({
  formatDueDate: (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  },
  isOverdue: (dueDate: number, completedAt: number | null, skipped: number) => {
    if (completedAt !== null || skipped === 1) return false;
    return dueDate < Date.now();
  },
}));

describe('AllTasksView', () => {
  afterEach(() => {
    cleanup();
    mockTasksData = [mockCompletedTask, mockOverdueTask, mockUpcomingTask, mockSkippedTask];
    mockSetLocation.mockClear();
  });

  describe('rendering', () => {
    test('renders the all tasks view', () => {
      render(<AllTasksView />);

      expect(screen.getByText('ALL TASKS')).toBeInTheDocument();
      expect(screen.getByText(/BACK TO DASHBOARD/)).toBeInTheDocument();
    });

    test('displays search bar', () => {
      render(<AllTasksView />);

      const searchInput = screen.getByPlaceholderText('Search tasks by title...');
      expect(searchInput).toBeInTheDocument();
    });

    test('displays task count', () => {
      render(<AllTasksView />);

      expect(screen.getByText(/ALL \(4\)/)).toBeInTheDocument();
    });

    test('displays all tasks when ALL tab is clicked', async () => {
      const user = userEvent.setup();
      render(<AllTasksView />);

      // Click ALL tab to see all tasks
      await user.click(screen.getByText(/ALL \(/));

      expect(screen.getByText('Completed Task')).toBeInTheDocument();
      expect(screen.getByText('Overdue Task')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Task')).toBeInTheDocument();
      expect(screen.getByText('Skipped Task')).toBeInTheDocument();
    });
  });

  describe('task states', () => {
    test('shows completed badge for completed tasks', async () => {
      const user = userEvent.setup();
      render(<AllTasksView />);

      await user.click(screen.getByText(/COMPLETED \(/));
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });

    test('shows overdue badge for overdue tasks', () => {
      render(<AllTasksView />);

      // Overdue tasks show in the active tab
      expect(screen.getByText('OVERDUE')).toBeInTheDocument();
    });

    test('shows skipped badge for skipped tasks', async () => {
      const user = userEvent.setup();
      render(<AllTasksView />);

      await user.click(screen.getByText(/SKIPPED \(/));
      expect(screen.getByText('SKIPPED')).toBeInTheDocument();
    });

    test('displays task descriptions', async () => {
      const user = userEvent.setup();
      render(<AllTasksView />);

      // Click ALL tab to see all tasks
      await user.click(screen.getByText(/ALL \(/));

      expect(screen.getByText('This task is done')).toBeInTheDocument();
      expect(screen.getByText('This task is overdue')).toBeInTheDocument();
    });

    test('displays entity type', () => {
      render(<AllTasksView />);

      const wineLabels = screen.getAllByText(/Wine/);
      const vintageLabels = screen.getAllByText(/Vintage/);

      expect(wineLabels.length).toBeGreaterThan(0);
      expect(vintageLabels.length).toBeGreaterThan(0);
    });
  });

  describe('search functionality', () => {
    test('filters tasks by search query', async () => {
      const user = userEvent.setup();

      render(<AllTasksView />);

      const searchInput = screen.getByPlaceholderText('Search tasks by title...');
      await user.type(searchInput, 'Overdue');

      expect(screen.getByText('Overdue Task')).toBeInTheDocument();
      expect(screen.queryByText('Completed Task')).not.toBeInTheDocument();
      expect(screen.queryByText('Upcoming Task')).not.toBeInTheDocument();
    });

    test('is case insensitive', async () => {
      const user = userEvent.setup();

      render(<AllTasksView />);

      // Search for 'overdue' (lowercase) to find 'Overdue Task' which is active
      const searchInput = screen.getByPlaceholderText('Search tasks by title...');
      await user.type(searchInput, 'overdue');

      expect(screen.getByText('Overdue Task')).toBeInTheDocument();
    });

    test('updates task count when filtering', async () => {
      const user = userEvent.setup();

      render(<AllTasksView />);

      const searchInput = screen.getByPlaceholderText('Search tasks by title...');
      await user.type(searchInput, 'Overdue');

      expect(screen.getByText(/ALL \(1\)/)).toBeInTheDocument();
    });

    test('shows no results message when search finds nothing', async () => {
      const user = userEvent.setup();

      render(<AllTasksView />);

      const searchInput = screen.getByPlaceholderText('Search tasks by title...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No tasks found matching your search.')).toBeInTheDocument();
    });
  });

  describe('task sorting', () => {
    test('sorts active tasks by due date ascending', () => {
      mockTasksData = [
        { ...mockUpcomingTask, id: 'task-1', name: 'Task Due Later', due_date: now + oneDayMs * 10 },
        { ...mockUpcomingTask, id: 'task-2', name: 'Task Due Soon', due_date: now + oneDayMs * 2 },
        { ...mockOverdueTask, id: 'task-3', name: 'Task Overdue', due_date: now - oneDayMs * 1 },
      ];

      render(<AllTasksView />);

      const taskElements = screen.getAllByText(/Task/);
      const taskNames = taskElements.map(el => el.textContent);

      const overdueIndex = taskNames.findIndex(name => name?.includes('Overdue'));
      const soonIndex = taskNames.findIndex(name => name?.includes('Soon'));
      const laterIndex = taskNames.findIndex(name => name?.includes('Later'));

      expect(overdueIndex).toBeLessThan(soonIndex);
      expect(soonIndex).toBeLessThan(laterIndex);
    });
  });

  describe('navigation', () => {
    test('navigates back to dashboard', async () => {
      const user = userEvent.setup();

      render(<AllTasksView />);

      const backButton = screen.getByText(/BACK TO DASHBOARD/);
      await user.click(backButton);

      expect(mockSetLocation).toHaveBeenCalledWith('/');
    });

    test('navigates to wine task list when clicking wine task', async () => {
      const user = userEvent.setup();

      render(<AllTasksView />);

      const wineTask = screen.getByText('Upcoming Task');
      await user.click(wineTask);

      expect(mockSetLocation).toHaveBeenCalledWith('/winery/wines/wine-2/tasks');
    });

    test('navigates to vintage task list when clicking vintage task', async () => {
      const user = userEvent.setup();

      render(<AllTasksView />);

      const vintageTask = screen.getByText('Overdue Task');
      await user.click(vintageTask);

      expect(mockSetLocation).toHaveBeenCalledWith('/winery/vintages/vintage-1/tasks');
    });
  });

  describe('empty states', () => {
    test('shows empty message when no tasks exist', () => {
      mockTasksData = [];

      render(<AllTasksView />);

      expect(screen.getByText('No active tasks.')).toBeInTheDocument();
      expect(screen.getByText(/ALL \(0\)/)).toBeInTheDocument();
    });

    test('shows no search results message when search returns nothing', async () => {
      const user = userEvent.setup();

      render(<AllTasksView />);

      const searchInput = screen.getByPlaceholderText('Search tasks by title...');
      await user.type(searchInput, 'xyz');

      expect(screen.getByText('No tasks found matching your search.')).toBeInTheDocument();
    });
  });

});

