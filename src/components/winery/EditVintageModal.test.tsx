import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditVintageModal } from './EditVintageModal';

const mockVintage = {
  id: 'vintage-1',
  vintage_year: 2024,
  variety: 'Cabernet Sauvignon',
  harvest_date: Date.now() - 86400000 * 30, // 30 days ago
  harvest_weight_lbs: 1000,
  harvest_volume_gallons: 50,
  notes: 'Great harvest',
};

const mockUpdateVintage = rs.fn();
const mockUpdateMeasurement = rs.fn();
const mockMeasurement = {
  id: 'measure-1',
  entity_type: 'vintage',
  entity_id: 'vintage-1',
  stage: 'harvest',
  brix: 24.5,
  ph: 3.4,
  ta: 6.5,
};

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
      measurement: {
        where: rs.fn().mockReturnThis(),
      },
    },
    mutate: {
      vintage: {
        update: mockUpdateVintage,
      },
      measurement: {
        update: mockUpdateMeasurement,
      },
    },
  }),
}));

rs.mock('@rocicorp/zero/react', () => ({
  useQuery: () => [[mockMeasurement]],
}));

rs.mock('./DeleteVintageConfirmModal', () => ({
  DeleteVintageConfirmModal: ({ isOpen }: { isOpen: boolean }) => {
    if (!isOpen) return null;
    return <div data-testid="delete-vintage-modal">Delete Modal</div>;
  },
}));

describe('EditVintageModal', () => {
  afterEach(() => {
    cleanup();
    mockUpdateVintage.mockClear();
    mockUpdateMeasurement.mockClear();
  });

  describe('rendering', () => {
    test('renders when open', () => {
      render(
        <EditVintageModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      expect(screen.getByText('EDIT VINTAGE')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(
        <EditVintageModal
          isOpen={false}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      expect(screen.queryByText('EDIT VINTAGE')).not.toBeInTheDocument();
    });

    test('displays harvest measurements in form', () => {
      render(
        <EditVintageModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      const brixInput = screen.getByDisplayValue('24.5');
      expect(brixInput).toBeInTheDocument();
    });
  });

  describe('form sections', () => {
    test('displays harvest measurement fields', () => {
      render(
        <EditVintageModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      const brixInput = screen.getByDisplayValue('24.5');
      expect(brixInput).toBeInTheDocument();

      const phInput = screen.getByDisplayValue('3.4');
      expect(phInput).toBeInTheDocument();
    });

    test('displays notes textarea', () => {
      render(
        <EditVintageModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      const notesInput = screen.getByDisplayValue('Great harvest');
      expect(notesInput).toBeInTheDocument();
    });

    test('displays all action buttons', () => {
      render(
        <EditVintageModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      expect(screen.getByText('CANCEL')).toBeInTheDocument();
      expect(screen.getByText('SAVE CHANGES')).toBeInTheDocument();
      expect(screen.getByText('DELETE VINTAGE')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    test('updates vintage with valid data', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();
      mockUpdateVintage.mockResolvedValue(undefined);
      mockUpdateMeasurement.mockResolvedValue(undefined);

      render(
        <EditVintageModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          vintage={mockVintage}
        />
      );

      const saveButton = screen.getByText('SAVE CHANGES');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateVintage).toHaveBeenCalled();
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
      mockUpdateVintage.mockReturnValue(updatePromise);

      render(
        <EditVintageModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      const saveButton = screen.getByText('SAVE CHANGES');
      await user.click(saveButton);

      expect(screen.getByText('SAVING...')).toBeInTheDocument();

      resolveUpdate!();
      await waitFor(() => {
        expect(mockUpdateVintage).toHaveBeenCalled();
      });
    });
  });

  describe('modal actions', () => {
    test('calls onClose when cancel button clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = rs.fn();

      render(
        <EditVintageModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      const cancelButton = screen.getByText('CANCEL');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('opens delete modal when delete button clicked', async () => {
      const user = userEvent.setup();

      render(
        <EditVintageModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          vintage={mockVintage}
        />
      );

      const deleteButton = screen.getByText('DELETE VINTAGE');
      await user.click(deleteButton);

      expect(screen.getByTestId('delete-vintage-modal')).toBeInTheDocument();
    });
  });
});
