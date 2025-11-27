import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WinesList } from './WinesList';

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}));

const mockWinesData = [
  {
    id: 'wine-1',
    name: 'Cabernet Barrel 1',
    wine_type: 'red',
    current_stage: 'primary_fermentation',
    status: 'active',
    current_volume_gallons: 5,
    blend_components: null,
  },
  {
    id: 'wine-2',
    name: 'Merlot Reserve',
    wine_type: 'red',
    current_stage: 'oak_aging',
    status: 'aging',
    current_volume_gallons: 10,
    blend_components: null,
  },
  {
    id: 'wine-3',
    name: 'House Blend',
    wine_type: 'red',
    current_stage: 'bottled',
    status: 'bottled',
    current_volume_gallons: 15,
    blend_components: [{ variety: 'Cabernet', percentage: 60 }, { variety: 'Merlot', percentage: 40 }],
  },
];

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    query: {
      wine: {},
    },
  }),
}));

let mockQueryData = mockWinesData;
rs.mock('@rocicorp/zero/react', () => ({
  useQuery: () => [mockQueryData],
}));

describe('WinesList', () => {
  afterEach(() => {
    cleanup();
    mockQueryData = mockWinesData;
  });

  describe('empty state', () => {
    test('shows empty state when no wines exist', () => {
      mockQueryData = [];

      render(<WinesList onWineClick={() => {}} />);

      expect(screen.getByText('NO WINES YET')).toBeInTheDocument();
      expect(screen.getByText('CREATE YOUR FIRST WINE FROM A VINTAGE')).toBeInTheDocument();
    });
  });

  describe('wine organization', () => {
    test('organizes wines by status into sections', () => {
      render(<WinesList onWineClick={() => {}} />);

      expect(screen.getByText('ACTIVE WINES')).toBeInTheDocument();
      expect(screen.getByText('AGING WINES')).toBeInTheDocument();
      expect(screen.getByText('BOTTLED WINES')).toBeInTheDocument();
    });

    test('displays active wines in active section', () => {
      render(<WinesList onWineClick={() => {}} />);

      const activeSection = screen.getByText('ACTIVE WINES').parentElement;
      expect(activeSection).toHaveTextContent('Cabernet Barrel 1');
    });

    test('displays aging wines in aging section', () => {
      render(<WinesList onWineClick={() => {}} />);

      const agingSection = screen.getByText('AGING WINES').parentElement;
      expect(agingSection).toHaveTextContent('Merlot Reserve');
    });

    test('displays bottled wines in bottled section', () => {
      render(<WinesList onWineClick={() => {}} />);

      const bottledSection = screen.getByText('BOTTLED WINES').parentElement;
      expect(bottledSection).toHaveTextContent('House Blend');
    });

    test('only renders sections with wines', () => {
      mockQueryData = [mockWinesData[0]]; // Only active wine

      render(<WinesList onWineClick={() => {}} />);

      expect(screen.getByText('ACTIVE WINES')).toBeInTheDocument();
      expect(screen.queryByText('AGING WINES')).not.toBeInTheDocument();
      expect(screen.queryByText('BOTTLED WINES')).not.toBeInTheDocument();
    });
  });

  describe('wine card rendering', () => {
    test('displays wine name', () => {
      render(<WinesList onWineClick={() => {}} />);

      expect(screen.getByText('Cabernet Barrel 1')).toBeInTheDocument();
      expect(screen.getByText('Merlot Reserve')).toBeInTheDocument();
      expect(screen.getByText('House Blend')).toBeInTheDocument();
    });

    test('displays formatted stage', () => {
      render(<WinesList onWineClick={() => {}} />);

      expect(screen.getByText('PRIMARY FERMENTATION')).toBeInTheDocument();
      expect(screen.getByText('OAK AGING')).toBeInTheDocument();
    });

    test('displays wine type in uppercase', () => {
      render(<WinesList onWineClick={() => {}} />);

      const typeLabels = screen.getAllByText('RED');
      expect(typeLabels.length).toBeGreaterThan(0);
    });

    test('displays current volume', () => {
      render(<WinesList onWineClick={() => {}} />);

      expect(screen.getByText('5 GAL')).toBeInTheDocument();
      expect(screen.getByText('10 GAL')).toBeInTheDocument();
      expect(screen.getByText('15 GAL')).toBeInTheDocument();
    });

    test('shows BLEND badge for wines with blend components', () => {
      render(<WinesList onWineClick={() => {}} />);

      expect(screen.getByText('BLEND')).toBeInTheDocument();
    });

    test('shows VARIETAL badge for non-blend wines', () => {
      render(<WinesList onWineClick={() => {}} />);

      const varietalBadges = screen.getAllByText('VARIETAL');
      expect(varietalBadges.length).toBe(2);
    });
  });

  describe('user interactions', () => {
    test('calls onWineClick when wine card is clicked', async () => {
      const user = userEvent.setup();
      const mockOnWineClick = rs.fn();

      render(<WinesList onWineClick={mockOnWineClick} />);

      // Get all wine cards and find the one with "Cabernet Barrel 1"
      const wineCards = screen.getAllByRole('button');
      const cabCard = wineCards.find(card => card.textContent?.includes('Cabernet Barrel 1'));
      expect(cabCard).toBeDefined();
      await user.click(cabCard!);

      expect(mockOnWineClick).toHaveBeenCalledWith('wine-1');
    });

    test('calls onWineClick when Enter key is pressed on wine card', async () => {
      const user = userEvent.setup();
      const mockOnWineClick = rs.fn();

      render(<WinesList onWineClick={mockOnWineClick} />);

      const wineCards = screen.getAllByRole('button');
      const merlotCard = wineCards.find(card => card.textContent?.includes('Merlot Reserve'));
      expect(merlotCard).toBeDefined();
      merlotCard!.focus();
      await user.keyboard('{Enter}');

      expect(mockOnWineClick).toHaveBeenCalledWith('wine-2');
    });

    test('does not call onWineClick for non-Enter keys', async () => {
      const user = userEvent.setup();
      const mockOnWineClick = rs.fn();

      render(<WinesList onWineClick={mockOnWineClick} />);

      const wineCards = screen.getAllByRole('button');
      const blendCard = wineCards.find(card => card.textContent?.includes('House Blend'));
      expect(blendCard).toBeDefined();
      blendCard!.focus();
      await user.keyboard('{Space}');

      expect(mockOnWineClick).not.toHaveBeenCalled();
    });
  });

  describe('formatStage function', () => {
    test('formats underscored stages correctly', () => {
      const wineWithStage = [{
        ...mockWinesData[0],
        current_stage: 'secondary_fermentation',
      }];
      mockQueryData = wineWithStage;

      render(<WinesList onWineClick={() => {}} />);

      expect(screen.getByText('SECONDARY FERMENTATION')).toBeInTheDocument();
    });

    test('handles single word stages', () => {
      const wineWithStage = [{
        ...mockWinesData[0],
        current_stage: 'bottled',
      }];
      mockQueryData = wineWithStage;

      render(<WinesList onWineClick={() => {}} />);

      expect(screen.getByText('BOTTLED')).toBeInTheDocument();
    });
  });
});
