import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StageTransitionModal } from './StageTransitionModal';

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}));

// Mock dependencies
const mockStageHistoryUpdate = rs.fn().mockResolvedValue(undefined);
const mockStageHistoryInsert = rs.fn().mockResolvedValue(undefined);
const mockWineUpdate = rs.fn().mockResolvedValue(undefined);
const mockVintageUpdate = rs.fn().mockResolvedValue(undefined);
const mockAdvanceStage = rs.fn().mockResolvedValue({ success: true, tasksCreated: 0 });

rs.mock('./useStageTransition', () => ({
  useStageTransition: () => ({
    advanceStage: mockAdvanceStage,
    isLoading: false,
    error: null,
  }),
}));

rs.mock('../../contexts/ZeroContext', () => ({
  useZero: () => ({
    query: {
      stage_history: {
        where: rs.fn().mockReturnThis(),
        run: rs.fn().mockResolvedValue([
          {
            id: 'history-1',
            entity_type: 'wine',
            entity_id: 'wine-1',
            stage: 'crush',
            started_at: Date.now() - 1000000,
            completed_at: null,
            skipped: false,
            notes: '',
            created_at: Date.now() - 1000000,
            updated_at: Date.now() - 1000000,
          }
        ]),
      },
    },
    mutate: {
      stage_history: {
        update: mockStageHistoryUpdate,
        insert: mockStageHistoryInsert,
      },
      wine: {
        update: mockWineUpdate,
      },
      vintage: {
        update: mockVintageUpdate,
      },
    },
  }),
}));

rs.mock('../Modal', () => ({
  Modal: ({ isOpen, title, titleRight, children }: { isOpen: boolean; title: string; titleRight?: React.ReactNode; children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{title}</h2>
          {titleRight && <div>{titleRight}</div>}
        </div>
        {children}
      </div>
    );
  },
}));

describe('StageTransitionModal', () => {
  afterEach(() => {
    cleanup();
    mockStageHistoryUpdate.mockClear();
    mockStageHistoryInsert.mockClear();
    mockWineUpdate.mockClear();
    mockVintageUpdate.mockClear();
    mockAdvanceStage.mockClear();
  });

  describe('rendering', () => {
    test('does not render when closed', () => {
      render(
        <StageTransitionModal
          isOpen={false}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="crush"
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    test('renders when open', () => {
      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="crush"
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'COMPLETE STAGE' })).toBeInTheDocument();
    });

    test('shows current and next stage for wines', () => {
      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="crush"
          wineType="red"
        />
      );

      expect(screen.getByText('Crush')).toBeInTheDocument();
      // Next stage after crush for red wine is Pre-Fermentation (optional)
      expect(screen.getByText('Pre-Fermentation')).toBeInTheDocument();
    });

    test('shows current and next stage for vintages', () => {
      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="vintage"
          entityId="vintage-1"
          currentStage="harvested"
        />
      );

      expect(screen.getByText('Harvested')).toBeInTheDocument();
      expect(screen.getByText('Allocated')).toBeInTheDocument();
    });

    test('shows final stage message when at last stage', () => {
      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="bottle_aging"
          wineType="red"
        />
      );

      expect(screen.getByText(/already at the final stage/i)).toBeInTheDocument();
    });
  });

  describe('skip ahead functionality', () => {
    test('shows skip ahead dropdown for wines with multiple stages', () => {
      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="crush"
          wineType="red"
        />
      );

      // Should show dropdown with skip options
      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toBeInTheDocument();

      // Should have options for skipping ahead
      expect(screen.getByText(/skip ahead to/i)).toBeInTheDocument();
    });

    test('does not show skip ahead for vintages (only 2 stages)', () => {
      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="vintage"
          entityId="vintage-1"
          currentStage="harvested"
        />
      );

      // Should not show skip ahead section
      expect(screen.queryByText(/skip ahead to/i)).not.toBeInTheDocument();
    });

    test('shows skip count when selecting later stage', async () => {
      const user = userEvent.setup();

      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="crush"
          wineType="red"
        />
      );

      const dropdown = screen.getByRole('combobox');
      // Skip from crush to aging (skipping pre_fermentation, primary_fermentation, press, mlf = 4 stages)
      await user.selectOptions(dropdown, 'aging');

      // Should show how many stages are being skipped
      expect(screen.getByText(/skip 4 stages/i)).toBeInTheDocument();
    });
  });

  describe('skip current stage checkbox', () => {
    test('shows skip current stage checkbox', () => {
      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="crush"
          wineType="red"
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(screen.getByText(/skipped/i)).toBeInTheDocument();
    });
  });

  describe('notes input', () => {
    test('shows notes textarea', () => {
      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="crush"
          wineType="red"
        />
      );

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText(/notes \(optional\)/i)).toBeInTheDocument();
    });

    test('allows entering notes', async () => {
      const user = userEvent.setup();

      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="crush"
          wineType="red"
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test notes');

      expect(textarea).toHaveValue('Test notes');
    });
  });

  describe('modal actions', () => {
    test('shows cancel and advance buttons', () => {
      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="crush"
          wineType="red"
        />
      );

      expect(screen.getByRole('button', { name: 'CANCEL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'COMPLETE STAGE' })).toBeInTheDocument();
    });

    test('closes modal when cancel clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = rs.fn();

      render(
        <StageTransitionModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="crush"
          wineType="red"
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'CANCEL' });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('stage transition execution', () => {
    test('completes previous stage and creates new stage for wine', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          entityType="wine"
          entityId="wine-1"
          currentStage="crush"
          wineType="red"
        />
      );

      const advanceButton = screen.getByRole('button', { name: 'COMPLETE STAGE' });
      await user.click(advanceButton);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should call advanceStage with correct parameters (next stage for red wine after crush is pre_fermentation)
      expect(mockAdvanceStage).toHaveBeenCalledWith(
        'crush',
        expect.objectContaining({
          toStage: 'pre_fermentation',
          notes: '',
          skipCurrentStage: false,
        })
      );

      // Should call onSuccess
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    test('completes previous stage and creates new stage for vintage', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = rs.fn();

      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={mockOnSuccess}
          entityType="vintage"
          entityId="vintage-1"
          currentStage="harvested"
        />
      );

      const advanceButton = screen.getByRole('button', { name: 'COMPLETE STAGE' });
      await user.click(advanceButton);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should call advanceStage with correct parameters
      expect(mockAdvanceStage).toHaveBeenCalledWith(
        'harvested',
        expect.objectContaining({
          toStage: 'allocated',
          notes: '',
          skipCurrentStage: false,
        })
      );

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    test('includes notes in new stage history', async () => {
      const user = userEvent.setup();

      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="crush"
          wineType="red"
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Important notes');

      const advanceButton = screen.getByRole('button', { name: 'COMPLETE STAGE' });
      await user.click(advanceButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAdvanceStage).toHaveBeenCalledWith(
        'crush',
        expect.objectContaining({
          notes: 'Important notes',
        })
      );
    });

    test('marks previous stage as skipped when checkbox checked', async () => {
      const user = userEvent.setup();

      render(
        <StageTransitionModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
          entityType="wine"
          entityId="wine-1"
          currentStage="crush"
          wineType="red"
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      const advanceButton = screen.getByRole('button', { name: 'COMPLETE STAGE' });
      await user.click(advanceButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAdvanceStage).toHaveBeenCalledWith(
        'crush',
        expect.objectContaining({
          skipCurrentStage: true,
        })
      );
    });
  });
});
