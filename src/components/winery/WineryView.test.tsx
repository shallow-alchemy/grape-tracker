import { test, describe, expect, rs, afterEach, beforeEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { WineryView } from './WineryView';

const mockVintagesData: any[] = [];
const mockWinesData: any[] = [];
const mockActiveWinesData: any[] = [];

const mockSetLocation = rs.fn();
let mockLocation = '/winery/vintages';

const mockZero = {
  query: {
    vintage: { data: mockVintagesData },
    wine: { data: mockWinesData },
  },
};

rs.mock('wouter', () => ({
  useLocation: () => [mockLocation, mockSetLocation],
}));

rs.mock('../../App.module.css', () => ({
  default: {},
}));

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-123',
    },
  }),
}));

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => mockZero,
}));

rs.mock('../../shared/queries', () => ({
  myVintages: () => ({ customQueryID: { name: 'myVintages' } }),
  myWines: () => ({ customQueryID: { name: 'myWines' } }),
  activeWines: () => ({ customQueryID: { name: 'activeWines' } }),
}));

rs.mock('@rocicorp/zero/react', () => ({
  useQuery: (query: any) => {
    const queryName = query?.customQueryID?.name;
    if (queryName === 'myVintages') return [mockVintagesData];
    if (queryName === 'myWines') return [mockWinesData];
    if (queryName === 'activeWines') return [mockActiveWinesData];
    return [[]];
  },
}));

rs.mock('./AddVintageModal', () => ({
  AddVintageModal: ({ isOpen, onClose, onSuccess }: any) =>
    isOpen ? (
      <div role="dialog" data-testid="add-vintage-modal">
        <div>Add Vintage Modal</div>
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSuccess('Vintage added!')}>Submit</button>
      </div>
    ) : null,
}));

rs.mock('./AddWineModal', () => ({
  AddWineModal: ({ isOpen, onClose, onSuccess }: any) =>
    isOpen ? (
      <div role="dialog" data-testid="add-wine-modal">
        <div>Add Wine Modal</div>
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSuccess('Wine added!')}>Submit</button>
      </div>
    ) : null,
}));

rs.mock('./VintagesList', () => ({
  VintagesList: () => (
    <div data-testid="vintages-list">
      <div>Vintages List</div>
    </div>
  ),
}));

rs.mock('./WinesList', () => ({
  WinesList: () => (
    <div data-testid="wines-list">
      <div>Wines List</div>
    </div>
  ),
}));

