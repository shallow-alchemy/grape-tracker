import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WineDetailsView } from './WineDetailsView';

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}));

const now = Date.now();
const mockWine = {
  id: 'wine-1',
  name: 'Cabernet Barrel 1',
  wine_type: 'red',
  current_stage: 'primary_fermentation',
  status: 'active',
  current_volume_gallons: 5,
  volume_gallons: 5.5,
  vintage_id: 'vintage-1',
  blend_components: null,
};

const mockBlendWine = {
  id: 'wine-2',
  name: 'House Blend',
  wine_type: 'red',
  current_stage: 'oak_aging',
  status: 'aging',
  current_volume_gallons: 10,
  volume_gallons: 12,
  vintage_id: 'vintage-1',
  blend_components: [
    { vintage_id: 'vintage-1', percentage: 60 },
    { vintage_id: 'vintage-2', percentage: 40 },
  ],
};

const mockVintage = {
  id: 'vintage-1',
  vintage_year: 2024,
  variety: 'Cabernet Sauvignon',
};

const mockVintage2 = {
  id: 'vintage-2',
  vintage_year: 2023,
  variety: 'Merlot',
};

const mockStageHistory = [
  {
    id: 'history-1',
    entity_type: 'wine',
    entity_id: 'wine-1',
    stage: 'primary_fermentation',
    started_at: now - 86400000 * 5, // 5 days ago
    completed_at: null,
  },
  {
    id: 'history-2',
    entity_type: 'wine',
    entity_id: 'wine-1',
    stage: 'primary',
    started_at: now - 86400000 * 10, // 10 days ago
    completed_at: now - 86400000 * 5, // completed 5 days ago
  },
];

const mockMeasurements = [
  {
    id: 'measure-1',
    entity_type: 'wine',
    entity_id: 'wine-1',
    date: now - 86400000,
    specific_gravity: 1.020,
    ph: 3.5,
    temperature_f: 68,
  },
  {
    id: 'measure-2',
    entity_type: 'wine',
    entity_id: 'wine-1',
    date: now - 86400000 * 3,
    specific_gravity: 1.025,
    ph: 3.6,
    temperature_f: 70,
  },
];

type MockWine = {
  id: string;
  name: string;
  wine_type: string;
  current_stage: string;
  status: string;
  current_volume_gallons: number;
  volume_gallons: number;
  vintage_id: string;
  blend_components: null | { vintage_id: string; percentage: number }[];
};

let mockWineData: MockWine[] = [mockWine];
let mockAllVintagesData = [mockVintage, mockVintage2];
let mockStageHistoryData = mockStageHistory;
let mockMeasurementsData = mockMeasurements;

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({}),
}));

rs.mock('@rocicorp/zero/react', () => ({
  useQuery: (query: any) => {
    const queryName = query?.customQueryID?.name;
    if (queryName === 'myWines') {
      return [mockWineData];
    }
    if (queryName === 'myVintages') {
      return [mockAllVintagesData];
    }
    if (queryName === 'myStageHistoryByEntity') {
      return [mockStageHistoryData];
    }
    if (queryName === 'myMeasurementsByEntity') {
      return [mockMeasurementsData];
    }
    return [[]];
  },
}));

