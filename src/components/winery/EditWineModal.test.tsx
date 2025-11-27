import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditWineModal } from './EditWineModal';

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}));

const mockWine = {
  id: 'wine-1',
  name: 'CABERNET BARREL 1',
  wine_type: 'red',
  current_stage: 'primary_fermentation',
  status: 'active',
  current_volume_gallons: 5,
  volume_gallons: 5.5,
  last_tasting_notes: 'Good flavor development',
};

const mockUpdateWine = rs.fn();

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    query: {
      wine: {
        where: rs.fn().mockReturnThis(),
      },
    },
    mutate: {
      wine: {
        update: mockUpdateWine,
      },
    },
  }),
}));

rs.mock('@rocicorp/zero/react', () => ({
  useQuery: () => [[mockWine]],
}));

rs.mock('./DeleteWineConfirmModal', () => ({
  DeleteWineConfirmModal: ({ isOpen }: { isOpen: boolean }) => {
    if (!isOpen) return null;
    return <div data-testid="delete-wine-modal">Delete Modal</div>;
  },
}));

describe('EditWineModal', () => {
  afterEach(() => {
    cleanup();
    mockUpdateWine.mockClear();
  });

  describe('rendering', () => {
    test('renders when open', () => {
      render(
        <EditWineModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      expect(screen.getByText('EDIT WINE')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(
        <EditWineModal
          isOpen={false}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      expect(screen.queryByText('EDIT WINE')).not.toBeInTheDocument();
    });

    test('displays wine name in form', () => {
      render(
        <EditWineModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      const nameInput = screen.getByDisplayValue('CABERNET BARREL 1');
      expect(nameInput).toBeInTheDocument();
    });

    test('displays current volume in form', () => {
      render(
        <EditWineModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      const volumeInput = screen.getByDisplayValue('5');
      expect(volumeInput).toBeInTheDocument();
    });
  });

  describe('form interactions', () => {
    test('displays all form sections', () => {
      render(
        <EditWineModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      expect(screen.getByText('WINE NAME (REQUIRED)')).toBeInTheDocument();
      expect(screen.getByText('WINE TYPE (REQUIRED)')).toBeInTheDocument();
      expect(screen.getByText(/CURRENT VOLUME/)).toBeInTheDocument();
      expect(screen.getByText('STATUS')).toBeInTheDocument();
      expect(screen.getByText('TASTING NOTES (OPTIONAL)')).toBeInTheDocument();
    });

    test('displays wine type options', () => {
      render(
        <EditWineModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      expect(screen.getByText('Red')).toBeInTheDocument();
      expect(screen.getByText('White')).toBeInTheDocument();
      expect(screen.getByText('Rosé')).toBeInTheDocument();
    });

    test('displays status options', () => {
      render(
        <EditWineModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Aging')).toBeInTheDocument();
      expect(screen.getByText('Bottled')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    test('updates wine with valid data', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();
      mockUpdateWine.mockResolvedValue(undefined);

      render(
        <EditWineModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          wineId="wine-1"
        />
      );

      const nameInput = screen.getByDisplayValue('CABERNET BARREL 1');
      await user.clear(nameInput);
      await user.type(nameInput, 'Cabernet Barrel 2');

      const saveButton = screen.getByText('SAVE CHANGES');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateWine).toHaveBeenCalled();
      });

      expect(mockOnSuccess).toHaveBeenCalledWith(
        expect.stringContaining('updated successfully')
      );
    });

    test('shows loading state while submitting', async () => {
      const user = userEvent.setup();
      let resolveUpdate: () => void;
      const updatePromise = new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      });
      mockUpdateWine.mockReturnValue(updatePromise);

      render(
        <EditWineModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      const saveButton = screen.getByText('SAVE CHANGES');
      await user.click(saveButton);

      expect(screen.getByText('SAVING...')).toBeInTheDocument();

      resolveUpdate!();
      await waitFor(() => {
        expect(mockUpdateWine).toHaveBeenCalled();
      });
    });
  });

  describe('modal actions', () => {
    test('calls onClose when cancel button clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = rs.fn();

      render(
        <EditWineModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      const cancelButton = screen.getByText('CANCEL');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('opens delete modal when delete button clicked', async () => {
      const user = userEvent.setup();

      render(
        <EditWineModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          wineId="wine-1"
        />
      );

      const deleteButton = screen.getByText('DELETE WINE');
      await user.click(deleteButton);

      expect(screen.getByTestId('delete-wine-modal')).toBeInTheDocument();
    });
  });
});
