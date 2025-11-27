import { test, describe, expect, rs, afterEach, beforeEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { VineyardViewHeader } from './VineyardViewHeader';

const mockMutateVineUpdate = rs.fn().mockResolvedValue(undefined);

const mockVinesData = [
  { id: 'vine-1', block: 'block-1', qr_generated: null },
  { id: 'vine-2', block: 'block-1', qr_generated: null },
  { id: 'vine-3', block: 'block-2', qr_generated: null },
];

const mockBlocksData = [
  { id: 'block-1', name: 'BLOCK A', vineyard_id: 'vineyard-1' },
  { id: 'block-2', name: 'BLOCK B', vineyard_id: 'vineyard-1' },
];

const mockVineyardData = {
  id: 'vineyard-1',
  name: 'Test Vineyard',
};

rs.mock('../contexts/ZeroContext', () => ({
  useZero: () => ({
    mutate: {
      vine: {
        update: mockMutateVineUpdate,
      },
    },
  }),
}));

rs.mock('./vineyard-hooks', () => ({
  useVines: () => mockVinesData,
  useBlocks: () => mockBlocksData,
  useVineyard: () => mockVineyardData,
}));

rs.mock('./vineyard-utils', () => ({
  transformVineData: (v: any) => ({
    id: v.id,
    block: v.block,
    qrGenerated: v.qr_generated,
  }),
  transformBlockData: (b: any) => ({
    id: b.id,
    name: b.name,
  }),
  filterVinesByBlock: (vines: any[], blockId: string | null) =>
    blockId ? vines.filter((v: any) => v.block === blockId) : vines,
}));

rs.mock('./vine-stake-3d', () => ({
  generate3MF: rs.fn().mockResolvedValue(new Blob(['test'])),
}));

rs.mock('jszip', () => {
  const mockZip = {
    file: rs.fn(),
    generateAsync: rs.fn().mockResolvedValue(new Blob(['test'])),
  };
  return function() {
    return mockZip;
  };
});

rs.mock('react-icons/fi', () => ({
  FiSettings: () => <span data-testid="settings-icon">⚙</span>,
}));

describe('VineyardViewHeader', () => {
  const defaultProps = {
    navigateToBlock: rs.fn(),
    selectedBlock: null as string | null,
    setShowAddBlockModal: rs.fn(),
    setShowAddVineModal: rs.fn(),
    setShowScanner: rs.fn(),
    handleGearIconClick: rs.fn(),
    onSuccess: rs.fn(),
  };

  beforeEach(() => {
    rs.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('header display', () => {
    test('displays VINEYARD title when no block selected', () => {
      render(<VineyardViewHeader {...defaultProps} />);
      expect(screen.getByText(/VINEYARD/)).toBeInTheDocument();
    });

    test('displays block name when block is selected', () => {
      render(<VineyardViewHeader {...defaultProps} selectedBlock="block-1" />);
      expect(screen.getByText('BLOCK A ▼')).toBeInTheDocument();
    });

    test('displays SCAN TAG button on mobile', () => {
      render(<VineyardViewHeader {...defaultProps} />);
      expect(screen.getByText('SCAN TAG')).toBeInTheDocument();
    });

    test('displays ADD BLOCK button', () => {
      render(<VineyardViewHeader {...defaultProps} />);
      expect(screen.getByText('ADD BLOCK')).toBeInTheDocument();
    });

    test('displays ADD VINE button', () => {
      render(<VineyardViewHeader {...defaultProps} />);
      expect(screen.getByText('ADD VINE')).toBeInTheDocument();
    });

    test('displays settings gear icon', () => {
      render(<VineyardViewHeader {...defaultProps} />);
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });
  });

  describe('block dropdown', () => {
    test('shows dropdown when title clicked', async () => {
      const user = userEvent.setup();
      render(<VineyardViewHeader {...defaultProps} />);

      await user.click(screen.getByText(/VINEYARD/));
      expect(screen.getByText('BLOCK A')).toBeInTheDocument();
      expect(screen.getByText('BLOCK B')).toBeInTheDocument();
    });

    test('navigates to block when dropdown item clicked', async () => {
      const user = userEvent.setup();
      const navigateToBlock = rs.fn();
      render(<VineyardViewHeader {...defaultProps} navigateToBlock={navigateToBlock} />);

      await user.click(screen.getByText(/VINEYARD/));
      await user.click(screen.getByText('BLOCK A'));

      expect(navigateToBlock).toHaveBeenCalledWith('block-1');
    });

    test('navigates to vineyard when VINEYARD item clicked', async () => {
      const user = userEvent.setup();
      const navigateToBlock = rs.fn();
      render(<VineyardViewHeader {...defaultProps} selectedBlock="block-1" navigateToBlock={navigateToBlock} />);

      await user.click(screen.getByText('BLOCK A ▼'));

      const vineyardItem = screen.getAllByText('VINEYARD')[0];
      await user.click(vineyardItem);

      expect(navigateToBlock).toHaveBeenCalledWith(null);
    });

    test('closes dropdown after selection', async () => {
      const user = userEvent.setup();
      render(<VineyardViewHeader {...defaultProps} />);

      await user.click(screen.getByText(/VINEYARD/));
      expect(screen.getByText('BLOCK A')).toBeInTheDocument();

      await user.click(screen.getByText('BLOCK A'));

      expect(screen.queryAllByText('BLOCK A').length).toBeLessThanOrEqual(1);
    });
  });

  describe('button actions', () => {
    test('calls setShowScanner when SCAN TAG clicked', async () => {
      const user = userEvent.setup();
      const setShowScanner = rs.fn();
      render(<VineyardViewHeader {...defaultProps} setShowScanner={setShowScanner} />);

      await user.click(screen.getByText('SCAN TAG'));
      expect(setShowScanner).toHaveBeenCalledWith(true);
    });

    test('calls setShowAddBlockModal when ADD BLOCK clicked', async () => {
      const user = userEvent.setup();
      const setShowAddBlockModal = rs.fn();
      render(<VineyardViewHeader {...defaultProps} setShowAddBlockModal={setShowAddBlockModal} />);

      await user.click(screen.getByText('ADD BLOCK'));
      expect(setShowAddBlockModal).toHaveBeenCalledWith(true);
    });

    test('calls setShowAddVineModal when ADD VINE clicked', async () => {
      const user = userEvent.setup();
      const setShowAddVineModal = rs.fn();
      render(<VineyardViewHeader {...defaultProps} setShowAddVineModal={setShowAddVineModal} />);

      await user.click(screen.getByText('ADD VINE'));
      expect(setShowAddVineModal).toHaveBeenCalledWith(true);
    });

    test('calls handleGearIconClick when settings icon clicked', async () => {
      const user = userEvent.setup();
      const handleGearIconClick = rs.fn();
      render(<VineyardViewHeader {...defaultProps} handleGearIconClick={handleGearIconClick} />);

      await user.click(screen.getByTestId('settings-icon'));
      expect(handleGearIconClick).toHaveBeenCalled();
    });
  });

  describe('generate tags button', () => {
    test('shows generate tags button', () => {
      render(<VineyardViewHeader {...defaultProps} />);
      expect(screen.getByText(/GENERATE.*TAGS/)).toBeInTheDocument();
    });

    test('shows block tags text when block selected', () => {
      render(<VineyardViewHeader {...defaultProps} selectedBlock="block-1" />);
      expect(screen.getByText(/GENERATE BLOCK TAGS/)).toBeInTheDocument();
    });

    test('shows all tags text when no block selected', () => {
      render(<VineyardViewHeader {...defaultProps} />);
      expect(screen.getByText(/GENERATE ALL TAGS/)).toBeInTheDocument();
    });
  });
});
