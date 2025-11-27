import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { RemoveVarietyConfirmModal } from './RemoveVarietyConfirmModal';
import { type VineDataRaw } from './vineyard-types';

const mockVineDelete = rs.fn().mockResolvedValue(undefined);
const mockVineUpdate = rs.fn().mockResolvedValue(undefined);

rs.mock('../contexts/ZeroContext', () => ({
  useZero: () => ({
    mutate: {
      vine: {
        delete: mockVineDelete,
        update: mockVineUpdate,
      },
    },
  }),
}));

const createMockVine = (overrides: Partial<VineDataRaw> = {}): VineDataRaw => ({
  id: 'vine-1',
  user_id: 'user-1',
  block: 'block-1',
  sequence_number: 1,
  variety: 'CABERNET',
  planting_date: Date.now(),
  health: 'Good',
  notes: '',
  qr_generated: 0,
  created_at: Date.now(),
  updated_at: Date.now(),
  ...overrides,
});

describe('RemoveVarietyConfirmModal', () => {
  afterEach(() => {
    cleanup();
    mockVineDelete.mockClear();
    mockVineUpdate.mockClear();
  });

  describe('visibility', () => {
    test('does not render when closed', () => {
      render(
        <RemoveVarietyConfirmModal
          isOpen={false}
          onClose={rs.fn()}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine()]}
          remainingVarieties={['MERLOT']}
          onConfirm={rs.fn()}
        />
      );

      expect(screen.queryByText('REMOVE VARIETIES')).not.toBeInTheDocument();
    });

    test('renders when opened', () => {
      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine()]}
          remainingVarieties={['MERLOT']}
          onConfirm={rs.fn()}
        />
      );

      expect(screen.getByText('REMOVE VARIETIES')).toBeInTheDocument();
    });
  });

  describe('single variety removal', () => {
    test('shows singular variety text', () => {
      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine()]}
          remainingVarieties={['MERLOT']}
          onConfirm={rs.fn()}
        />
      );

      expect(screen.getByText(/you are removing variety/i)).toBeInTheDocument();
      expect(screen.getByText('CABERNET')).toBeInTheDocument();
    });

    test('shows affected vine count singular', () => {
      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine()]}
          remainingVarieties={['MERLOT']}
          onConfirm={rs.fn()}
        />
      );

      expect(screen.getByText(/1 vine is using this variety/i)).toBeInTheDocument();
    });
  });

  describe('multiple varieties removal', () => {
    test('shows plural varieties text', () => {
      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          removedVarieties={['CABERNET', 'MERLOT']}
          affectedVines={[
            createMockVine({ id: 'vine-1', variety: 'CABERNET' }),
            createMockVine({ id: 'vine-2', variety: 'MERLOT' }),
          ]}
          remainingVarieties={['CHARDONNAY']}
          onConfirm={rs.fn()}
        />
      );

      expect(screen.getByText(/you are removing varieties/i)).toBeInTheDocument();
      expect(screen.getByText('CABERNET, MERLOT')).toBeInTheDocument();
    });

    test('shows affected vine count plural', () => {
      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          removedVarieties={['CABERNET']}
          affectedVines={[
            createMockVine({ id: 'vine-1' }),
            createMockVine({ id: 'vine-2' }),
          ]}
          remainingVarieties={['MERLOT']}
          onConfirm={rs.fn()}
        />
      );

      expect(screen.getByText(/2 vines are using this variety/i)).toBeInTheDocument();
    });
  });

  describe('migration options', () => {
    test('shows migrate option when remaining varieties available', () => {
      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine()]}
          remainingVarieties={['MERLOT', 'CHARDONNAY']}
          onConfirm={rs.fn()}
        />
      );

      expect(screen.getByText(/migrate 1 vine to:/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    test('shows remaining varieties in dropdown', () => {
      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine()]}
          remainingVarieties={['MERLOT', 'CHARDONNAY']}
          onConfirm={rs.fn()}
        />
      );

      expect(screen.getByText('MERLOT')).toBeInTheDocument();
      expect(screen.getByText('CHARDONNAY')).toBeInTheDocument();
    });

    test('defaults to migrate option when varieties available', () => {
      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine()]}
          remainingVarieties={['MERLOT']}
          onConfirm={rs.fn()}
        />
      );

      const migrateRadio = screen.getByRole('radio', { name: /migrate 1 vine to/i });
      expect(migrateRadio).toBeChecked();
    });

    test('shows delete all option', () => {
      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine()]}
          remainingVarieties={['MERLOT']}
          onConfirm={rs.fn()}
        />
      );

      expect(screen.getByText(/delete all 1 affected vine/i)).toBeInTheDocument();
    });

    test('defaults to delete when no remaining varieties', () => {
      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine()]}
          remainingVarieties={[]}
          onConfirm={rs.fn()}
        />
      );

      const deleteRadio = screen.getByRole('radio', { name: /delete all 1 affected vine/i });
      expect(deleteRadio).toBeChecked();

      expect(screen.queryByText(/migrate 1 vine to/i)).not.toBeInTheDocument();
    });
  });

  describe('migration action', () => {
    test('migrates vines to selected variety on confirm', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onConfirm = rs.fn().mockResolvedValue(undefined);

      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={onClose}
          removedVarieties={['CABERNET']}
          affectedVines={[
            createMockVine({ id: 'vine-1', variety: 'CABERNET' }),
            createMockVine({ id: 'vine-2', variety: 'CABERNET' }),
          ]}
          remainingVarieties={['MERLOT', 'CHARDONNAY']}
          onConfirm={onConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockVineUpdate).toHaveBeenCalledTimes(2);
      expect(mockVineUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'vine-1',
          variety: 'MERLOT',
        })
      );
      expect(mockVineUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'vine-2',
          variety: 'MERLOT',
        })
      );
      expect(mockVineDelete).not.toHaveBeenCalled();
      expect(onConfirm).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    test('can switch migration target variety', async () => {
      const user = userEvent.setup();
      const onConfirm = rs.fn().mockResolvedValue(undefined);

      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine()]}
          remainingVarieties={['MERLOT', 'CHARDONNAY']}
          onConfirm={onConfirm}
        />
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'CHARDONNAY');

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockVineUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          variety: 'CHARDONNAY',
        })
      );
    });
  });

  describe('delete action', () => {
    test('deletes all affected vines when delete option selected', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onConfirm = rs.fn().mockResolvedValue(undefined);

      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={onClose}
          removedVarieties={['CABERNET']}
          affectedVines={[
            createMockVine({ id: 'vine-1' }),
            createMockVine({ id: 'vine-2' }),
          ]}
          remainingVarieties={['MERLOT']}
          onConfirm={onConfirm}
        />
      );

      const deleteRadio = screen.getByRole('radio', { name: /delete all 2 affected vines/i });
      await user.click(deleteRadio);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockVineDelete).toHaveBeenCalledTimes(2);
      expect(mockVineDelete).toHaveBeenCalledWith({ id: 'vine-1' });
      expect(mockVineDelete).toHaveBeenCalledWith({ id: 'vine-2' });
      expect(mockVineUpdate).not.toHaveBeenCalled();
      expect(onConfirm).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    test('deletes vines when no remaining varieties available', async () => {
      const user = userEvent.setup();
      const onConfirm = rs.fn().mockResolvedValue(undefined);

      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine({ id: 'vine-1' })]}
          remainingVarieties={[]}
          onConfirm={onConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockVineDelete).toHaveBeenCalledWith({ id: 'vine-1' });
      expect(mockVineUpdate).not.toHaveBeenCalled();
    });
  });

  describe('cancel functionality', () => {
    test('closes modal when cancel clicked', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={onClose}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine()]}
          remainingVarieties={['MERLOT']}
          onConfirm={rs.fn()}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
      expect(mockVineDelete).not.toHaveBeenCalled();
      expect(mockVineUpdate).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('shows error message when operation fails', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      mockVineUpdate.mockRejectedValue(new Error('Database error'));

      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={onClose}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine()]}
          remainingVarieties={['MERLOT']}
          onConfirm={rs.fn()}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText(/failed to update varieties/i)).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    test('disables buttons while processing', async () => {
      const user = userEvent.setup();

      mockVineUpdate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));

      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          removedVarieties={['CABERNET']}
          affectedVines={[createMockVine()]}
          remainingVarieties={['MERLOT']}
          onConfirm={rs.fn().mockResolvedValue(undefined)}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(screen.getByRole('button', { name: /updating/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

      await new Promise(resolve => setTimeout(resolve, 600));
    });
  });

  describe('no affected vines', () => {
    test('calls onConfirm directly when no vines affected', async () => {
      const user = userEvent.setup();
      const onConfirm = rs.fn().mockResolvedValue(undefined);
      const onClose = rs.fn();

      render(
        <RemoveVarietyConfirmModal
          isOpen={true}
          onClose={onClose}
          removedVarieties={['CABERNET']}
          affectedVines={[]}
          remainingVarieties={['MERLOT']}
          onConfirm={onConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockVineDelete).not.toHaveBeenCalled();
      expect(mockVineUpdate).not.toHaveBeenCalled();
      expect(onConfirm).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
