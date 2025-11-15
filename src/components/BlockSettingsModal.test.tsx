import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BlockSettingsModal } from './BlockSettingsModal';

// Create mock functions at top level
const mockBlockUpdate = rs.fn().mockResolvedValue(undefined);

const mockVinesData = [
  { id: '001', block: 'block-1', variety: 'Cabernet Sauvignon' },
  { id: '002', block: 'block-1', variety: 'Pinot Noir' },
  { id: '003', block: 'block-2', variety: 'Merlot' },
];

const mockBlocksData = [
  {
    id: 'block-1',
    vineyard_id: 'vineyard-1',
    name: 'NORTH BLOCK',
    location: 'North hillside',
    size_acres: 5.5,
    soil_type: 'Sandy loam',
    notes: 'Good drainage',
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'block-2',
    vineyard_id: 'vineyard-1',
    name: 'SOUTH BLOCK',
    location: '',
    size_acres: 0,
    soil_type: '',
    notes: '',
    created_at: new Date(),
    updated_at: new Date(),
  },
];

// Mock modules
rs.mock('../contexts/ZeroContext', () => ({
  useZero: () => ({
    mutate: {
      block: {
        update: mockBlockUpdate,
      },
    },
  }),
}));

rs.mock('./vineyard-hooks', () => ({
  useVines: () => mockVinesData,
  useBlocks: () => mockBlocksData,
}));

