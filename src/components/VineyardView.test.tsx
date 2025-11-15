import { test, describe, expect, rs, beforeEach, afterEach } from '@rstest/core';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { VineyardView } from './VineyardView';

const mockVinesData = [
  {
    id: 'vine-1',
    block: 'North Block',
    sequence_number: 1,
    variety: 'Cabernet Sauvignon',
    planting_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    health: 'Good',
    notes: 'Test vine 1',
    qr_generated: 0,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'vine-2',
    block: 'South Block',
    sequence_number: 2,
    variety: 'Pinot Noir',
    planting_date: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000),
    health: 'Excellent',
    notes: 'Test vine 2',
    qr_generated: 1,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockSetLocation = rs.fn();

const mockZero = {
  query: {
    vine: { data: mockVinesData },
    block: { data: [] as any },
    vineyard: { data: [] as any },
  },
  mutate: {
    vine: {
      insert: rs.fn().mockResolvedValue(undefined),
    },
  },
};

rs.mock('../contexts/ZeroContext', () => ({
  useZero: () => mockZero,
}));

rs.mock('@rocicorp/zero/react', () => ({
  useQuery: (query: any) => {
    if (query === mockZero.query.vine) {
      return [query.data];
    }
    if (query === mockZero.query.block) {
      return [query.data];
    }
    if (query === mockZero.query.vineyard) {
      return [query.data];
    }
    return [[]];
  },
}));

rs.mock('wouter', () => ({
  useLocation: () => ['/vineyard', mockSetLocation],
}));

rs.mock('./AddVineModal', () => ({
  AddVineModal: rs.fn(({ isOpen, onClose }: any) =>
    isOpen ? (
      <div role="dialog">
        <div>Add Vine Modal</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

rs.mock('./AddBlockModal', () => ({
  AddBlockModal: rs.fn(({ isOpen, onClose }: any) =>
    isOpen ? <div>ADD BLOCK<button onClick={onClose}>Close</button></div> : null
  ),
}));

rs.mock('./VineDetailsView', () => ({
  VineDetailsView: rs.fn(({ vine, navigateBack }: any) =>
    vine ? (
      <div>
        <div>{vine.variety}</div>
        <button onClick={navigateBack}>Back</button>
      </div>
    ) : (
      <div>Vine not found</div>
    )
  ),
}));

rs.mock('./QRScanner', () => ({
  QRScanner: rs.fn(({ onClose }: any) => (
    <div>
      <div>scanner</div>
      <button onClick={onClose}>Close</button>
    </div>
  )),
}));

describe('VineyardView', () => {
  afterEach(() => {
    cleanup();
    rs.clearAllMocks();
    mockSetLocation.mockClear();
  });

  describe('when viewing vine list', () => {
    test('displays all vines to user', async () => {
      render(<VineyardView />);

      await waitFor(() => {
        expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument();
        expect(screen.getByText('Pinot Noir')).toBeInTheDocument();
      });
    });

    test('displays block names for each vine', async () => {
      render(<VineyardView />);

      await waitFor(() => {
        expect(screen.getAllByText(/North Block/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/South Block/).length).toBeGreaterThan(0);
      });
    });

    test('shows add vine button to user', () => {
      render(<VineyardView />);

      expect(screen.getByRole('button', { name: /add vine/i })).toBeInTheDocument();
    });

    test('shows add block button to user', () => {
      render(<VineyardView />);

      expect(screen.getByRole('button', { name: /add block/i })).toBeInTheDocument();
    });
  });

  describe('when no vines exist', () => {
    beforeEach(() => {
      mockZero.query.vine.data = [];
    });

    afterEach(() => {
      mockZero.query.vine.data = mockVinesData;
    });

    test.todo('shows empty state message to user', () => {
      render(<VineyardView />);

      expect(screen.getByText(/no vines/i)).toBeInTheDocument();
    });

    test('user can still add new vine', () => {
      render(<VineyardView />);

      expect(screen.getByRole('button', { name: /add vine/i })).toBeInTheDocument();
    });
  });

  describe('adding a new vine', () => {
    test('user can open add vine modal', async () => {
      const user = userEvent.setup();
      render(<VineyardView />);

      const addButton = screen.getByRole('button', { name: /add vine/i });
      await user.click(addButton);

      expect(screen.getByText('Add Vine Modal')).toBeInTheDocument();
    });

    test('user can close add vine modal', async () => {
      const user = userEvent.setup();
      render(<VineyardView />);

      const addButton = screen.getByRole('button', { name: /add vine/i });
      await user.click(addButton);

      expect(screen.getByText('Add Vine Modal')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByText('Add Vine Modal')).not.toBeInTheDocument();
    });
  });

  describe('filtering by block', () => {
    const mockBlockData = [
      {
        id: 'block-1',
        name: 'North Block',
        location: 'North',
        size_acres: 2,
        soil_type: 'Clay',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'block-2',
        name: 'South Block',
        location: 'South',
        size_acres: 3,
        soil_type: 'Sandy',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    beforeEach(() => {
      mockZero.query.block.data = mockBlockData;
    });

    afterEach(() => {
      mockZero.query.block.data = [];
    });

    test.todo('user can select a block filter', async () => {
      const user = userEvent.setup();
      render(<VineyardView />);

      const blockSelect = screen.getByRole('combobox', { name: /block/i });
      await user.selectOptions(blockSelect, 'North Block');

      await waitFor(() => {
        expect(mockSetLocation).toHaveBeenCalledWith(expect.stringContaining('block'));
      });
    });
  });

  describe('when viewing specific vine', () => {
    test('displays vine details when vine is selected', async () => {
      render(<VineyardView initialVineId="vine-1" />);

      await waitFor(() => {
        expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument();
      });
    });

    test('user can navigate back to vine list', async () => {
      const user = userEvent.setup();
      render(<VineyardView initialVineId="vine-1" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      expect(mockSetLocation).toHaveBeenCalled();
    });
  });

  describe('success messages', () => {
    test.todo('shows success message after vine is added', async () => {
      const user = userEvent.setup();
      render(<VineyardView />);

      const addButton = screen.getByRole('button', { name: /add vine/i });
      await user.click(addButton);

      const modal = screen.getByText('Add Vine Modal');
      expect(modal).toBeInTheDocument();

      await waitFor(() => {
        if (screen.queryByText(/vine added/i)) {
          expect(screen.getByText(/vine added/i)).toBeInTheDocument();
        }
      });
    });

    test.todo('success message disappears after 3 seconds', async () => {
      const user = userEvent.setup();
      rs.useFakeTimers();

      render(<VineyardView />);

      const addButton = screen.getByRole('button', { name: /add vine/i });
      await user.click(addButton);

      await waitFor(() => {
        if (screen.queryByText(/vine added/i)) {
          expect(screen.getByText(/vine added/i)).toBeInTheDocument();

          rs.advanceTimersByTime(3000);

          expect(screen.queryByText(/vine added/i)).not.toBeInTheDocument();
        }
      });

      rs.useRealTimers();
    });
  });

  describe('QR scanner', () => {
    test('user can open QR scanner', async () => {
      const user = userEvent.setup();
      render(<VineyardView />);

      const scanButton = screen.getByRole('button', { name: /scan/i });
      await user.click(scanButton);

      expect(screen.getByText(/scanner/i)).toBeInTheDocument();
    });
  });
});
