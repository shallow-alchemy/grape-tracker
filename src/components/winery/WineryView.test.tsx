import { test, describe, expect, rs, afterEach, beforeEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { WineryView } from './WineryView';

// Create mock data
const mockVintagesData: any[] = [];

const mockZero = {
  query: {
    vintage: { data: mockVintagesData },
  },
};

// Mock Zero context
rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => mockZero,
}));

// Mock useQuery from Zero
rs.mock('@rocicorp/zero/react', () => ({
  useQuery: (query: any) => {
    if (query === mockZero.query.vintage) {
      return [query.data];
    }
    return [[]];
  },
}));

// Mock AddVintageModal
rs.mock('./AddVintageModal', () => ({
  AddVintageModal: rs.fn(({ isOpen, onClose, onSuccess }: any) =>
    isOpen ? (
      <div role="dialog" data-testid="add-vintage-modal">
        <div>Add Vintage Modal</div>
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSuccess('Vintage added!')}>Submit</button>
      </div>
    ) : null
  ),
}));

// Mock VintagesList
rs.mock('./VintagesList', () => ({
  VintagesList: rs.fn(() => (
    <div data-testid="vintages-list">
      <div>Vintages List</div>
    </div>
  )),
}));

// Mock VintageDetailsView
rs.mock('./VintageDetailsView', () => ({
  VintageDetailsView: rs.fn(({ vintageId, onBack }: any) => (
    <div data-testid="vintage-details">
      <div>Vintage Details: {vintageId}</div>
      <button onClick={onBack}>Back</button>
    </div>
  )),
}));

describe('WineryView', () => {
  beforeEach(() => {
    rs.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    rs.useRealTimers();
    mockVintagesData.length = 0;
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

    test.todo('displays add wine button');
    test.todo('displays manage inventory button');
    test.todo('displays settings gear icon');
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

    test.todo('opens add wine modal when button clicked');
    test.todo('opens inventory modal when button clicked');
    test.todo('opens settings modal when gear clicked');
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

  describe('wine sections', () => {
    test.todo('displays active wines section');
    test.todo('displays aging wines section');
    test.todo('displays bottled wines section');
    test.todo('shows count badge on section headers');
  });

  describe('wine card display', () => {
    test.todo('shows wine name and vintage info');
    test.todo('shows current stage');
    test.todo('shows days in stage');
    test.todo('shows latest measurements');
    test.todo('shows current volume');
    test.todo('shows next pending task');
  });

  describe('wine card interactions', () => {
    test.todo('navigates to wine detail when card clicked');
    test.todo('shows wine detail with stage history');
    test.todo('shows wine detail with task list');
    test.todo('shows wine detail with measurement history');
  });

  describe('section collapsing', () => {
    test.todo('collapses section when header clicked');
    test.todo('expands section when clicked again');
    test.todo('active wines expanded by default');
    test.todo('bottled wines collapsed by default');
  });

  describe('empty states', () => {
    test.todo('shows empty message when no wines exist');
    test.todo('shows helpful cta for creating first vintage');
    test.todo('shows empty state per section');
  });

  describe('wine sorting', () => {
    test.todo('sorts wines by updated date descending');
    test.todo('groups by status correctly');
  });

  describe('vintage display', () => {
    test.todo('shows vintages when no wines created yet');
    test.todo('shows vintage stage');
    test.todo('navigates to vintage detail when clicked');
  });

  describe('overdue task indicators', () => {
    test.todo('highlights wines with overdue tasks');
    test.todo('shows urgent indicator for critical tasks');
    test.todo('shows count of overdue tasks');
  });

  describe('data loading', () => {
    test.todo('shows loading state initially');
    test.todo('shows content when data loaded');
    test.todo('refreshes when new wine created');
  });

});

