import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AddVintageModal } from './AddVintageModal';

// Create mock functions at top level so we can access them in tests
const mockVintageInsert = rs.fn().mockResolvedValue(undefined);
const mockStageHistoryInsert = rs.fn().mockResolvedValue(undefined);

// Mock modules before importing
rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    query: {
      vintage: {
        run: rs.fn().mockResolvedValue([]),
        where: rs.fn().mockReturnThis(),
      },
    },
    mutate: {
      vintage: {
        insert: mockVintageInsert,
      },
      stage_history: {
        insert: mockStageHistoryInsert,
      },
    },
  }),
}));

rs.mock('../vineyard-hooks', () => ({
  useVineyard: () => ({ id: 'test-vineyard-id', name: 'Test Vineyard' }),
}));

describe('AddVintageModal', () => {
  afterEach(() => {
    cleanup();
    mockVintageInsert.mockClear();
    mockStageHistoryInsert.mockClear();
    mockVintageInsert.mockResolvedValue(undefined);
    mockStageHistoryInsert.mockResolvedValue(undefined);
  });

  describe('visibility', () => {
    test('does not render when closed', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVintageModal
          isOpen={false}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // Modal title should not be in the document
      expect(screen.queryByText('ADD VINTAGE')).not.toBeInTheDocument();
    });

    test('renders when opened', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVintageModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // Modal title should be in the document
      expect(screen.getByText('ADD VINTAGE')).toBeInTheDocument();
    });

    test('closes when cancel button clicked', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVintageModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // Find the CANCEL button within the rendered component
      const cancelButton = screen.getAllByText('CANCEL')[0];
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test.todo('closes when successfully submitted');
  });

  describe('form fields', () => {
    test.todo('displays vintage year dropdown');
    test.todo('displays variety dropdown');
    test.todo('displays block selection');
    test.todo('displays harvest date picker with today as default');
    test.todo('displays optional harvest weight field');
    test.todo('displays optional harvest volume field');
    test.todo('displays optional brix field');
    test.todo('displays optional notes textarea');
  });

  describe('validation', () => {
    test.todo('shows error when vintage year not selected');
    test.todo('shows error when variety not selected');
    test.todo('validates brix is not above 40');
    test.todo('validates brix is not negative');
    test.todo('shows error when duplicate vintage exists');
    test.todo('allows submission when no blocks selected');
  });

  describe('form interaction', () => {
    test.todo('allows selecting multiple blocks');
    test.todo('clears form after successful submission');
    test.todo('disables submit button while submitting');
    test.todo('re-enables submit button after submission completes');
  });

  describe('data persistence', () => {
    test('creates vintage record and stage history on successful submission', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVintageModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // Get selects by position
      const selects = screen.getAllByRole('combobox');
      const vintageYearSelect = selects[0];
      const varietySelect = selects[1];

      // Fill in required fields
      await user.selectOptions(vintageYearSelect, '2024');
      await user.selectOptions(varietySelect, 'Cabernet Sauvignon');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create vintage/i });
      await user.click(submitButton);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should create vintage record
      expect(mockVintageInsert).toHaveBeenCalled();

      // Should create stage history
      expect(mockStageHistoryInsert).toHaveBeenCalled();

      // Should call callbacks
      expect(onClose).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(expect.stringContaining('2024'));
      expect(onSuccess).toHaveBeenCalledWith(expect.stringContaining('Cabernet Sauvignon'));
    });

    test('creates vintage with all optional fields', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVintageModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // Get selects by position
      const selects = screen.getAllByRole('combobox');
      const vintageYearSelect = selects[0];
      const varietySelect = selects[1];

      // Fill in required fields
      await user.selectOptions(vintageYearSelect, '2024');
      await user.selectOptions(varietySelect, 'Pinot Noir');

      // Get input fields by role (spinbuttons for number inputs)
      const spinbuttons = screen.getAllByRole('spinbutton');
      const weightInput = spinbuttons[0]; // harvest weight
      const volumeInput = spinbuttons[1]; // harvest volume
      const brixInput = spinbuttons[2]; // brix

      await user.type(weightInput, '500');
      await user.type(volumeInput, '50');
      await user.type(brixInput, '24.5');

      // Get textarea by role
      const notesInput = screen.getByRole('textbox');
      await user.type(notesInput, 'Excellent harvest conditions');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create vintage/i });
      await user.click(submitButton);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have called insert with all fields
      expect(mockVintageInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          vintage_year: 2024,
          variety: 'Pinot Noir',
          harvest_weight_lbs: 500,
          harvest_volume_gallons: 50,
          brix_at_harvest: 24.5,
          notes: 'Excellent harvest conditions',
        })
      );
    });
  });

  describe('error handling', () => {
    test('shows error message when submission fails', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      // Configure the mock to reject for this test
      mockVintageInsert.mockRejectedValue(new Error('Database error'));

      render(
        <AddVintageModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // Get selects by position
      const selects = screen.getAllByRole('combobox');
      const vintageYearSelect = selects[0];
      const varietySelect = selects[1];

      // Fill in required fields
      await user.selectOptions(vintageYearSelect, '2024');
      await user.selectOptions(varietySelect, 'Merlot');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create vintage/i });
      await user.click(submitButton);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show error
      expect(screen.getByText(/failed to create vintage/i)).toBeInTheDocument();

      // Should not call success callbacks
      expect(onClose).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    test.todo('keeps form data when submission fails');
  });
});