describe('BlockSettingsModal', () => {
  afterEach(() => {
    cleanup();
    mockBlockUpdate.mockClear();
    mockBlockUpdate.mockResolvedValue(undefined);
  });

  describe('visibility', () => {
    test('does not render when closed', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();
      const onDeleteClick = rs.fn();

      render(
        <BlockSettingsModal
          isOpen={false}
          onClose={onClose}
          selectedBlock="block-1"
          onSuccess={onSuccess}
          onDeleteClick={onDeleteClick}
        />
      );

      expect(screen.queryByText('BLOCK SETTINGS')).not.toBeInTheDocument();
    });

    test('renders when opened with valid block', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();
      const onDeleteClick = rs.fn();

      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={onClose}
          selectedBlock="block-1"
          onSuccess={onSuccess}
          onDeleteClick={onDeleteClick}
        />
      );

      expect(screen.getByText('BLOCK SETTINGS')).toBeInTheDocument();
    });

    test('returns null when block not found', () => {
      const { container } = render(
        <BlockSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          selectedBlock="non-existent-block"
          onSuccess={rs.fn()}
          onDeleteClick={rs.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    test('returns null when selectedBlock is null', () => {
      const { container } = render(
        <BlockSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          selectedBlock={null}
          onSuccess={rs.fn()}
          onDeleteClick={rs.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('form fields', () => {
    test('displays block name field with current value', () => {
      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          selectedBlock="block-1"
          onSuccess={rs.fn()}
          onDeleteClick={rs.fn()}
        />
      );

      const nameInput = screen.getByDisplayValue('NORTH BLOCK');
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toBeRequired();
    });

    test('displays location field with current value', () => {
      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          selectedBlock="block-1"
          onSuccess={rs.fn()}
          onDeleteClick={rs.fn()}
        />
      );

      const locationInput = screen.getByDisplayValue('North hillside');
      expect(locationInput).toBeInTheDocument();
      expect(locationInput).not.toBeRequired();
    });

    test('displays size field with current value', () => {
      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          selectedBlock="block-1"
          onSuccess={rs.fn()}
          onDeleteClick={rs.fn()}
        />
      );

      const sizeInput = screen.getByDisplayValue('5.5');
      expect(sizeInput).toBeInTheDocument();
    });

    test('displays soil type field with current value', () => {
      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          selectedBlock="block-1"
          onSuccess={rs.fn()}
          onDeleteClick={rs.fn()}
        />
      );

      const soilInput = screen.getByDisplayValue('Sandy loam');
      expect(soilInput).toBeInTheDocument();
    });

    test('displays notes field with current value', () => {
      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          selectedBlock="block-1"
          onSuccess={rs.fn()}
          onDeleteClick={rs.fn()}
        />
      );

      const notesTextarea = screen.getByDisplayValue('Good drainage');
      expect(notesTextarea).toBeInTheDocument();
    });

    test('displays empty optional fields for block with no data', () => {
      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          selectedBlock="block-2"
          onSuccess={rs.fn()}
          onDeleteClick={rs.fn()}
        />
      );

      const locationInput = screen.getByPlaceholderText(/north section/i);
      const soilInput = screen.getByPlaceholderText(/clay, sandy loam/i);
      const notesTextarea = screen.getByPlaceholderText(/any additional notes/i);

      expect(locationInput).toHaveValue('');
      expect(soilInput).toHaveValue('');
      expect(notesTextarea).toHaveValue('');
    });
  });

  describe('name input transformation', () => {
    test('converts name to uppercase as user types', async () => {
      const user = userEvent.setup();

      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          selectedBlock="block-1"
          onSuccess={rs.fn()}
          onDeleteClick={rs.fn()}
        />
      );

      const nameInput = screen.getByDisplayValue('NORTH BLOCK');

      await user.clear(nameInput);
      await user.type(nameInput, 'west block');

      expect(nameInput).toHaveValue('WEST BLOCK');
    });
  });

  describe('block update', () => {
    test('updates block with all fields', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={onClose}
          selectedBlock="block-1"
          onSuccess={onSuccess}
          onDeleteClick={rs.fn()}
        />
      );

      const nameInput = screen.getByDisplayValue('NORTH BLOCK');
      const locationInput = screen.getByDisplayValue('North hillside');
      const sizeInput = screen.getByDisplayValue('5.5');
      const soilInput = screen.getByDisplayValue('Sandy loam');
      const notesTextarea = screen.getByDisplayValue('Good drainage');

      await user.clear(nameInput);
      await user.type(nameInput, 'EAST BLOCK');

      await user.clear(locationInput);
      await user.type(locationInput, 'East hillside');

      await user.clear(sizeInput);
      await user.type(sizeInput, '3.2');

      await user.clear(soilInput);
      await user.type(soilInput, 'Clay');

      await user.clear(notesTextarea);
      await user.type(notesTextarea, 'Needs irrigation');

      const submitButton = screen.getByRole('button', { name: /SAVE SETTINGS/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockBlockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'block-1',
          name: 'EAST BLOCK',
          location: 'East hillside',
          size_acres: 3.2,
          soil_type: 'Clay',
          notes: 'Needs irrigation',
        })
      );

      expect(onSuccess).toHaveBeenCalledWith('Block EAST BLOCK updated successfully');
      expect(onClose).toHaveBeenCalled();
    });

    test('updates block with only required fields', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={onClose}
          selectedBlock="block-2"
          onSuccess={onSuccess}
          onDeleteClick={rs.fn()}
        />
      );

      const nameInput = screen.getByDisplayValue('SOUTH BLOCK');

      await user.clear(nameInput);
      await user.type(nameInput, 'WEST BLOCK');

      const submitButton = screen.getByRole('button', { name: /SAVE SETTINGS/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockBlockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'block-2',
          name: 'WEST BLOCK',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
        })
      );
    });

    test('converts empty optional fields to empty strings', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={onClose}
          selectedBlock="block-1"
          onSuccess={onSuccess}
          onDeleteClick={rs.fn()}
        />
      );

      const locationInput = screen.getByDisplayValue('North hillside');
      const soilInput = screen.getByDisplayValue('Sandy loam');
      const notesTextarea = screen.getByDisplayValue('Good drainage');

      await user.clear(locationInput);
      await user.clear(soilInput);
      await user.clear(notesTextarea);

      const submitButton = screen.getByRole('button', { name: /SAVE SETTINGS/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockBlockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          location: '',
          soil_type: '',
          notes: '',
        })
      );
    });

    test('converts empty size to 0', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={onClose}
          selectedBlock="block-1"
          onSuccess={onSuccess}
          onDeleteClick={rs.fn()}
        />
      );

      const sizeInput = screen.getByDisplayValue('5.5');
      await user.clear(sizeInput);

      const submitButton = screen.getByRole('button', { name: /SAVE SETTINGS/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockBlockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          size_acres: 0,
        })
      );
    });
  });

  describe('form submission state', () => {
    test('disables buttons while submitting', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      // Make update slow to test loading state
      mockBlockUpdate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));

      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={onClose}
          selectedBlock="block-1"
          onSuccess={onSuccess}
          onDeleteClick={rs.fn()}
        />
      );

      const submitButton = screen.getByRole('button', { name: /SAVE SETTINGS/i });
      await user.click(submitButton);

      // Check buttons are disabled during submission
      expect(submitButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /SAVING/i })).toBeInTheDocument();

      const deleteButton = screen.getByRole('button', { name: /DELETE BLOCK/i });
      expect(deleteButton).toBeDisabled();

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
      mockBlockUpdate.mockRejectedValue(new Error('Database error'));

      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={onClose}
          selectedBlock="block-1"
          onSuccess={onSuccess}
          onDeleteClick={rs.fn()}
        />
      );

      const submitButton = screen.getByRole('button', { name: /SAVE SETTINGS/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show error
      expect(screen.getByText(/failed to update block/i)).toBeInTheDocument();

      // Should not call success callbacks
      expect(onClose).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    test('clears previous errors on new submission', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      mockBlockUpdate.mockRejectedValue(new Error('Database error'));

      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={onClose}
          selectedBlock="block-1"
          onSuccess={onSuccess}
          onDeleteClick={rs.fn()}
        />
      );

      const submitButton = screen.getByRole('button', { name: /SAVE SETTINGS/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Error should be visible
      expect(screen.getByText(/failed to update block/i)).toBeInTheDocument();

      // Fix the mock to succeed
      mockBlockUpdate.mockClear();
      mockBlockUpdate.mockResolvedValue(undefined);

      // Submit again
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Error should be gone
      expect(screen.queryByText(/failed to update block/i)).not.toBeInTheDocument();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe('delete button', () => {
    test('displays delete button with vine count', () => {
      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          selectedBlock="block-1"
          onSuccess={rs.fn()}
          onDeleteClick={rs.fn()}
        />
      );

      // block-1 has 2 vines in mockVinesData
      expect(screen.getByRole('button', { name: /DELETE BLOCK \(2 VINES\)/i })).toBeInTheDocument();
    });

    test('displays delete button without vine count when no vines', () => {
      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          selectedBlock="block-2"
          onSuccess={rs.fn()}
          onDeleteClick={rs.fn()}
        />
      );

      // block-2 has 1 vine, but the button should show the count
      const deleteButton = screen.getByRole('button', { name: /DELETE BLOCK/i });
      expect(deleteButton).toBeInTheDocument();
    });

    test('calls onDeleteClick when delete button clicked', async () => {
      const user = userEvent.setup();
      const onDeleteClick = rs.fn();

      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          selectedBlock="block-1"
          onSuccess={rs.fn()}
          onDeleteClick={onDeleteClick}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /DELETE BLOCK \(2 VINES\)/i });
      await user.click(deleteButton);

      expect(onDeleteClick).toHaveBeenCalledWith('block-1');
    });

    test('does not submit form when delete button clicked', async () => {
      const user = userEvent.setup();
      const onDeleteClick = rs.fn();

      render(
        <BlockSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          selectedBlock="block-1"
          onSuccess={rs.fn()}
          onDeleteClick={onDeleteClick}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /DELETE BLOCK \(2 VINES\)/i });
      await user.click(deleteButton);

      // Should not call block update (form not submitted)
      expect(mockBlockUpdate).not.toHaveBeenCalled();
    });
  });
});