rs.mock('./EditWineModal', () => ({
  EditWineModal: ({ isOpen, wine, onClose }: { isOpen: boolean; wine: any; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="edit-wine-modal">
        Edit Wine: {wine?.name}
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

rs.mock('./StageTransitionModal', () => ({
  StageTransitionModal: ({ isOpen }: { isOpen: boolean }) => {
    if (!isOpen) return null;
    return <div data-testid="stage-transition-modal">Stage Transition Modal</div>;
  },
}));

rs.mock('./AddMeasurementModal', () => ({
  AddMeasurementModal: ({ isOpen }: { isOpen: boolean }) => {
    if (!isOpen) return null;
    return <div data-testid="add-measurement-modal">Add Measurement Modal</div>;
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

rs.mock('react-icons/fi', () => ({
  FiSettings: () => <span data-testid="settings-icon">⚙</span>,
}));

describe('WineDetailsView', () => {
  afterEach(() => {
    cleanup();
    mockWineData = [mockWine];
    mockAllVintagesData = [mockVintage, mockVintage2];
    mockStageHistoryData = mockStageHistory;
    mockMeasurementsData = mockMeasurements;
  });

  describe('wine not found', () => {
    test('displays error message when wine does not exist', () => {
      mockWineData = [];
      render(<WineDetailsView wineId="nonexistent" onBack={() => {}} />);

      expect(screen.getByText('WINE NOT FOUND')).toBeInTheDocument();
    });

    test('shows back button when wine not found', () => {
      mockWineData = [];
      render(<WineDetailsView wineId="nonexistent" onBack={() => {}} />);

      expect(screen.getByText('BACK TO LIST')).toBeInTheDocument();
    });

    test('calls onBack when back button clicked in error state', async () => {
      const user = userEvent.setup();
      const mockOnBack = rs.fn();
      mockWineData = [];
      render(<WineDetailsView wineId="nonexistent" onBack={mockOnBack} />);

      const backButton = screen.getByText('BACK TO LIST');
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('wine display', () => {
    test('displays wine name with vintage year', () => {
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByText('2024 Cabernet Barrel 1')).toBeInTheDocument();
    });

    test('displays current stage formatted', () => {
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      const stageLabels = screen.getAllByText('PRIMARY FERMENTATION');
      expect(stageLabels.length).toBeGreaterThan(0);
    });

    test('displays days in current stage', () => {
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByText(/\(5 days\)/)).toBeInTheDocument();
    });

    test('displays wine type', () => {
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      const redLabels = screen.getAllByText('RED');
      expect(redLabels.length).toBeGreaterThan(0);
    });

    test('displays wine status', () => {
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByText('FERMENTING')).toBeInTheDocument();
    });

    test('displays current volume', () => {
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByText('5 GAL')).toBeInTheDocument();
    });

    test('displays starting volume', () => {
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByText('5.5 GAL')).toBeInTheDocument();
    });
  });

  describe('blend information', () => {
    test('shows blend varieties for blend wines', () => {
      mockWineData = [mockBlendWine];
      render(<WineDetailsView wineId="wine-2" onBack={() => {}} />);

      expect(screen.getByText(/Multi-Vintage Blend/)).toBeInTheDocument();
    });

    test('displays blend component percentages', () => {
      mockWineData = [mockBlendWine];
      render(<WineDetailsView wineId="wine-2" onBack={() => {}} />);

      expect(screen.getByText(/60%/)).toBeInTheDocument();
      expect(screen.getByText(/40%/)).toBeInTheDocument();
    });

    test('displays source vintage for non-blend wines', () => {
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByText('SOURCE VINTAGE')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    test('calls onBack when back button clicked', async () => {
      const user = userEvent.setup();
      const mockOnBack = rs.fn();

      render(<WineDetailsView wineId="wine-1" onBack={mockOnBack} />);

      const backButton = screen.getByText(/← BACK/);
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('action buttons', () => {
    test('renders tasks button', () => {
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByText('TASKS')).toBeInTheDocument();
    });

    test('renders add measurement button', () => {
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByText('ADD MEASUREMENT')).toBeInTheDocument();
    });

    test('renders mark complete button', () => {
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByText('Mark Complete →')).toBeInTheDocument();
    });

    test('renders settings button', () => {
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });
  });

  describe('modal interactions', () => {
    test('opens edit modal when settings button clicked', async () => {
      const user = userEvent.setup();

      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      const settingsButton = screen.getByTestId('settings-icon');
      await user.click(settingsButton);

      expect(screen.getByTestId('edit-wine-modal')).toBeInTheDocument();
    });

    test('opens stage transition modal when mark complete clicked', async () => {
      const user = userEvent.setup();

      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      const completeButton = screen.getByText('Mark Complete →');
      await user.click(completeButton);

      expect(screen.getByTestId('stage-transition-modal')).toBeInTheDocument();
    });

    test('opens add measurement modal when add measurement clicked', async () => {
      const user = userEvent.setup();

      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      const measurementButton = screen.getByText('ADD MEASUREMENT');
      await user.click(measurementButton);

      expect(screen.getByTestId('add-measurement-modal')).toBeInTheDocument();
    });
  });


  describe('formatStage function', () => {
    test('formats underscored stages correctly', () => {
      mockWineData = [{
        ...mockWine,
        current_stage: 'oak_aging',
      }];
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByText('OAK AGING')).toBeInTheDocument();
    });

    test('handles single word stages', () => {
      mockWineData = [{
        ...mockWine,
        current_stage: 'bottled',
      }];
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByText('BOTTLED')).toBeInTheDocument();
    });
  });

  describe('days in stage calculation', () => {
    test('shows singular day when only 1 day', () => {
      mockStageHistoryData = [{
        id: 'history-1',
        entity_type: 'wine',
        entity_id: 'wine-1',
        stage: 'primary_fermentation',
        started_at: now - 86400000, // 1 day ago
        completed_at: null,
      }];
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByText(/\(1 day\)/)).toBeInTheDocument();
    });

    test('shows plural days when multiple days', () => {
      render(<WineDetailsView wineId="wine-1" onBack={() => {}} />);

      expect(screen.getByText(/\(5 days\)/)).toBeInTheDocument();
    });
  });
});
