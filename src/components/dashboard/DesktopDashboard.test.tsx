import { test, describe, expect, afterEach, rs } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import {
  DesktopDashboard,
  RecentActivity,
  CurrentVintage,
  SuppliesNeeded,
  TaskManagement,
} from './DesktopDashboard';

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}));

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    query: {
      task: {
        run: rs.fn().mockResolvedValue([]),
      },
    },
  }),
}));

const mockTasks = [
  {
    id: 'task-1',
    name: 'Winter pruning due: Dec 1-15',
    due_date: new Date('2024-12-01').getTime(),
    completed_at: null,
    skipped: false,
  },
  {
    id: 'task-2',
    name: 'Frost protection recommended',
    due_date: new Date('2024-11-15').getTime(),
    completed_at: null,
    skipped: false,
  },
  {
    id: 'task-3',
    name: 'Harvest grapes before Nov 20',
    due_date: new Date('2024-11-20').getTime(),
    completed_at: null,
    skipped: false,
  },
  {
    id: 'task-4',
    name: 'Equipment maintenance check',
    due_date: new Date('2024-12-10').getTime(),
    completed_at: null,
    skipped: false,
  },
];

rs.mock('@rocicorp/zero/react', () => ({
  useQuery: () => [mockTasks],
}));

rs.mock('../winery/taskHelpers', () => ({
  formatDueDate: (timestamp: number) => new Date(timestamp).toLocaleDateString(),
}));

describe('RecentActivity', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders title', () => {
    render(<RecentActivity />);
    expect(screen.getByText('RECENT ACTIVITY')).toBeInTheDocument();
  });

  test('renders activity items', () => {
    render(<RecentActivity />);

    expect(screen.getByText('VINE A-123 SCANNED')).toBeInTheDocument();
    expect(screen.getByText('BATCH B-456 UPDATED')).toBeInTheDocument();
    expect(screen.getByText('HARVEST LOG CREATED')).toBeInTheDocument();
  });

  test('renders activity times', () => {
    render(<RecentActivity />);

    expect(screen.getByText('10:23 AM')).toBeInTheDocument();
    expect(screen.getByText('09:45 AM')).toBeInTheDocument();
    expect(screen.getByText('08:12 AM')).toBeInTheDocument();
  });
});

describe('CurrentVintage', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders title and view all link', () => {
    render(<CurrentVintage />);

    expect(screen.getByText('CURRENT VINTAGE')).toBeInTheDocument();
    expect(screen.getByText('VIEW ALL VINTAGES')).toBeInTheDocument();
  });

  test('renders vintage name', () => {
    render(<CurrentVintage />);

    expect(screen.getByText('2024 CABERNET SAUVIGNON')).toBeInTheDocument();
  });

  test('renders metrics', () => {
    render(<CurrentVintage />);

    expect(screen.getByText('HARVEST BRIX')).toBeInTheDocument();
    expect(screen.getByText('24.5')).toBeInTheDocument();
    expect(screen.getByText('TA')).toBeInTheDocument();
    expect(screen.getByText('6.2 g/L')).toBeInTheDocument();
    expect(screen.getByText('PH')).toBeInTheDocument();
    expect(screen.getByText('3.65')).toBeInTheDocument();
    expect(screen.getByText('OAK TIME')).toBeInTheDocument();
    expect(screen.getByText('8 MONTHS')).toBeInTheDocument();
  });

  test('renders tasting note', () => {
    render(<CurrentVintage />);

    expect(screen.getByText('LATEST TASTING (NOV 1)')).toBeInTheDocument();
    expect(screen.getByText(/DEVELOPING WELL/)).toBeInTheDocument();
  });
});

describe('SuppliesNeeded', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders title and view inventory link', () => {
    render(<SuppliesNeeded />);

    expect(screen.getByText('SUPPLIES NEEDED')).toBeInTheDocument();
    expect(screen.getByText('VIEW INVENTORY')).toBeInTheDocument();
  });

  test('renders supply items', () => {
    render(<SuppliesNeeded />);

    expect(screen.getByText('YEAST (RED STAR)')).toBeInTheDocument();
    expect(screen.getByText('POTASSIUM METABISULFATE')).toBeInTheDocument();
    expect(screen.getByText('CARBOYS (5 GAL)')).toBeInTheDocument();
    expect(screen.getByText('SANITIZER')).toBeInTheDocument();
  });

  test('renders supply reasons', () => {
    render(<SuppliesNeeded />);

    const harvestReasons = screen.getAllByText('HARVEST - NOV 20');
    expect(harvestReasons).toHaveLength(2);
    expect(screen.getByText('SECONDARY FERMENT')).toBeInTheDocument();
    expect(screen.getByText('EQUIPMENT MAINT')).toBeInTheDocument();
  });
});

describe('TaskManagement', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders title', () => {
    render(<TaskManagement />);

    expect(screen.getByText('TASK MANAGEMENT')).toBeInTheDocument();
  });

  test('renders task items', () => {
    render(<TaskManagement />);

    // Component renders task names in uppercase
    expect(screen.getByText('WINTER PRUNING DUE: DEC 1-15')).toBeInTheDocument();
    expect(screen.getByText('FROST PROTECTION RECOMMENDED')).toBeInTheDocument();
    expect(screen.getByText('HARVEST GRAPES BEFORE NOV 20')).toBeInTheDocument();
    expect(screen.getByText('EQUIPMENT MAINTENANCE CHECK')).toBeInTheDocument();
  });

  test('renders task dates', () => {
    render(<TaskManagement />);

    // Dates are formatted using toLocaleDateString
    // Just verify that task items are present with dates
    const taskItems = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(taskItems.length).toBeGreaterThan(0);
  });
});

describe('DesktopDashboard', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders all sub-components', () => {
    render(<DesktopDashboard />);

    // Check for RecentActivity
    expect(screen.getByText('RECENT ACTIVITY')).toBeInTheDocument();

    // Check for CurrentVintage
    expect(screen.getByText('CURRENT VINTAGE')).toBeInTheDocument();

    // Check for SuppliesNeeded
    expect(screen.getByText('SUPPLIES NEEDED')).toBeInTheDocument();

    // Check for TaskManagement
    expect(screen.getByText('TASK MANAGEMENT')).toBeInTheDocument();
  });

  test('renders recent activity items', () => {
    render(<DesktopDashboard />);

    expect(screen.getByText('VINE A-123 SCANNED')).toBeInTheDocument();
  });

  test('renders vintage information', () => {
    render(<DesktopDashboard />);

    expect(screen.getByText('2024 CABERNET SAUVIGNON')).toBeInTheDocument();
  });

  test('renders supply items', () => {
    render(<DesktopDashboard />);

    expect(screen.getByText('YEAST (RED STAR)')).toBeInTheDocument();
  });

  test('renders task items', () => {
    render(<DesktopDashboard />);

    expect(screen.getByText('WINTER PRUNING DUE: DEC 1-15')).toBeInTheDocument();
  });
});
