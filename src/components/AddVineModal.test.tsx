import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AddVineModal } from './AddVineModal';

// Create mock functions at top level
const mockVineInsert = rs.fn().mockResolvedValue(undefined);

const mockVinesData: any[] = [];
const mockBlocksData = [
  {
    id: 'block-1',
    vineyard_id: 'vineyard-1',
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
    vineyard_id: 'vineyard-1',
    name: 'South Block',
    location: 'South',
    size_acres: 3,
    soil_type: 'Sandy',
    notes: '',
    created_at: new Date(),
  },
];

let mockVineyardData = {
  id: 'vineyard-1',
  name: 'Test Vineyard',
  varieties: ['Cabernet Sauvignon', 'Pinot Noir', 'Merlot'],
};

// Mock modules
rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-123',
    },
  }),
}));

rs.mock('../contexts/ZeroContext', () => ({
  useZero: () => ({
    mutate: {
      vine: {
        insert: mockVineInsert,
      },
    },
  }),
}));

rs.mock('./vineyard-hooks', () => ({
  useVines: () => mockVinesData,
  useBlocks: () => mockBlocksData,
  useVineyard: () => mockVineyardData,
}));

describe('AddVineModal', () => {
  afterEach(() => {
    cleanup();
    mockVineInsert.mockClear();
    mockVineInsert.mockResolvedValue(undefined);
    // Reset vineyard data
    mockVineyardData = {
      id: 'vineyard-1',
      name: 'Test Vineyard',
      varieties: ['Cabernet Sauvignon', 'Pinot Noir', 'Merlot'],
    };
  });

  describe('visibility', () => {
    test('does not render when closed', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVineModal
          isOpen={false}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.queryByText('ADD VINE')).not.toBeInTheDocument();
    });

    test('renders when opened', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('ADD VINE')).toBeInTheDocument();
    });

    test('closes when cancel button clicked', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('form fields', () => {
    test('displays block dropdown with available blocks', () => {
      render(
        <AddVineModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      expect(screen.getByText('North Block')).toBeInTheDocument();
      expect(screen.getByText('South Block')).toBeInTheDocument();
    });

    test('displays quantity field with default value of 1', () => {
      render(
        <AddVineModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      const quantityInput = screen.getByRole('spinbutton');
      expect(quantityInput).toHaveValue(1);
    });

    test('displays variety dropdown when varieties are configured', () => {
      render(
        <AddVineModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      // Variety is the second combobox (block, variety, health)
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument();
      expect(screen.getByText('Pinot Noir')).toBeInTheDocument();
    });

    test('displays variety text input when no varieties configured', () => {
      // Override mock to return no varieties
      mockVineyardData = {
        id: 'vineyard-1',
        name: 'Test Vineyard',
        varieties: [],
      };

      render(
        <AddVineModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      const varietyInput = screen.getByPlaceholderText(/cabernet sauvignon/i);
      expect(varietyInput).toBeInTheDocument();
      expect(screen.getByText(/add varieties in vineyard settings/i)).toBeInTheDocument();
    });

    test('displays planting date field with today as default', () => {
      render(
        <AddVineModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      const dateInput = document.querySelector('input[type="date"]');
      const today = new Date().toISOString().split('T')[0];
      expect(dateInput).toHaveValue(today);
    });

    test('displays health status dropdown with GOOD as default', () => {
      render(
        <AddVineModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      // Health is the third combobox (block, variety, health)
      const selects = screen.getAllByRole('combobox');
      const healthSelect = selects[2];
      expect(healthSelect).toHaveValue('GOOD');
    });

    test('displays optional notes textarea', () => {
      render(
        <AddVineModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      const notesTextarea = screen.getByPlaceholderText(/any notes about planting/i);
      expect(notesTextarea).toBeInTheDocument();
    });
  });

  describe('single vine creation', () => {
    test('creates single vine and shows success message', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // Fill in form
      const blockSelect = screen.getAllByRole('combobox')[0]; // First combobox is block
      await user.selectOptions(blockSelect, 'block-1');

      const quantityInput = screen.getByRole('spinbutton');
      await user.clear(quantityInput);
      await user.type(quantityInput, '1');

      const varietySelect = screen.getAllByRole('combobox')[1]; // Second is variety
      await user.selectOptions(varietySelect, 'Cabernet Sauvignon');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create vine/i });
      await user.click(submitButton);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should create one vine
      expect(mockVineInsert).toHaveBeenCalledTimes(1);
      expect(mockVineInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          block: 'block-1',
          variety: 'CABERNET SAUVIGNON',
          health: 'GOOD',
        })
      );

      // Should call success with single vine message (message uses sequence number for display, but passes UUID)
      expect(onSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Vine block-1-001 created successfully'),
        expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('batch vine creation', () => {
    test('creates multiple vines when quantity > 1', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // Fill in form with quantity 3
      const blockSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(blockSelect, 'block-1');

      const quantityInput = screen.getByRole('spinbutton');
      await user.clear(quantityInput);
      await user.type(quantityInput, '3');

      const varietySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(varietySelect, 'Pinot Noir');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create vine/i });
      await user.click(submitButton);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should create three vines
      expect(mockVineInsert).toHaveBeenCalledTimes(3);

      // Should call success with batch message
      expect(onSuccess).toHaveBeenCalledWith(
        expect.stringContaining('3 vines created successfully')
      );
      expect(onSuccess).toHaveBeenCalledWith(
        expect.stringContaining('block-1-001 - block-1-003')
      );
      expect(onClose).toHaveBeenCalled();
    });

    test('creates vines with correct sequence numbers', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const blockSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(blockSelect, 'block-2');

      const quantityInput = screen.getByRole('spinbutton');
      await user.clear(quantityInput);
      await user.type(quantityInput, '2');

      const varietySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(varietySelect, 'Merlot');

      const submitButton = screen.getByRole('button', { name: /create vine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Check sequence numbers (id is UUID, sequence_number is for display)
      expect(mockVineInsert).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          sequence_number: 1,
          block: 'block-2',
        })
      );
      expect(mockVineInsert).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          sequence_number: 2,
          block: 'block-2',
        })
      );
      // Verify IDs are UUIDs
      const firstCall = mockVineInsert.mock.calls[0][0];
      const secondCall = mockVineInsert.mock.calls[1][0];
      expect(firstCall.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(secondCall.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(firstCall.id).not.toBe(secondCall.id);
    });
  });

  describe('form submission state', () => {
    test('disables buttons while submitting', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      // Make insert slow to test loading state
      mockVineInsert.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const blockSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(blockSelect, 'block-1');

      const varietySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(varietySelect, 'Cabernet Sauvignon');

      const submitButton = screen.getByRole('button', { name: /create vine/i });
      await user.click(submitButton);

      // Check buttons are disabled during submission
      expect(submitButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 600));
    });
  });

  describe('error handling', () => {
    test('shows error message when submission fails', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      // Configure mock to reject
      mockVineInsert.mockRejectedValue(new Error('Database error'));

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const blockSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(blockSelect, 'block-1');

      const varietySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(varietySelect, 'Cabernet Sauvignon');

      const submitButton = screen.getByRole('button', { name: /create vine/i });
      await user.click(submitButton);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show error
      expect(screen.getByText(/failed to create vine/i)).toBeInTheDocument();

      // Should not call success callbacks
      expect(onClose).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    test('clears errors when cancel is clicked', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      mockVineInsert.mockRejectedValue(new Error('Database error'));

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const blockSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(blockSelect, 'block-1');

      const varietySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(varietySelect, 'Cabernet Sauvignon');

      const submitButton = screen.getByRole('button', { name: /create vine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Error should be visible
      expect(screen.getByText(/failed to create vine/i)).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // onClose should be called
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('variety input handling', () => {
    test('converts text input variety to uppercase', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      // No varieties configured
      mockVineyardData = {
        id: 'vineyard-1',
        name: 'Test Vineyard',
        varieties: [],
      };

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // With no varieties, there are 2 comboboxes: block and health (no variety dropdown)
      const selects = screen.getAllByRole('combobox');
      const blockSelect = selects[0];
      await user.selectOptions(blockSelect, 'block-1');

      const varietyInput = screen.getByPlaceholderText(/cabernet sauvignon/i);
      await user.type(varietyInput, 'zinfandel');

      const submitButton = screen.getByRole('button', { name: /create vine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should uppercase the variety
      expect(mockVineInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          variety: 'ZINFANDEL',
        })
      );
    });
  });

  describe('training method', () => {
    test('displays training method dropdown', () => {
      render(
        <AddVineModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      expect(screen.getByText('TRAINING METHOD (OPTIONAL)')).toBeInTheDocument();
    });

    test('shows all training method options', () => {
      render(
        <AddVineModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      expect(screen.getByText('Not Set')).toBeInTheDocument();
      expect(screen.getByText('Bilateral Cordon')).toBeInTheDocument();
      expect(screen.getByText('Vertical Shoot Positioning (VSP)')).toBeInTheDocument();
      expect(screen.getByText('Scott-Henry')).toBeInTheDocument();
      expect(screen.getByText('Lyre (U-Shape)')).toBeInTheDocument();
      expect(screen.getByText('Other (Custom)')).toBeInTheDocument();
    });

    test('creates vine with training method when selected', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const blockSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(blockSelect, 'block-1');

      const varietySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(varietySelect, 'Cabernet Sauvignon');

      // Select training method - it's the 4th combobox (block, variety, health, training)
      const trainingSelect = screen.getAllByRole('combobox')[3];
      await user.selectOptions(trainingSelect, 'VSP');

      const submitButton = screen.getByRole('button', { name: /create vine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockVineInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          training_method: 'VSP',
          training_method_other: null,
        })
      );
    });

    test('creates vine with null training method when not selected', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const blockSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(blockSelect, 'block-1');

      const varietySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(varietySelect, 'Cabernet Sauvignon');

      const submitButton = screen.getByRole('button', { name: /create vine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockVineInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          training_method: null,
          training_method_other: null,
        })
      );
    });

    test('shows custom training field when OTHER is selected', async () => {
      const user = userEvent.setup();

      render(
        <AddVineModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      // Initially, custom field should not be visible
      expect(screen.queryByText('CUSTOM TRAINING METHOD')).not.toBeInTheDocument();

      // Select OTHER
      const trainingSelect = screen.getAllByRole('combobox')[3];
      await user.selectOptions(trainingSelect, 'OTHER');

      // Now custom field should be visible
      expect(screen.getByText('CUSTOM TRAINING METHOD')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Describe your training system...')).toBeInTheDocument();
    });

    test('hides custom training field when switching from OTHER', async () => {
      const user = userEvent.setup();

      render(
        <AddVineModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      // Select OTHER
      const trainingSelect = screen.getAllByRole('combobox')[3];
      await user.selectOptions(trainingSelect, 'OTHER');

      expect(screen.getByText('CUSTOM TRAINING METHOD')).toBeInTheDocument();

      // Switch to a different option
      await user.selectOptions(trainingSelect, 'VSP');

      expect(screen.queryByText('CUSTOM TRAINING METHOD')).not.toBeInTheDocument();
    });

    test('creates vine with custom training description when OTHER is selected', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const blockSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(blockSelect, 'block-1');

      const varietySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(varietySelect, 'Cabernet Sauvignon');

      // Select OTHER
      const trainingSelect = screen.getAllByRole('combobox')[3];
      await user.selectOptions(trainingSelect, 'OTHER');

      // Fill in custom description
      const customInput = screen.getByPlaceholderText('Describe your training system...');
      await user.type(customInput, 'My custom trellis system');

      const submitButton = screen.getByRole('button', { name: /create vine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockVineInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          training_method: 'OTHER',
          training_method_other: 'My custom trellis system',
        })
      );
    });

    test('resets custom training state when modal is cancelled', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      const { rerender } = render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={rs.fn()}
        />
      );

      // Select OTHER
      const trainingSelect = screen.getAllByRole('combobox')[3];
      await user.selectOptions(trainingSelect, 'OTHER');

      expect(screen.getByText('CUSTOM TRAINING METHOD')).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Re-open modal
      rerender(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={rs.fn()}
        />
      );

      // Custom field should not be visible (state was reset)
      expect(screen.queryByText('CUSTOM TRAINING METHOD')).not.toBeInTheDocument();
    });
  });

  describe('optional fields', () => {
    test('creates vine with notes when provided', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const blockSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(blockSelect, 'block-1');

      const varietySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(varietySelect, 'Cabernet Sauvignon');

      const notesTextarea = screen.getByPlaceholderText(/any notes about planting/i);
      await user.type(notesTextarea, 'Excellent soil conditions');

      const submitButton = screen.getByRole('button', { name: /create vine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockVineInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Excellent soil conditions',
        })
      );
    });

    test('creates vine with empty notes when not provided', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddVineModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const blockSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(blockSelect, 'block-1');

      const varietySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(varietySelect, 'Pinot Noir');

      const submitButton = screen.getByRole('button', { name: /create vine/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockVineInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: '',
        })
      );
    });
  });
});
