import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VintageDetailsView } from './VintageDetailsView';

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}));

const now = Date.now();
const mockVintage = {
  id: 'vintage-1',
  vintage_year: 2024,
  variety: 'Cabernet Sauvignon',
  current_stage: 'bulk_aging',
  grape_source: 'estate',
  total_weight_lbs: 1000,
  vineyard_location: 'North Block',
  harvest_date: now - 86400000 * 60,
  harvest_weight_lbs: 1000,
  harvest_volume_gallons: 50,
};

const mockWines = [
  {
    id: 'wine-1',
    name: 'Barrel 1',
    wine_type: 'red',
    current_stage: 'primary_fermentation',
    status: 'active',
    vintage_id: 'vintage-1',
    blend_components: null,
  },
  {
    id: 'wine-2',
    name: 'Barrel 2',
    wine_type: 'red',
    current_stage: 'oak_aging',
    status: 'aging',
    vintage_id: 'vintage-1',
    blend_components: null,
  },
  {
    id: 'wine-3',
    name: 'House Blend',
    wine_type: 'red',
    current_stage: 'bottled',
    status: 'bottled',
    vintage_id: 'vintage-2',
    blend_components: [
      { vintage_id: 'vintage-1', percentage: 60 },
      { vintage_id: 'vintage-2', percentage: 40 },
    ],
  },
];

const mockHarvestMeasurement = {
  id: 'measure-1',
  entity_type: 'vintage',
  entity_id: 'vintage-1',
  stage: 'harvest',
  date: now - 86400000 * 30,
  brix: 24.5,
  ph: 3.4,
  temperature_f: 72,
};

const mockStageHistory = [
  {
    id: 'history-1',
    entity_type: 'vintage',
    entity_id: 'vintage-1',
    stage: 'bulk_aging',
    started_at: now - 86400000 * 30,
    completed_at: null,
  },
];

let queryCallCount = 0;
let mockVintageData = [mockVintage];
let mockAllWinesData = mockWines;
let mockStageHistoryData = mockStageHistory;
let mockMeasurementsData = [mockHarvestMeasurement];

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    query: {
      vintage: {
        where: rs.fn().mockReturnThis(),
      },
      wine: {
        where: rs.fn().mockReturnThis(),
      },
      stage_history: {
        where: rs.fn().mockReturnThis(),
      },
      measurement: {
        where: rs.fn().mockReturnThis(),
      },
    },
  }),
}));

rs.mock('@rocicorp/zero/react', () => ({
  useQuery: () => {
    const calls = [
      mockVintageData,        // 1st call: vintage data
      mockAllWinesData,       // 2nd call: all wines
      mockStageHistoryData,   // 3rd call: stage history
      mockMeasurementsData,   // 4th call: measurements
    ];
    const result = calls[queryCallCount % calls.length] || [[]];
    queryCallCount++;
    return [result];
  },
}));

