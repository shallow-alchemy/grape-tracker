import { test, describe, expect, afterEach, rs } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import {
  DesktopDashboard,
  VineyardSummary,
  CurrentVintage,
  SuppliesNeeded,
  TaskListPanel,
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
    entity_type: 'vintage',
    entity_id: 'vintage-1',
  },
  {
    id: 'task-2',
    name: 'Frost protection recommended',
    due_date: new Date('2024-11-15').getTime(),
    completed_at: null,
    skipped: false,
    entity_type: 'vintage',
    entity_id: 'vintage-1',
  },
  {
    id: 'task-3',
    name: 'Harvest grapes before Nov 20',
    due_date: new Date('2024-11-20').getTime(),
    completed_at: null,
    skipped: false,
    entity_type: 'wine',
    entity_id: 'wine-1',
  },
  {
    id: 'task-4',
    name: 'Equipment maintenance check',
    due_date: new Date('2024-12-10').getTime(),
    completed_at: null,
    skipped: false,
    entity_type: 'wine',
    entity_id: 'wine-1',
  },
];

const mockVintages = [
  {
    id: 'vintage-1',
    vintage_year: 2024,
    variety: 'CABERNET SAUVIGNON',
    current_stage: 'oaking',
    harvest_date: Date.now() - 30 * 24 * 60 * 60 * 1000,
    harvest_weight_lbs: 150,
    notes: 'DEVELOPING WELL. Tannins softening nicely.',
  },
];

const mockMeasurements = [
  {
    id: 'measurement-1',
    entity_type: 'vintage',
    entity_id: 'vintage-1',
    stage: 'harvest',
    brix: 24.5,
    ta: 6.2,
    ph: 3.65,
  },
];

const mockVines = [
  { id: 'vine-1', health: 'GOOD' },
  { id: 'vine-2', health: 'GOOD' },
  { id: 'vine-3', health: 'FAIR' },
  { id: 'vine-4', health: 'NEEDS ATTENTION' },
  { id: 'vine-5', health: 'EXCELLENT' },
];

const mockBlocks = [
  { id: 'block-1', name: 'Block A' },
  { id: 'block-2', name: 'Block B' },
];

// Mock queries to return objects with customQueryID for useQuery pattern
rs.mock('../../shared/queries', () => ({
  myTasks: () => ({ customQueryID: { name: 'myTasks' } }),
  myVintages: () => ({ customQueryID: { name: 'myVintages' } }),
  myMeasurements: () => ({ customQueryID: { name: 'myMeasurements' } }),
  myVines: () => ({ customQueryID: { name: 'myVines' } }),
  myBlocks: () => ({ customQueryID: { name: 'myBlocks' } }),
  myWines: () => ({ customQueryID: { name: 'myWines' } }),
  supplyTemplates: () => ({ customQueryID: { name: 'supplyTemplates' } }),
  mySupplyInstances: () => ({ customQueryID: { name: 'mySupplyInstances' } }),
}));

rs.mock('@rocicorp/zero/react', () => ({
  useQuery: (query: any) => {
    const queryName = query?.customQueryID?.name;
    if (queryName === 'myTasks') {
      return [mockTasks];
    }
    if (queryName === 'myVintages') {
      return [mockVintages];
    }
    if (queryName === 'myMeasurements') {
      return [mockMeasurements];
    }
    if (queryName === 'myVines') {
      return [mockVines];
    }
    if (queryName === 'myBlocks') {
      return [mockBlocks];
    }
    if (queryName === 'myWines') {
      return [[]];
    }
    if (queryName === 'supplyTemplates') {
      return [[]];
    }
    if (queryName === 'mySupplyInstances') {
      return [[]];
    }
    return [[]];
  },
}));

rs.mock('../winery/taskHelpers', () => ({
  formatDueDate: (timestamp: number) => new Date(timestamp).toLocaleDateString(),
}));

rs.mock('../winery/stages', () => ({
  formatStage: (stage: string) => stage ? stage.replace(/_/g, ' ').toUpperCase() : '',
}));

