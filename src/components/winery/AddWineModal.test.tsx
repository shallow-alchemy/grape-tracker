import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AddWineModal } from './AddWineModal';

const mockWineInsert = rs.fn().mockResolvedValue(undefined);
const mockStageHistoryInsert = rs.fn().mockResolvedValue(undefined);

const mockVintagesData = [
  {
    id: 'vintage-2024-cab',
    vintage_year: 2024,
    variety: 'Cabernet Sauvignon',
    vineyard_id: 'test-vineyard-id',
    grape_source: 'own_vineyard',
    harvest_volume_gallons: 50,
    supplier_name: null,
  },
  {
    id: 'vintage-2023-merlot',
    vintage_year: 2023,
    variety: 'Merlot',
    vineyard_id: 'test-vineyard-id',
    grape_source: 'own_vineyard',
    harvest_volume_gallons: 30,
    supplier_name: null,
  },
  {
    id: 'vintage-2024-pinot-purchased',
    vintage_year: 2024,
    variety: 'Pinot Noir',
    vineyard_id: 'test-vineyard-id',
    grape_source: 'purchased',
    harvest_volume_gallons: 40,
    supplier_name: 'Napa Grapes',
  },
];

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-123',
    },
  }),
}));

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    mutate: {
      wine: {
        insert: mockWineInsert,
      },
      stage_history: {
        insert: mockStageHistoryInsert,
      },
    },
  }),
}));

rs.mock('../../shared/queries', () => ({
  myVintages: () => ({ customQueryID: { name: 'myVintages' } }),
}));

rs.mock('@rocicorp/zero/react', () => ({
  useQuery: (query: any) => {
    if (query?.customQueryID?.name === 'myVintages') {
      return [mockVintagesData];
    }
    return [[]];
  },
}));

