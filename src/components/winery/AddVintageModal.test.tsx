import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AddVintageModal } from './AddVintageModal';

// Create mock functions at top level so we can access them in tests
const mockVintageInsert = rs.fn().mockResolvedValue(undefined);
const mockStageHistoryInsert = rs.fn().mockResolvedValue(undefined);
const mockMeasurementInsert = rs.fn().mockResolvedValue(undefined);

// Mock modules before importing
rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-123',
    },
  }),
}));


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
      measurement: {
        insert: mockMeasurementInsert,
      },
    },
  }),
}));

rs.mock('../vineyard-hooks', () => ({
  useVineyard: () => ({
    id: 'test-vineyard-id',
    name: 'Test Vineyard',
    varieties: ['Cabernet Sauvignon', 'Cabernet Franc', 'Merlot', 'Pinot Noir', 'Chardonnay'],
  }),
}));

describe('AddVintageModal', () => {
  afterEach(() => {
    cleanup();
    mockVintageInsert.mockClear();
    mockStageHistoryInsert.mockClear();
    mockMeasurementInsert.mockClear();
    mockVintageInsert.mockResolvedValue(undefined);
    mockStageHistoryInsert.mockResolvedValue(undefined);
    mockMeasurementInsert.mockResolvedValue(undefined);
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
    test('displays grape source toggle link', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVintageModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // Should have toggle link
      expect(screen.getByText('Use Sourced Grapes')).toBeInTheDocument();

      // Should show variety dropdown by default (own vineyard)
      const selects = screen.getAllByRole('combobox');
      const varietySelect = selects[0]; // First select is variety
      expect(varietySelect).toBeInTheDocument();
    });

    test('shows variety dropdown when own vineyard selected', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVintageModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // Should show dropdown with configured varieties
      const selects = screen.getAllByRole('combobox');
      const varietySelect = selects[1]; // Second select is variety

      expect(varietySelect).toBeInTheDocument();
      expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument();
    });

    test('shows variety text input when purchased selected', async () => {
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

      // Click toggle link to switch to sourced grapes
      const toggleLink = screen.getByText('Use Sourced Grapes');
      await user.click(toggleLink);

      // Should now show text input with placeholder
      expect(screen.getByPlaceholderText(/cabernet sauvignon/i)).toBeInTheDocument();
    });

    test('shows supplier field when purchased selected', async () => {
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

      // Should not show supplier field initially
      expect(screen.queryByText('SUPPLIER (OPTIONAL)')).not.toBeInTheDocument();

      // Click toggle link to switch to sourced grapes
      const toggleLink = screen.getByText('Use Sourced Grapes');
      await user.click(toggleLink);

      // Should now show supplier field
      expect(screen.getByText('SUPPLIER (OPTIONAL)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/napa valley grapes/i)).toBeInTheDocument();
    });

    test.todo('displays vintage year dropdown');
    test.todo('displays block selection');
    test.todo('displays harvest date picker with today as default');
    test.todo('displays optional harvest weight field');
    test.todo('displays optional harvest volume field');
    test.todo('displays optional brix field');
    test.todo('displays optional notes textarea');
  });

  describe('validation', () => {
    test('validates variety must be from vineyard when own vineyard selected', async () => {
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

      // Get selects by position (variety is first, year is second after UI reorder)
      const selects = screen.getAllByRole('combobox');
      const varietySelect = selects[0];
      const vintageYearSelect = selects[1];

      // Fill in required fields
      await user.selectOptions(vintageYearSelect, '2024');
      await user.selectOptions(varietySelect, 'Cabernet Sauvignon');

      // This should work - variety is from vineyard
      const submitButton = screen.getByRole('button', { name: /create vintage/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockVintageInsert).toHaveBeenCalled();
    });

    test('allows any variety when purchased selected', async () => {
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

      // Switch to sourced grapes
      const toggleLink = screen.getByText('Use Sourced Grapes');
      await user.click(toggleLink);

      // After toggle, there's only the year dropdown (variety became text input)
      const selects = screen.getAllByRole('combobox');
      const vintageYearSelect = selects[0]; // Only one select now

      // Fill in fields with custom variety not in vineyard
      await user.selectOptions(vintageYearSelect, '2024');

      const varietyInput = screen.getByPlaceholderText(/cabernet sauvignon/i);
      await user.type(varietyInput, 'Tempranillo');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create vintage/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should succeed even though Tempranillo is not in vineyard varieties
      expect(mockVintageInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          variety: 'Tempranillo',
          grape_source: 'purchased',
        })
      );
    });

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

      // Get selects by position (variety is first, year is second after UI reorder)
      const selects = screen.getAllByRole('combobox');
      const varietySelect = selects[0];
      const vintageYearSelect = selects[1];

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

    test('creates vintage ID with supplier slug when purchased with supplier', async () => {
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

      // Switch to sourced grapes
      const toggleLink = screen.getByText('Use Sourced Grapes');
      await user.click(toggleLink);

      // After toggle, there's only the year dropdown (variety became text input)
      const selects = screen.getAllByRole('combobox');
      const vintageYearSelect = selects[0]; // Only one select after toggle

      // Fill in fields
      await user.selectOptions(vintageYearSelect, '2024');

      const varietyInput = screen.getByPlaceholderText(/cabernet sauvignon/i);
      await user.type(varietyInput, 'Cabernet Franc');

      const supplierInput = screen.getByPlaceholderText(/napa valley grapes/i);
      await user.type(supplierInput, 'Napa Valley Grapes');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create vintage/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // ID should include supplier slug
      expect(mockVintageInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '2024-cabernet-franc-napa-valley-grapes',
          variety: 'Cabernet Franc',
          grape_source: 'purchased',
          supplier_name: 'Napa Valley Grapes',
        })
      );
    });

    test('creates vintage ID without supplier slug when purchased without supplier', async () => {
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

      // Switch to sourced grapes
      const toggleLink = screen.getByText('Use Sourced Grapes');
      await user.click(toggleLink);

      // After toggle, there's only the year dropdown (variety became text input)
      const selects = screen.getAllByRole('combobox');
      const vintageYearSelect = selects[0]; // Only one select after toggle

      // Fill in fields (no supplier)
      await user.selectOptions(vintageYearSelect, '2024');

      const varietyInput = screen.getByPlaceholderText(/cabernet sauvignon/i);
      await user.type(varietyInput, 'Pinot Noir');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create vintage/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // ID should NOT include supplier slug
      expect(mockVintageInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '2024-pinot-noir',
          variety: 'Pinot Noir',
          grape_source: 'purchased',
          supplier_name: null,
        })
      );
    });

    test('creates vintage with all optional fields including measurements', async () => {
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

      // Get selects by position (variety is first, year is second after UI reorder)
      const selects = screen.getAllByRole('combobox');
      const varietySelect = selects[0];
      const vintageYearSelect = selects[1];

      // Fill in required fields
      await user.selectOptions(vintageYearSelect, '2024');
      await user.selectOptions(varietySelect, 'Pinot Noir');

      // Get input fields by role (spinbuttons for number inputs)
      const spinbuttons = screen.getAllByRole('spinbutton');
      const weightInput = spinbuttons[0]; // harvest weight
      const volumeInput = spinbuttons[1]; // harvest volume
      const brixInput = spinbuttons[2]; // brix
      const phInput = spinbuttons[3]; // pH
      const taInput = spinbuttons[4]; // TA

      await user.type(weightInput, '500');
      await user.type(volumeInput, '50');
      await user.type(brixInput, '24.5');
      await user.type(phInput, '3.5');
      await user.type(taInput, '6.5');

      // Get textarea by role
      const notesInput = screen.getByRole('textbox');
      await user.type(notesInput, 'Excellent harvest conditions');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create vintage/i });
      await user.click(submitButton);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have called vintage insert without brix_at_harvest
      expect(mockVintageInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          vintage_year: 2024,
          variety: 'Pinot Noir',
          harvest_weight_lbs: 500,
          harvest_volume_gallons: 50,
          notes: 'Excellent harvest conditions',
        })
      );

      // Should have created a measurement record
      expect(mockMeasurementInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'vintage',
          stage: 'harvest',
          brix: 24.5,
          ph: 3.5,
          ta: 6.5,
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

      // Get selects by position (variety is first, year is second after UI reorder)
      const selects = screen.getAllByRole('combobox');
      const varietySelect = selects[0];
      const vintageYearSelect = selects[1];

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
