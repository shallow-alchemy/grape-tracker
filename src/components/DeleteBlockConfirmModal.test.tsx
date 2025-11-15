import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DeleteBlockConfirmModal } from './DeleteBlockConfirmModal';

// Create mock functions at top level
const mockBlockDelete = rs.fn().mockResolvedValue(undefined);
const mockVineDelete = rs.fn().mockResolvedValue(undefined);
const mockVineUpdate = rs.fn().mockResolvedValue(undefined);

let mockVinesData: any[] = [];
let mockBlocksData: any[] = [];

// Mock modules
rs.mock('../contexts/ZeroContext', () => ({
  useZero: () => ({
    mutate: {
      block: {
        delete: mockBlockDelete,
      },
      vine: {
        delete: mockVineDelete,
        update: mockVineUpdate,
      },
    },
  }),
}));

rs.mock('./vineyard-hooks', () => ({
  useVines: () => mockVinesData,
  useBlocks: () => mockBlocksData,
}));

describe('DeleteBlockConfirmModal', () => {
  afterEach(() => {
    cleanup();
    mockBlockDelete.mockClear();
    mockVineDelete.mockClear();
    mockVineUpdate.mockClear();
    mockVinesData = [];
    mockBlocksData = [];
  });

  describe('visibility', () => {
    test('does not render when closed', () => {
      mockBlocksData = [{
        id: 'block-1',
        vineyard_id: 'v1',
        name: 'Block A',
        location: '',
        size_acres: 0,
        soil_type: '',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      }];

      render(
        <DeleteBlockConfirmModal
          isOpen={false}
          onClose={rs.fn()}
          deleteBlockId="block-1"
          onSuccess={rs.fn()}
        />
      );

      expect(screen.queryByText('DELETE BLOCK')).not.toBeInTheDocument();
    });

    test('does not render when deleteBlockId is null', () => {
      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          deleteBlockId={null}
          onSuccess={rs.fn()}
        />
      );

      expect(screen.queryByText('DELETE BLOCK')).not.toBeInTheDocument();
    });

    test('does not render when block not found', () => {
      mockBlocksData = [{
        id: 'block-1',
        vineyard_id: 'v1',
        name: 'Block A',
        location: '',
        size_acres: 0,
        soil_type: '',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      }];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          deleteBlockId="non-existent"
          onSuccess={rs.fn()}
        />
      );

      expect(screen.queryByText('DELETE BLOCK')).not.toBeInTheDocument();
    });

    test('renders when opened with valid block', () => {
      mockBlocksData = [{
        id: 'block-1',
        vineyard_id: 'v1',
        name: 'Block A',
        location: '',
        size_acres: 0,
        soil_type: '',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      }];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          deleteBlockId="block-1"
          onSuccess={rs.fn()}
        />
      );

      expect(screen.getByText('DELETE BLOCK')).toBeInTheDocument();
      expect(screen.getByText(/you are about to delete/i)).toBeInTheDocument();
      expect(screen.getByText('Block A')).toBeInTheDocument();
    });
  });

  describe('block with no vines', () => {
    test('shows simple delete message for empty block', () => {
      mockBlocksData = [{
        id: 'block-1',
        vineyard_id: 'v1',
        name: 'Empty Block',
        location: '',
        size_acres: 0,
        soil_type: '',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      }];
      mockVinesData = [];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          deleteBlockId="block-1"
          onSuccess={rs.fn()}
        />
      );

      expect(screen.getByText(/you are about to delete/i)).toBeInTheDocument();
      expect(screen.queryByText(/this block contains/i)).not.toBeInTheDocument();
    });

    test('deletes empty block successfully', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      mockBlocksData = [{
        id: 'block-1',
        vineyard_id: 'v1',
        name: 'Empty Block',
        location: '',
        size_acres: 0,
        soil_type: '',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      }];
      mockVinesData = [];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={onClose}
          deleteBlockId="block-1"
          onSuccess={onSuccess}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(deleteButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockBlockDelete).toHaveBeenCalledWith({ id: 'block-1' });
      expect(mockVineDelete).not.toHaveBeenCalled();
      expect(mockVineUpdate).not.toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith('Block deleted successfully');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('block with vines - single vine', () => {
    test('shows singular vine count', () => {
      mockBlocksData = [{
        id: 'block-1',
        vineyard_id: 'v1',
        name: 'Block A',
        location: '',
        size_acres: 0,
        soil_type: '',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      }];
      mockVinesData = [{
        id: '001',
        block: 'block-1',
        sequence_number: 1,
        variety: 'CABERNET',
        planting_date: Date.now(),
        health: 'Good',
        notes: '',
        qr_generated: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
      }];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          deleteBlockId="block-1"
          onSuccess={rs.fn()}
        />
      );

      // Text is split across elements, check that vine count message exists
      expect(screen.getByText(/this block contains/i)).toBeInTheDocument();
      const vines = screen.getAllByText(/1 vine/i);
      expect(vines.length).toBeGreaterThan(0);
    });
  });

  describe('block with vines - multiple vines', () => {
    test('shows plural vine count', () => {
      mockBlocksData = [{
        id: 'block-1',
        vineyard_id: 'v1',
        name: 'Block A',
        location: '',
        size_acres: 0,
        soil_type: '',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      }];
      mockVinesData = [
        {
          id: '001',
          block: 'block-1',
          sequence_number: 1,
          variety: 'CABERNET',
          planting_date: Date.now(),
          health: 'Good',
          notes: '',
          qr_generated: 0,
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        {
          id: '002',
          block: 'block-1',
          sequence_number: 2,
          variety: 'MERLOT',
          planting_date: Date.now(),
          health: 'Good',
          notes: '',
          qr_generated: 0,
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          deleteBlockId="block-1"
          onSuccess={rs.fn()}
        />
      );

      // Text is split across elements, check that vine count message exists
      expect(screen.getByText(/this block contains/i)).toBeInTheDocument();
      const vines = screen.getAllByText(/2 vines/i);
      expect(vines.length).toBeGreaterThan(0);
    });
  });

  describe('migration options', () => {
    test('shows migrate option when other blocks available', () => {
      mockBlocksData = [
        {
          id: 'block-1',
          vineyard_id: 'v1',
          name: 'Block A',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'block-2',
          vineyard_id: 'v1',
          name: 'Block B',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      mockVinesData = [{
        id: '001',
        block: 'block-1',
        sequence_number: 1,
        variety: 'CABERNET',
        planting_date: Date.now(),
        health: 'Good',
        notes: '',
        qr_generated: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
      }];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          deleteBlockId="block-1"
          onSuccess={rs.fn()}
        />
      );

      expect(screen.getByText(/migrate 1 vine to:/i)).toBeInTheDocument();
      expect(screen.getByText(/delete block and all 1 vine/i)).toBeInTheDocument();
    });

    test('defaults to migrate option when blocks available', () => {
      mockBlocksData = [
        {
          id: 'block-1',
          vineyard_id: 'v1',
          name: 'Block A',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'block-2',
          vineyard_id: 'v1',
          name: 'Block B',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      mockVinesData = [{
        id: '001',
        block: 'block-1',
        sequence_number: 1,
        variety: 'CABERNET',
        planting_date: Date.now(),
        health: 'Good',
        notes: '',
        qr_generated: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
      }];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          deleteBlockId="block-1"
          onSuccess={rs.fn()}
        />
      );

      const migrateRadio = screen.getByRole('radio', { name: /migrate 1 vine to/i });
      expect(migrateRadio).toBeChecked();

      const deleteAllRadio = screen.getByRole('radio', { name: /delete block and all 1 vine/i });
      expect(deleteAllRadio).not.toBeChecked();
    });

    test('shows migration block selector', () => {
      mockBlocksData = [
        {
          id: 'block-1',
          vineyard_id: 'v1',
          name: 'Block A',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'block-2',
          vineyard_id: 'v1',
          name: 'Block B',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'block-3',
          vineyard_id: 'v1',
          name: 'Block C',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      mockVinesData = [{
        id: '001',
        block: 'block-1',
        sequence_number: 1,
        variety: 'CABERNET',
        planting_date: Date.now(),
        health: 'Good',
        notes: '',
        qr_generated: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
      }];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          deleteBlockId="block-1"
          onSuccess={rs.fn()}
        />
      );

      // Should show Block B and Block C as options (not Block A since that's being deleted)
      expect(screen.getByText('Block B')).toBeInTheDocument();
      expect(screen.getByText('Block C')).toBeInTheDocument();
    });

    test('user can switch to delete all vines option', async () => {
      const user = userEvent.setup();

      mockBlocksData = [
        {
          id: 'block-1',
          vineyard_id: 'v1',
          name: 'Block A',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'block-2',
          vineyard_id: 'v1',
          name: 'Block B',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      mockVinesData = [{
        id: '001',
        block: 'block-1',
        sequence_number: 1,
        variety: 'CABERNET',
        planting_date: Date.now(),
        health: 'Good',
        notes: '',
        qr_generated: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
      }];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          deleteBlockId="block-1"
          onSuccess={rs.fn()}
        />
      );

      const deleteAllRadio = screen.getByRole('radio', { name: /delete block and all 1 vine/i });
      await user.click(deleteAllRadio);

      expect(deleteAllRadio).toBeChecked();

      const migrateRadio = screen.getByRole('radio', { name: /migrate 1 vine to/i });
      expect(migrateRadio).not.toBeChecked();
    });
  });

  describe('delete operations', () => {
    test('migrates vines to selected block', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      mockBlocksData = [
        {
          id: 'block-1',
          vineyard_id: 'v1',
          name: 'Block A',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'block-2',
          vineyard_id: 'v1',
          name: 'Block B',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      mockVinesData = [
        {
          id: '001',
          block: 'block-1',
          sequence_number: 1,
          variety: 'CABERNET',
          planting_date: Date.now(),
          health: 'Good',
          notes: '',
          qr_generated: 0,
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        {
          id: '002',
          block: 'block-1',
          sequence_number: 2,
          variety: 'MERLOT',
          planting_date: Date.now(),
          health: 'Good',
          notes: '',
          qr_generated: 0,
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={onClose}
          deleteBlockId="block-1"
          onSuccess={onSuccess}
        />
      );

      // Migrate option should be selected by default
      const deleteButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(deleteButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should update vines to migrate them
      expect(mockVineUpdate).toHaveBeenCalledTimes(2);
      expect(mockVineUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '001',
          block: 'block-2',
        })
      );
      expect(mockVineUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '002',
          block: 'block-2',
        })
      );

      // Should delete the block
      expect(mockBlockDelete).toHaveBeenCalledWith({ id: 'block-1' });

      // Should NOT delete vines
      expect(mockVineDelete).not.toHaveBeenCalled();

      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    test('deletes all vines when delete all option selected', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      mockBlocksData = [
        {
          id: 'block-1',
          vineyard_id: 'v1',
          name: 'Block A',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'block-2',
          vineyard_id: 'v1',
          name: 'Block B',
          location: '',
          size_acres: 0,
          soil_type: '',
          notes: '',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      mockVinesData = [
        {
          id: '001',
          block: 'block-1',
          sequence_number: 1,
          variety: 'CABERNET',
          planting_date: Date.now(),
          health: 'Good',
          notes: '',
          qr_generated: 0,
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        {
          id: '002',
          block: 'block-1',
          sequence_number: 2,
          variety: 'MERLOT',
          planting_date: Date.now(),
          health: 'Good',
          notes: '',
          qr_generated: 0,
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={onClose}
          deleteBlockId="block-1"
          onSuccess={onSuccess}
        />
      );

      // Select delete all option
      const deleteAllRadio = screen.getByRole('radio', { name: /delete block and all 2 vines/i });
      await user.click(deleteAllRadio);

      const deleteButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(deleteButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should delete all vines
      expect(mockVineDelete).toHaveBeenCalledTimes(2);
      expect(mockVineDelete).toHaveBeenCalledWith({ id: '001' });
      expect(mockVineDelete).toHaveBeenCalledWith({ id: '002' });

      // Should delete the block
      expect(mockBlockDelete).toHaveBeenCalledWith({ id: 'block-1' });

      // Should NOT update vines
      expect(mockVineUpdate).not.toHaveBeenCalled();

      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    test('only deletes block and vines - no migration when no other blocks', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      mockBlocksData = [{
        id: 'block-1',
        vineyard_id: 'v1',
        name: 'Last Block',
        location: '',
        size_acres: 0,
        soil_type: '',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      }];
      mockVinesData = [{
        id: '001',
        block: 'block-1',
        sequence_number: 1,
        variety: 'CABERNET',
        planting_date: Date.now(),
        health: 'Good',
        notes: '',
        qr_generated: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
      }];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={onClose}
          deleteBlockId="block-1"
          onSuccess={onSuccess}
        />
      );

      // Should only show delete all option (no migrate option)
      expect(screen.queryByText(/migrate 1 vine to/i)).not.toBeInTheDocument();
      expect(screen.getByText(/delete block and all 1 vine/i)).toBeInTheDocument();

      const deleteButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(deleteButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockVineDelete).toHaveBeenCalledWith({ id: '001' });
      expect(mockBlockDelete).toHaveBeenCalledWith({ id: 'block-1' });
      expect(mockVineUpdate).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('shows error message when deletion fails', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      mockBlockDelete.mockRejectedValue(new Error('Database error'));

      mockBlocksData = [{
        id: 'block-1',
        vineyard_id: 'v1',
        name: 'Block A',
        location: '',
        size_acres: 0,
        soil_type: '',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      }];
      mockVinesData = [];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={onClose}
          deleteBlockId="block-1"
          onSuccess={onSuccess}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(deleteButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText(/failed to delete block/i)).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    test('guards against null deleteBlockId in delete handler', async () => {
      const user = userEvent.setup();

      mockBlocksData = [{
        id: 'block-1',
        vineyard_id: 'v1',
        name: 'Block A',
        location: '',
        size_acres: 0,
        soil_type: '',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      }];
      mockVinesData = [];

      const { rerender } = render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          deleteBlockId="block-1"
          onSuccess={rs.fn()}
        />
      );

      // Change deleteBlockId to null after render
      rerender(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          deleteBlockId={null}
          onSuccess={rs.fn()}
        />
      );

      // Modal should close since deleteBlockId is null (early return on line 48)
      expect(screen.queryByText('DELETE BLOCK')).not.toBeInTheDocument();
    });
  });

  describe('cancel functionality', () => {
    test('closes modal and resets state when cancel clicked', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      mockBlocksData = [{
        id: 'block-1',
        vineyard_id: 'v1',
        name: 'Block A',
        location: '',
        size_acres: 0,
        soil_type: '',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      }];
      mockVinesData = [];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={onClose}
          deleteBlockId="block-1"
          onSuccess={rs.fn()}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
      expect(mockBlockDelete).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    test('disables buttons while deleting', async () => {
      const user = userEvent.setup();

      mockBlockDelete.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));

      mockBlocksData = [{
        id: 'block-1',
        vineyard_id: 'v1',
        name: 'Block A',
        location: '',
        size_acres: 0,
        soil_type: '',
        notes: '',
        created_at: new Date(),
        updated_at: new Date(),
      }];
      mockVinesData = [];

      render(
        <DeleteBlockConfirmModal
          isOpen={true}
          onClose={rs.fn()}
          deleteBlockId="block-1"
          onSuccess={rs.fn()}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(deleteButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /deleting/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

      await new Promise(resolve => setTimeout(resolve, 600));
    });
  });
});
