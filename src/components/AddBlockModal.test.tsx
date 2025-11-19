import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AddBlockModal } from './AddBlockModal';

// Create mock functions at top level
const mockBlockInsert = rs.fn().mockResolvedValue(undefined);

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
      block: {
        insert: mockBlockInsert,
      },
    },
  }),
}));

describe('AddBlockModal', () => {
  afterEach(() => {
    cleanup();
    mockBlockInsert.mockClear();
    mockBlockInsert.mockResolvedValue(undefined);
  });

  describe('visibility', () => {
    test('does not render when closed', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddBlockModal
          isOpen={false}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.queryByText('ADD BLOCK')).not.toBeInTheDocument();
    });

    test('renders when opened', () => {
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddBlockModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('ADD BLOCK')).toBeInTheDocument();
    });

    test('closes when cancel button clicked', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddBlockModal
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
    test('displays required block name field', () => {
      render(
        <AddBlockModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      const nameInput = screen.getByPlaceholderText(/block e/i);
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toBeRequired();
    });

    test('displays optional location field', () => {
      render(
        <AddBlockModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      const locationInput = screen.getByPlaceholderText(/north section, near barn/i);
      expect(locationInput).toBeInTheDocument();
      expect(locationInput).not.toBeRequired();
    });

    test('displays optional size in acres field', () => {
      render(
        <AddBlockModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      const sizeInput = screen.getByRole('spinbutton');
      expect(sizeInput).toBeInTheDocument();
      expect(sizeInput).not.toBeRequired();
    });

    test('displays optional soil type field', () => {
      render(
        <AddBlockModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      const soilInput = screen.getByPlaceholderText(/clay, sandy loam/i);
      expect(soilInput).toBeInTheDocument();
      expect(soilInput).not.toBeRequired();
    });

    test('displays optional notes textarea', () => {
      render(
        <AddBlockModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      const notesTextarea = screen.getByPlaceholderText(/any additional notes/i);
      expect(notesTextarea).toBeInTheDocument();
    });
  });

  describe('block creation', () => {
    test('creates block with only required fields', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddBlockModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText(/block e/i);
      await user.type(nameInput, 'Block A');

      const submitButton = screen.getByRole('button', { name: /create block/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockBlockInsert).toHaveBeenCalledTimes(1);
      expect(mockBlockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'A', // "BLOCK " prefix removed
          name: 'BLOCK A', // Uppercased
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
        })
      );

      expect(onSuccess).toHaveBeenCalledWith('Block BLOCK A created successfully');
      expect(onClose).toHaveBeenCalled();
    });

    test('creates block with all optional fields', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddBlockModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText(/block e/i);
      await user.type(nameInput, 'Block North');

      const locationInput = screen.getByPlaceholderText(/north section, near barn/i);
      await user.type(locationInput, 'North hillside');

      const sizeInput = screen.getByRole('spinbutton');
      await user.type(sizeInput, '5.5');

      const soilInput = screen.getByPlaceholderText(/clay, sandy loam/i);
      await user.type(soilInput, 'Sandy loam');

      const notesTextarea = screen.getByPlaceholderText(/any additional notes/i);
      await user.type(notesTextarea, 'Best drainage in vineyard');

      const submitButton = screen.getByRole('button', { name: /create block/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockBlockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'NORTH', // ID is also uppercased by onChange handler
          name: 'BLOCK NORTH',
          location: 'North hillside',
          size_acres: 5.5,
          soil_type: 'Sandy loam',
          notes: 'Best drainage in vineyard',
        })
      );
    });

    test('removes "BLOCK " prefix from name when generating ID', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddBlockModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText(/block e/i);
      await user.type(nameInput, 'Block South');

      const submitButton = screen.getByRole('button', { name: /create block/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockBlockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'SOUTH', // "BLOCK " prefix removed and uppercased
        })
      );
    });

    test('converts name to uppercase', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddBlockModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText(/block e/i);
      await user.type(nameInput, 'west');

      const submitButton = screen.getByRole('button', { name: /create block/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockBlockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'WEST',
        })
      );
    });

    test('handles name without "BLOCK " prefix', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddBlockModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText(/block e/i);
      await user.type(nameInput, 'East');

      const submitButton = screen.getByRole('button', { name: /create block/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockBlockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'EAST', // Uppercased by onChange handler
          name: 'EAST',
        })
      );
    });
  });

  describe('form submission state', () => {
    test('disables buttons while submitting', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      // Make insert slow to test loading state
      mockBlockInsert.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));

      render(
        <AddBlockModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText(/block e/i);
      await user.type(nameInput, 'Block Test');

      const submitButton = screen.getByRole('button', { name: /create block/i });
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
      mockBlockInsert.mockRejectedValue(new Error('Database error'));

      render(
        <AddBlockModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText(/block e/i);
      await user.type(nameInput, 'Block Test');

      const submitButton = screen.getByRole('button', { name: /create block/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show error
      expect(screen.getByText(/failed to create block/i)).toBeInTheDocument();

      // Should not call success callbacks
      expect(onClose).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    test('clears errors when cancel is clicked', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      mockBlockInsert.mockRejectedValue(new Error('Database error'));

      render(
        <AddBlockModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText(/block e/i);
      await user.type(nameInput, 'Block Test');

      const submitButton = screen.getByRole('button', { name: /create block/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Error should be visible
      expect(screen.getByText(/failed to create block/i)).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // onClose should be called
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('optional field handling', () => {
    test('uses default values when optional fields are empty', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddBlockModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // Only fill in required field
      const nameInput = screen.getByPlaceholderText(/block e/i);
      await user.type(nameInput, 'Minimal');

      const submitButton = screen.getByRole('button', { name: /create block/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockBlockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
        })
      );
    });

    test('stores size as number when provided', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      render(
        <AddBlockModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const nameInput = screen.getByPlaceholderText(/block e/i);
      await user.type(nameInput, 'Test');

      const sizeInput = screen.getByRole('spinbutton');
      await user.type(sizeInput, '12.3');

      const submitButton = screen.getByRole('button', { name: /create block/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockBlockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          size_acres: 12.3,
        })
      );
    });
  });
});