rs.mock('./VintageDetailsView', () => ({
  VintageDetailsView: ({ vintageId, onBack, onWineClick: _onWineClick }: any) => (
    <div data-testid="vintage-details">
      <div>Vintage Details: {vintageId}</div>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

rs.mock('./WineDetailsView', () => ({
  WineDetailsView: ({ wineId, onBack }: any) => (
    <div data-testid="wine-details">
      <div>Wine Details: {wineId}</div>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

describe('WineryView', () => {
  beforeEach(() => {
    rs.clearAllMocks();
    mockLocation = '/winery/vintages';
    mockVintagesData.length = 0;
    mockWinesData.length = 0;
    mockActiveWinesData.length = 0;
  });

  afterEach(() => {
    cleanup();
    rs.useRealTimers();
  });

  describe('header', () => {
    test('displays winery label', () => {
      render(<WineryView />);
      expect(screen.getByText('WINERY')).toBeInTheDocument();
    });

    test('displays add vintage button', () => {
      render(<WineryView />);
      expect(screen.getByText('ADD VINTAGE')).toBeInTheDocument();
    });

    test('displays active wines count badge', () => {
      mockActiveWinesData.push({ id: 'wine-1' }, { id: 'wine-2' });
      render(<WineryView />);
      expect(screen.getByText('2 ACTIVE WINES')).toBeInTheDocument();
    });

    test('displays singular wine when count is 1', () => {
      mockActiveWinesData.push({ id: 'wine-1' });
      render(<WineryView />);
      expect(screen.getByText('1 ACTIVE WINE')).toBeInTheDocument();
    });
  });

  describe('button actions', () => {
    test('opens add vintage modal when button clicked', async () => {
      const user = userEvent.setup();
      render(<WineryView />);

      // Modal should not be visible initially
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Click ADD VINTAGE button
      await user.click(screen.getByText('ADD VINTAGE'));

      // Modal should now be visible
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('can close add vintage modal', async () => {
      const user = userEvent.setup();
      render(<WineryView />);

      // Open the modal
      await user.click(screen.getByText('ADD VINTAGE'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close the modal
      await user.click(screen.getByText('Close'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('shows success message after adding vintage', async () => {
      const user = userEvent.setup();
      render(<WineryView />);

      // Open modal and submit
      await user.click(screen.getByText('ADD VINTAGE'));
      await user.click(screen.getByText('Submit'));

      // Success message should appear
      expect(screen.getByText('Vintage added!')).toBeInTheDocument();
    });

    test('success message disappears after timeout', async () => {
      const user = userEvent.setup();
      render(<WineryView />);

      // Trigger success message
      await user.click(screen.getByText('ADD VINTAGE'));
      await user.click(screen.getByText('Submit'));

      expect(screen.getByText('Vintage added!')).toBeInTheDocument();

      // Wait for timeout to complete (3 seconds + buffer)
      await new Promise(resolve => setTimeout(resolve, 3100));

      // Message should be gone
      expect(screen.queryByText('Vintage added!')).not.toBeInTheDocument();
    });

  });

  describe('tab navigation', () => {
    test('displays vintages and wines tabs', () => {
      render(<WineryView />);
      expect(screen.getByText('VINTAGES')).toBeInTheDocument();
      expect(screen.getByText('WINES')).toBeInTheDocument();
    });

    test('clicking wines tab calls setLocation', async () => {
      const user = userEvent.setup();
      render(<WineryView />);

      await user.click(screen.getByText('WINES'));
      expect(mockSetLocation).toHaveBeenCalledWith('/winery/wines');
    });

    test('clicking vintages tab calls setLocation', async () => {
      const user = userEvent.setup();
      mockLocation = '/winery/wines';
      render(<WineryView />);

      await user.click(screen.getByText('VINTAGES'));
      expect(mockSetLocation).toHaveBeenCalledWith('/winery/vintages');
    });

    test('shows wines list when on wines tab', () => {
      mockLocation = '/winery/wines';
      render(<WineryView />);
      expect(screen.getByTestId('wines-list')).toBeInTheDocument();
    });

    test('shows vintages list when on vintages tab', () => {
      render(<WineryView />);
      expect(screen.getByTestId('vintages-list')).toBeInTheDocument();
    });
  });

  describe('content display', () => {
    test('displays vintages list', () => {
      render(<WineryView />);
      expect(screen.getByTestId('vintages-list')).toBeInTheDocument();
    });

    test('success message does not appear initially', () => {
      render(<WineryView />);
      expect(screen.queryByText(/added/i)).not.toBeInTheDocument();
    });

    test('modal is closed initially', () => {
      render(<WineryView />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('success message appears immediately after submit', async () => {
      const user = userEvent.setup();
      render(<WineryView />);

      // Before submitting - no message
      expect(screen.queryByText('Vintage added!')).not.toBeInTheDocument();

      // Open and submit
      await user.click(screen.getByText('ADD VINTAGE'));
      await user.click(screen.getByText('Submit'));

      // Message should appear immediately
      expect(screen.getByText('Vintage added!')).toBeInTheDocument();
    });

    test('can reopen modal after closing', async () => {
      const user = userEvent.setup();
      render(<WineryView />);

      // Open modal
      await user.click(screen.getByText('ADD VINTAGE'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close modal
      await user.click(screen.getByText('Close'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Reopen modal
      await user.click(screen.getByText('ADD VINTAGE'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('multiple success messages work correctly', async () => {
      const user = userEvent.setup();
      render(<WineryView />);

      // Trigger first success message
      await user.click(screen.getByText('ADD VINTAGE'));
      await user.click(screen.getByText('Submit'));
      expect(screen.getByText('Vintage added!')).toBeInTheDocument();

      // Close modal
      await user.click(screen.getByText('Close'));

      // Trigger second success message
      await user.click(screen.getByText('ADD VINTAGE'));
      await user.click(screen.getByText('Submit'));
      expect(screen.getByText('Vintage added!')).toBeInTheDocument();
    });
  });

  describe('detail views', () => {
    test('renders vintage details when initialVintageId provided', () => {
      render(<WineryView initialVintageId="vintage-123" />);
      expect(screen.getByTestId('vintage-details')).toBeInTheDocument();
      expect(screen.getByText('Vintage Details: vintage-123')).toBeInTheDocument();
    });

    test('renders wine details when initialWineId provided', () => {
      render(<WineryView initialWineId="wine-456" />);
      expect(screen.getByTestId('wine-details')).toBeInTheDocument();
      expect(screen.getByText('Wine Details: wine-456')).toBeInTheDocument();
    });
  });

  describe('add wine button on wines tab', () => {
    test('shows add wine button when on wines tab', () => {
      mockLocation = '/winery/wines';
      render(<WineryView />);
      expect(screen.getByText('ADD WINE')).toBeInTheDocument();
    });

    test('opens add wine modal when button clicked on wines tab', async () => {
      const user = userEvent.setup();
      mockLocation = '/winery/wines';
      render(<WineryView />);

      expect(screen.queryByTestId('add-wine-modal')).not.toBeInTheDocument();

      await user.click(screen.getByText('ADD WINE'));
      expect(screen.getByTestId('add-wine-modal')).toBeInTheDocument();
    });
  });
});