rs.mock('wouter', () => ({
  useLocation: () => ['/', rs.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));


describe('VineyardSummary', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders title and view link', () => {
    render(<VineyardSummary />);
    expect(screen.getByText('VINEYARD')).toBeInTheDocument();
    expect(screen.getByText('VIEW')).toBeInTheDocument();
  });

  test('renders vine count', () => {
    render(<VineyardSummary />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('VINES')).toBeInTheDocument();
  });

  test('renders block count', () => {
    render(<VineyardSummary />);
    // 2 blocks - check both label and that it appears in the stats
    expect(screen.getByText('BLOCKS')).toBeInTheDocument();
  });

  test('renders vines needing attention', () => {
    render(<VineyardSummary />);
    // 1 FAIR + 1 NEEDS ATTENTION = 2
    expect(screen.getByText('NEED ATTENTION')).toBeInTheDocument();
    // Check there are two "2" values (blocks and needs attention)
    expect(screen.getAllByText('2')).toHaveLength(2);
  });

  test('renders current stage', () => {
    render(<VineyardSummary />);
    expect(screen.getByText('CURRENT STAGE')).toBeInTheDocument();
    expect(screen.getByText('DORMANT')).toBeInTheDocument();
  });
});

describe('CurrentVintage', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders title and view all link', () => {
    render(<CurrentVintage />);

    expect(screen.getByText('WINERY')).toBeInTheDocument();
    expect(screen.getByText('VIEW ALL')).toBeInTheDocument();
  });

  test('renders vintage name', () => {
    render(<CurrentVintage />);

    expect(screen.getByText('2024 CABERNET SAUVIGNON')).toBeInTheDocument();
  });

  test('renders metrics', () => {
    render(<CurrentVintage />);

    expect(screen.getByText('BRIX')).toBeInTheDocument();
    expect(screen.getByText('24.5°')).toBeInTheDocument();
    expect(screen.getByText('TA')).toBeInTheDocument();
    expect(screen.getByText('6.2 g/L')).toBeInTheDocument();
    expect(screen.getByText('PH')).toBeInTheDocument();
    expect(screen.getByText('3.65')).toBeInTheDocument();
    expect(screen.getByText('WEIGHT')).toBeInTheDocument();
    expect(screen.getByText('150 LBS')).toBeInTheDocument();
  });

  test('renders notes', () => {
    render(<CurrentVintage />);

    expect(screen.getByText('NOTES')).toBeInTheDocument();
    expect(screen.getByText(/DEVELOPING WELL/)).toBeInTheDocument();
  });
});

describe('SuppliesNeeded', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders title and view all link', () => {
    render(<SuppliesNeeded />);

    expect(screen.getByText('SUPPLIES NEEDED')).toBeInTheDocument();
    expect(screen.getByText('VIEW ALL')).toBeInTheDocument();
  });

  test('renders empty state when no supplies needed', () => {
    render(<SuppliesNeeded />);

    expect(screen.getByText('NO SUPPLIES NEEDED')).toBeInTheDocument();
  });
});

describe('TaskListPanel', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders title', () => {
    render(<TaskListPanel />);

    expect(screen.getByText('TASK LIST')).toBeInTheDocument();
  });

  test('renders task items', () => {
    render(<TaskListPanel />);

    // Component renders task names in uppercase
    expect(screen.getByText('WINTER PRUNING DUE: DEC 1-15')).toBeInTheDocument();
    expect(screen.getByText('FROST PROTECTION RECOMMENDED')).toBeInTheDocument();
    expect(screen.getByText('HARVEST GRAPES BEFORE NOV 20')).toBeInTheDocument();
    expect(screen.getByText('EQUIPMENT MAINTENANCE CHECK')).toBeInTheDocument();
  });

  test('renders task dates', () => {
    render(<TaskListPanel />);

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

    // Check for VineyardSummary
    expect(screen.getByText('VINEYARD')).toBeInTheDocument();

    // Check for Winery (formerly CurrentVintage)
    expect(screen.getByText('WINERY')).toBeInTheDocument();

    // Check for SuppliesNeeded
    expect(screen.getByText('SUPPLIES NEEDED')).toBeInTheDocument();

    // Check for TaskListPanel
    expect(screen.getByText('TASK LIST')).toBeInTheDocument();
  });

  test('renders vineyard stats', () => {
    render(<DesktopDashboard />);

    expect(screen.getByText('VINES')).toBeInTheDocument();
    expect(screen.getByText('BLOCKS')).toBeInTheDocument();
  });

  test('renders vintage information', () => {
    render(<DesktopDashboard />);

    expect(screen.getByText('2024 CABERNET SAUVIGNON')).toBeInTheDocument();
  });

  test('renders supplies section', () => {
    render(<DesktopDashboard />);

    expect(screen.getByText('SUPPLIES NEEDED')).toBeInTheDocument();
  });

  test('renders task items', () => {
    render(<DesktopDashboard />);

    expect(screen.getByText('WINTER PRUNING DUE: DEC 1-15')).toBeInTheDocument();
  });
});
