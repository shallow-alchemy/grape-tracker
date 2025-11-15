import { test, describe, expect, rs, beforeEach, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AddVintageModal } from './AddVintageModal';

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
        insert: rs.fn().mockResolvedValue(undefined),
      },
      stage_history: {
        insert: rs.fn().mockResolvedValue(undefined),
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

      const { container } = render(
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
    test.todo('shows error when duplicate vintage exists');
    test.todo('allows submission when no blocks selected');
    test.todo('validates brix is between 0 and 40');
  });

  describe('form interaction', () => {
    test.todo('allows selecting multiple blocks');
    test.todo('clears form after successful submission');
    test.todo('disables submit button while submitting');
    test.todo('re-enables submit button after submission completes');
  });

  describe('data persistence', () => {
    test.todo('creates vintage record with correct data');
    test.todo('creates initial stage history entry');
  });

  describe('error handling', () => {
    test.todo('shows error message when submission fails');
    test.todo('keeps form data when submission fails');
  });
});