describe('AddWineModal', () => {
  afterEach(() => {
    cleanup();
    mockWineInsert.mockClear();
    mockStageHistoryInsert.mockClear();
    mockWineInsert.mockResolvedValue(undefined);
    mockStageHistoryInsert.mockResolvedValue(undefined);
  });

  describe('visibility', () => {
    test('does not render when closed', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={false}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.queryByText('ADD WINE')).not.toBeInTheDocument();
    });

    test('renders when opened', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('ADD WINE')).toBeInTheDocument();
    });

    test('closes when cancel button clicked', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('closes when successfully submitted', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const vintageSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(vintageSelect, 'vintage-2024-cab');

      const nameInput = screen.getByPlaceholderText(/lodi/i);
      await user.type(nameInput, 'Reserve');

      const volumeInput = screen.getByPlaceholderText(/5\.0/i);
      await user.type(volumeInput, '10');

      const submitButton = screen.getByRole('button', { name: /create wine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onClose).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe('form fields', () => {
    test('displays vintage dropdown', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('VINTAGE (REQUIRED)')).toBeInTheDocument();
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });

    test('displays required wine name field', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('WINE NAME (REQUIRED)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/lodi/i)).toBeInTheDocument();
    });

    test('displays wine type dropdown', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('WINE TYPE (REQUIRED)')).toBeInTheDocument();
    });

    test('displays volume field', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('VOLUME (GALLONS)')).toBeInTheDocument();
    });

    test('displays optional notes textarea', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('NOTES (OPTIONAL)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/any notes about this wine/i)).toBeInTheDocument();
    });
  });

  describe('wine type options', () => {
    test('shows all wine type options', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('Red')).toBeInTheDocument();
      expect(screen.getByText('White')).toBeInTheDocument();
      expect(screen.getByText('Rosé')).toBeInTheDocument();
      expect(screen.getByText('Dessert')).toBeInTheDocument();
      expect(screen.getByText('Sparkling')).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    test('prevents submission when vintage not selected', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText(/lodi/i);
      await user.type(nameInput, 'Test Wine');

      const volumeInput = screen.getByPlaceholderText(/5\.0/i);
      await user.type(volumeInput, '10');

      const submitButton = screen.getByRole('button', { name: /create wine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockWineInsert).not.toHaveBeenCalled();
    });

    test.todo('shows error when wine name is empty');
    test.todo('shows error when volume is zero or negative');
    test.todo('shows warning when volume exceeds vintage remaining volume');
    test.todo('allows submission even with volume warning');
  });

  describe('vintage selection', () => {
    test('shows vintage details when selected', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const vintageSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(vintageSelect, 'vintage-2024-cab');

      expect(screen.getByText(/harvest volume: 50 gallons/i)).toBeInTheDocument();
    });

    test('lists only available vintages', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('2024 Cabernet Sauvignon')).toBeInTheDocument();
      expect(screen.getByText('2023 Merlot')).toBeInTheDocument();
      expect(screen.getByText(/2024 Pinot Noir.*PURCHASED/i)).toBeInTheDocument();
    });
  });

  describe('form interaction', () => {
    test('converts wine name to uppercase', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText(/lodi/i) as HTMLInputElement;
      await user.type(nameInput, 'reserve');

      expect(nameInput.value).toBe('RESERVE');
    });

    test('clears form after successful submission', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const vintageSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
      await user.selectOptions(vintageSelect, 'vintage-2024-cab');

      const nameInput = screen.getByPlaceholderText(/lodi/i) as HTMLInputElement;
      await user.type(nameInput, 'Reserve');

      const volumeInput = screen.getByPlaceholderText(/5\.0/i) as HTMLInputElement;
      await user.type(volumeInput, '10');

      const submitButton = screen.getByRole('button', { name: /create wine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onClose).toHaveBeenCalled();
    });

    test('disables submit button while submitting', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      mockWineInsert.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const vintageSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(vintageSelect, 'vintage-2024-cab');

      const nameInput = screen.getByPlaceholderText(/lodi/i);
      await user.type(nameInput, 'Reserve');

      const volumeInput = screen.getByPlaceholderText(/5\.0/i);
      await user.type(volumeInput, '10');

      const submitButton = screen.getByRole('button', { name: /create wine/i });
      await user.click(submitButton);

      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    });
  });

  describe('data persistence', () => {
    test('creates wine record with correct data', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const vintageSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(vintageSelect, 'vintage-2024-cab');

      const nameInput = screen.getByPlaceholderText(/lodi/i);
      await user.type(nameInput, 'Reserve');

      const volumeInput = screen.getByPlaceholderText(/5\.0/i);
      await user.type(volumeInput, '15');

      const submitButton = screen.getByRole('button', { name: /create wine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockWineInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          vintage_id: 'vintage-2024-cab',
          vineyard_id: 'test-vineyard-id',
          name: 'RESERVE',
          wine_type: 'red',
          volume_gallons: 15,
          current_volume_gallons: 15,
          status: 'active',
        })
      );
    });

    test('creates initial stage history entry at crush stage', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const vintageSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(vintageSelect, 'vintage-2024-cab');

      const nameInput = screen.getByPlaceholderText(/lodi/i);
      await user.type(nameInput, 'Reserve');

      const volumeInput = screen.getByPlaceholderText(/5\.0/i);
      await user.type(volumeInput, '10');

      const submitButton = screen.getByRole('button', { name: /create wine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockStageHistoryInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          entity_type: 'wine',
          stage: 'crush',
        })
      );
    });

    test('sets initial status to active', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const vintageSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(vintageSelect, 'vintage-2024-cab');

      const nameInput = screen.getByPlaceholderText(/lodi/i);
      await user.type(nameInput, 'Test');

      const volumeInput = screen.getByPlaceholderText(/5\.0/i);
      await user.type(volumeInput, '5');

      const submitButton = screen.getByRole('button', { name: /create wine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockWineInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );
    });
  });

  describe('error handling', () => {
    test('shows error message when submission fails', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      mockWineInsert.mockRejectedValue(new Error('Database error'));

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const vintageSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(vintageSelect, 'vintage-2024-cab');

      const nameInput = screen.getByPlaceholderText(/lodi/i);
      await user.type(nameInput, 'Reserve');

      const volumeInput = screen.getByPlaceholderText(/5\.0/i);
      await user.type(volumeInput, '10');

      const submitButton = screen.getByRole('button', { name: /create wine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText(/failed to create wine/i)).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    test('keeps form data when submission fails', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      mockWineInsert.mockRejectedValue(new Error('Database error'));

      render(
        <AddWineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const vintageSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
      await user.selectOptions(vintageSelect, 'vintage-2024-cab');

      const nameInput = screen.getByPlaceholderText(/lodi/i) as HTMLInputElement;
      await user.type(nameInput, 'Reserve');

      const volumeInput = screen.getByPlaceholderText(/5\.0/i) as HTMLInputElement;
      await user.type(volumeInput, '10');

      const submitButton = screen.getByRole('button', { name: /create wine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(nameInput.value).toBe('RESERVE');
      expect(volumeInput.value).toBe('10');
    });
  });
});
