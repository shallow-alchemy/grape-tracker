import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddMeasurementModal } from './AddMeasurementModal';

const mockMeasurementInsert = rs.fn().mockResolvedValue(undefined);

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
      measurement: {
        insert: mockMeasurementInsert,
      },
    },
  }),
}));

rs.mock('../Modal', () => ({
  Modal: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
      </div>
    );
  },
}));

describe('AddMeasurementModal', () => {
  afterEach(() => {
    cleanup();
    mockMeasurementInsert.mockClear();
  });

  describe('rendering', () => {
    test('does not render when closed', () => {
      render(
        <AddMeasurementModal
          isOpen={false}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    test('renders when open', () => {
      render(
        <AddMeasurementModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'ADD MEASUREMENT' })).toBeInTheDocument();
    });

    test('shows all measurement fields', () => {
      render(
        <AddMeasurementModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      expect(screen.getByText(/date/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/0-14/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/g\/l/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/0-40/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/°f/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/aromas, flavors/i)).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    test('creates measurement with all fields', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <AddMeasurementModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      const phInput = screen.getByPlaceholderText(/0-14/);
      const taInput = screen.getByPlaceholderText(/g\/l/i);
      const brixInput = screen.getByPlaceholderText(/0-40/);
      const tempInput = screen.getByPlaceholderText(/°f/i);
      const tastingNotesInput = screen.getByPlaceholderText(/aromas, flavors/i);

      await user.type(phInput, '3.5');
      await user.type(taInput, '6.5');
      await user.type(brixInput, '22.5');
      await user.type(tempInput, '68');
      await user.type(tastingNotesInput, 'Great flavor');

      const submitButton = screen.getByRole('button', { name: 'ADD MEASUREMENT' });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockMeasurementInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'wine',
          entity_id: 'wine-1',
          stage: 'primary_fermentation',
          ph: 3.5,
          ta: 6.5,
          brix: 22.5,
          temperature: 68,
          tasting_notes: 'Great flavor',
        })
      );

      expect(mockOnSuccess).toHaveBeenCalledWith('Measurement added successfully');
    });

    test('creates measurement with optional fields empty', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <AddMeasurementModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          entityType="wine"
          entityId="wine-1"
          currentStage="aging"
        />
      );

      const submitButton = screen.getByRole('button', { name: 'ADD MEASUREMENT' });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockMeasurementInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'wine',
          entity_id: 'wine-1',
          stage: 'aging',
          ph: null,
          ta: null,
          brix: null,
          temperature: null,
        })
      );

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    test('creates measurement for vintage entity type', async () => {
      const user = userEvent.setup();

      render(
        <AddMeasurementModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="vintage"
          entityId="vintage-1"
          currentStage="harvested"
        />
      );

      const submitButton = screen.getByRole('button', { name: 'ADD MEASUREMENT' });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockMeasurementInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'vintage',
          entity_id: 'vintage-1',
          stage: 'harvested',
        })
      );
    });
  });

  describe('modal actions', () => {
    test('shows cancel and submit buttons', () => {
      render(
        <AddMeasurementModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      expect(screen.getByRole('button', { name: 'CANCEL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ADD MEASUREMENT' })).toBeInTheDocument();
    });

    test('closes modal when cancel clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = rs.fn();

      render(
        <AddMeasurementModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="primary_fermentation"
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'CANCEL' });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
