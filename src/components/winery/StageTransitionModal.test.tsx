import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StageTransitionModal } from './StageTransitionModal';

// Mock dependencies
const mockStageHistoryUpdate = rs.fn().mockResolvedValue(undefined);
const mockStageHistoryInsert = rs.fn().mockResolvedValue(undefined);
const mockWineUpdate = rs.fn().mockResolvedValue(undefined);
const mockVintageUpdate = rs.fn().mockResolvedValue(undefined);

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

describe('StageTransitionModal', () => {
  afterEach(() => {
    cleanup();
    mockStageHistoryUpdate.mockClear();
    mockStageHistoryInsert.mockClear();
    mockWineUpdate.mockClear();
    mockVintageUpdate.mockClear();
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
      expect(screen.getByRole('heading', { name: 'ADVANCE STAGE' })).toBeInTheDocument();
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
        />
      );

      expect(screen.getByText('Crush')).toBeInTheDocument();
      expect(screen.getByText('Primary Fermentation')).toBeInTheDocument();
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
          currentStage="bottling"
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
        />
      );

      const dropdown = screen.getByRole('combobox');
      await user.selectOptions(dropdown, 'racking');

      // Should show how many stages are being skipped
      expect(screen.getByText(/skip 2 stages/i)).toBeInTheDocument();
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
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(screen.getByText(/mark "crush" stage as skipped/i)).toBeInTheDocument();
    });

    test('shows hint when checkbox is checked', async () => {
      const user = userEvent.setup();

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

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(screen.getByText(/marked as skipped in the stage history/i)).toBeInTheDocument();
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
        />
      );

      expect(screen.getByRole('button', { name: 'CANCEL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ADVANCE STAGE' })).toBeInTheDocument();
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
        />
      );

      const advanceButton = screen.getByRole('button', { name: 'ADVANCE STAGE' });
      await user.click(advanceButton);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should update previous stage history
      expect(mockStageHistoryUpdate).toHaveBeenCalled();

      // Should insert new stage history
      expect(mockStageHistoryInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'wine',
          entity_id: 'wine-1',
          stage: 'primary_fermentation',
          completed_at: null,
          skipped: false,
        })
      );

      // Should update wine's current stage
      expect(mockWineUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wine-1',
          current_stage: 'primary_fermentation',
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

      const advanceButton = screen.getByRole('button', { name: 'ADVANCE STAGE' });
      await user.click(advanceButton);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should update vintage's current stage
      expect(mockVintageUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'vintage-1',
          current_stage: 'allocated',
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
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Important notes');

      const advanceButton = screen.getByRole('button', { name: 'ADVANCE STAGE' });
      await user.click(advanceButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockStageHistoryInsert).toHaveBeenCalledWith(
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
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      const advanceButton = screen.getByRole('button', { name: 'ADVANCE STAGE' });
      await user.click(advanceButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockStageHistoryUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          skipped: true,
        })
      );
    });
  });
});