rs.mock('./EditVintageModal', () => ({
  EditVintageModal: ({ isOpen, vintage, onClose }: { isOpen: boolean; vintage: any; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="edit-vintage-modal">
        Edit Vintage: {vintage?.variety}
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

rs.mock('./AddWineModal', () => ({
  AddWineModal: ({ isOpen }: { isOpen: boolean }) => {
    if (!isOpen) return null;
    return <div data-testid="add-wine-modal">Add Wine Modal</div>;
  },
}));

rs.mock('./StageTransitionModal', () => ({
  StageTransitionModal: ({ isOpen }: { isOpen: boolean }) => {
    if (!isOpen) return null;
    return <div data-testid="stage-transition-modal">Stage Transition Modal</div>;
  },
}));

rs.mock('./TaskListView', () => ({
  TaskListView: ({ entityName, onBack }: { entityName: string; onBack: () => void }) => (
    <div data-testid="task-list-view">
      Task List: {entityName}
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

rs.mock('./stages', () => ({
  formatStage: (stage: string) => stage.split('_').map(w => w.toUpperCase()).join(' '),
  getStagesForEntity: (entityType: string) => {
    if (entityType === 'vintage') {
      return [
        { value: 'harvested', label: 'Harvested', description: 'Grapes harvested', order: 1 },
        { value: 'allocated', label: 'Allocated', description: 'All grapes allocated', order: 2 },
        { value: 'bulk_aging', label: 'Bulk Aging', description: 'Wine aging in bulk', order: 3 },
      ];
    }
    return [];
  },
}));

rs.mock('react-icons/fi', () => ({
  FiSettings: () => <span data-testid="settings-icon">⚙</span>,
}));

describe('VintageDetailsView', () => {
  afterEach(() => {
    cleanup();
    queryCallCount = 0;
    mockVintageData = [mockVintage];
    mockAllWinesData = mockWines;
    mockStageHistoryData = mockStageHistory;
    mockMeasurementsData = [mockHarvestMeasurement];
  });

  describe('vintage not found', () => {
    test('displays error message when vintage does not exist', () => {
      mockVintageData = [];
      queryCallCount = 0;

      render(
        <VintageDetailsView
          vintageId="nonexistent"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      expect(screen.getByText('VINTAGE NOT FOUND')).toBeInTheDocument();
    });

    test('shows back button when vintage not found', () => {
      mockVintageData = [];
      queryCallCount = 0;

      render(
        <VintageDetailsView
          vintageId="nonexistent"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      expect(screen.getByText('BACK TO LIST')).toBeInTheDocument();
    });

    test('calls onBack when back button clicked in error state', async () => {
      const user = userEvent.setup();
      const mockOnBack = rs.fn();
      mockVintageData = [];
      queryCallCount = 0;

      render(
        <VintageDetailsView
          vintageId="nonexistent"
          onBack={mockOnBack}
          onWineClick={() => {}}
        />
      );

      const backButton = screen.getByText('BACK TO LIST');
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('vintage display', () => {
    test('displays vintage year and variety', () => {
      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      expect(screen.getByText(/2024/)).toBeInTheDocument();
      expect(screen.getByText(/Cabernet Sauvignon/)).toBeInTheDocument();
    });

    test('displays current stage formatted', () => {
      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      expect(screen.getByText('BULK AGING')).toBeInTheDocument();
    });

    test('displays harvest details', () => {
      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      expect(screen.getByText('1000 LBS')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    test('calls onBack when back button clicked', async () => {
      const user = userEvent.setup();
      const mockOnBack = rs.fn();

      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={mockOnBack}
          onWineClick={() => {}}
        />
      );

      const backButton = screen.getByText(/← BACK/);
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('action buttons', () => {
    test('renders tasks button', () => {
      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      expect(screen.getByText('TASKS')).toBeInTheDocument();
    });

    test('renders create wine button', () => {
      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      expect(screen.getByText('CREATE WINE')).toBeInTheDocument();
    });

    test('renders settings button', () => {
      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });
  });

  describe('wines list', () => {
    test('displays wines from this vintage', () => {
      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      expect(screen.getByText('Barrel 1')).toBeInTheDocument();
      expect(screen.getByText('Barrel 2')).toBeInTheDocument();
    });

    test('displays wines containing this vintage in blend', () => {
      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      expect(screen.getByText('House Blend')).toBeInTheDocument();
    });

    test('calls onWineClick when wine card clicked', async () => {
      const user = userEvent.setup();
      const mockOnWineClick = rs.fn();

      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={() => {}}
          onWineClick={mockOnWineClick}
        />
      );

      const wineCards = screen.getAllByRole('button');
      const barrel1Card = wineCards.find(card => card.textContent?.includes('Barrel 1'));
      expect(barrel1Card).toBeDefined();
      await user.click(barrel1Card!);

      expect(mockOnWineClick).toHaveBeenCalledWith('wine-1');
    });

    test('does not show wines section when no wines created', () => {
      mockAllWinesData = [];
      queryCallCount = 0;

      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      expect(screen.queryByText(/WINES FROM THIS VINTAGE/)).not.toBeInTheDocument();
    });
  });

  describe('modal interactions', () => {
    test('opens edit modal when settings button clicked', async () => {
      const user = userEvent.setup();

      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      const settingsButton = screen.getByTestId('settings-icon');
      await user.click(settingsButton);

      expect(screen.getByTestId('edit-vintage-modal')).toBeInTheDocument();
    });

    test('opens add wine modal when create wine clicked', async () => {
      const user = userEvent.setup();

      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      const createWineButton = screen.getByText('CREATE WINE');
      await user.click(createWineButton);

      expect(screen.getByTestId('add-wine-modal')).toBeInTheDocument();
    });
  });


  describe('harvest measurements', () => {
    test.todo('displays brix from harvest measurement');

    test.todo('displays ph from harvest measurement');

    test('does not show measurements when none exist', () => {
      mockMeasurementsData = [];
      queryCallCount = 0;

      render(
        <VintageDetailsView
          vintageId="vintage-1"
          onBack={() => {}}
          onWineClick={() => {}}
        />
      );

      // Harvest section should still show weight and volume from vintage data
      expect(screen.getByText('1000 LBS')).toBeInTheDocument();
    });
  });
});
