import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { VineyardSettingsModal } from './VineyardSettingsModal';

const mockVineyardUpdate = rs.fn().mockResolvedValue(undefined);
const mockVineDelete = rs.fn().mockResolvedValue(undefined);
const mockVineUpdate = rs.fn().mockResolvedValue(undefined);

let mockVineyardData: any = null;
let mockVinesData: any[] = [];

rs.mock('../contexts/ZeroContext', () => ({
  useZero: () => ({
    mutate: {
      vineyard: {
        update: mockVineyardUpdate,
      },
      vine: {
        delete: mockVineDelete,
        update: mockVineUpdate,
      },
    },
  }),
}));

rs.mock('./vineyard-hooks', () => ({
  useVineyard: () => mockVineyardData,
  useVines: () => mockVinesData,
}));

describe('VineyardSettingsModal', () => {
  afterEach(() => {
    cleanup();
    mockVineyardUpdate.mockClear();
    mockVineDelete.mockClear();
    mockVineUpdate.mockClear();
    mockVineyardData = null;
    mockVinesData = [];
  });

  describe('visibility', () => {
    test('does not render when closed', () => {
      mockVineyardData = {
        id: 'vineyard-1',
        user_id: 'user-1',
        name: 'Test Vineyard',
        location: '',
        varieties: ['CABERNET'],
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      render(
        <VineyardSettingsModal
          isOpen={false}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      expect(screen.queryByText('VINEYARD SETTINGS')).not.toBeInTheDocument();
    });

    test('renders when opened with vineyard data', () => {
      mockVineyardData = {
        id: 'vineyard-1',
        user_id: 'user-1',
        name: 'Test Vineyard',
        location: '38.0, -122.0',
        varieties: ['CABERNET', 'MERLOT'],
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      render(
        <VineyardSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      expect(screen.getByText('VINEYARD SETTINGS')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Vineyard')).toBeInTheDocument();
      expect(screen.getByDisplayValue('38.0, -122.0')).toBeInTheDocument();
      expect(screen.getByDisplayValue('CABERNET, MERLOT')).toBeInTheDocument();
    });
  });

  describe('basic save without variety changes', () => {
    test('saves settings when no varieties removed', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      mockVineyardData = {
        id: 'vineyard-1',
        user_id: 'user-1',
        name: 'Test Vineyard',
        location: '',
        varieties: ['CABERNET', 'MERLOT'],
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      mockVinesData = [];

      render(
        <VineyardSettingsModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const nameInput = screen.getByDisplayValue('Test Vineyard');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Vineyard');

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockVineyardUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'vineyard-1',
            name: 'Updated Vineyard',
            varieties: ['CABERNET', 'MERLOT'],
          })
        );
      });

      expect(onSuccess).toHaveBeenCalledWith('Vineyard settings updated successfully');
      expect(onClose).toHaveBeenCalled();
    });

    test('adds new varieties without confirmation', async () => {
      const user = userEvent.setup();
      const onSuccess = rs.fn();

      mockVineyardData = {
        id: 'vineyard-1',
        user_id: 'user-1',
        name: 'Test Vineyard',
        location: '',
        varieties: ['CABERNET'],
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      mockVinesData = [];

      render(
        <VineyardSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={onSuccess}
        />
      );

      const varietiesInput = screen.getByDisplayValue('CABERNET');
      await user.clear(varietiesInput);
      await user.type(varietiesInput, 'CABERNET, MERLOT, CHARDONNAY');

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockVineyardUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            varieties: ['CABERNET', 'MERLOT', 'CHARDONNAY'],
          })
        );
      });

      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe('variety removal with affected vines', () => {
    test('shows confirmation modal when removing variety used by vines', async () => {
      const user = userEvent.setup();

      mockVineyardData = {
        id: 'vineyard-1',
        user_id: 'user-1',
        name: 'Test Vineyard',
        location: '',
        varieties: ['CABERNET', 'MERLOT'],
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      mockVinesData = [
        {
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
        },
      ];

      render(
        <VineyardSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      const varietiesInput = screen.getByDisplayValue('CABERNET, MERLOT');
      await user.clear(varietiesInput);
      await user.type(varietiesInput, 'MERLOT');

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('REMOVE VARIETIES')).toBeInTheDocument();
      });

      expect(screen.getByText('CABERNET')).toBeInTheDocument();
      expect(screen.getByText(/1 vine is using this variety/i)).toBeInTheDocument();
    });

    test('saves directly when removing variety not used by any vines', async () => {
      const user = userEvent.setup();
      const onSuccess = rs.fn();

      mockVineyardData = {
        id: 'vineyard-1',
        user_id: 'user-1',
        name: 'Test Vineyard',
        location: '',
        varieties: ['CABERNET', 'MERLOT', 'CHARDONNAY'],
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      mockVinesData = [
        {
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
        },
      ];

      render(
        <VineyardSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={onSuccess}
        />
      );

      const varietiesInput = screen.getByDisplayValue('CABERNET, MERLOT, CHARDONNAY');
      await user.clear(varietiesInput);
      await user.type(varietiesInput, 'CABERNET, MERLOT');

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockVineyardUpdate).toHaveBeenCalled();
      });

      expect(screen.queryByText('REMOVE VARIETIES')).not.toBeInTheDocument();
      expect(onSuccess).toHaveBeenCalled();
    });

    test('migrates vines and saves when migration confirmed', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();
      const onSuccess = rs.fn();

      mockVineyardData = {
        id: 'vineyard-1',
        user_id: 'user-1',
        name: 'Test Vineyard',
        location: '',
        varieties: ['CABERNET', 'MERLOT'],
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      mockVinesData = [
        {
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
        },
      ];

      render(
        <VineyardSettingsModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const varietiesInput = screen.getByDisplayValue('CABERNET, MERLOT');
      await user.clear(varietiesInput);
      await user.type(varietiesInput, 'MERLOT');

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('REMOVE VARIETIES')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockVineUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'vine-1',
            variety: 'MERLOT',
          })
        );
      });

      expect(mockVineyardUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          varieties: ['MERLOT'],
        })
      );

      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    test('deletes vines when delete option confirmed', async () => {
      const user = userEvent.setup();
      const onSuccess = rs.fn();

      mockVineyardData = {
        id: 'vineyard-1',
        user_id: 'user-1',
        name: 'Test Vineyard',
        location: '',
        varieties: ['CABERNET', 'MERLOT'],
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      mockVinesData = [
        {
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
        },
      ];

      render(
        <VineyardSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={onSuccess}
        />
      );

      const varietiesInput = screen.getByDisplayValue('CABERNET, MERLOT');
      await user.clear(varietiesInput);
      await user.type(varietiesInput, 'MERLOT');

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('REMOVE VARIETIES')).toBeInTheDocument();
      });

      const deleteRadio = screen.getByRole('radio', { name: /delete all 1 affected vine/i });
      await user.click(deleteRadio);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockVineDelete).toHaveBeenCalledWith({ id: 'vine-1' });
      });

      expect(mockVineyardUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          varieties: ['MERLOT'],
        })
      );

      expect(onSuccess).toHaveBeenCalled();
    });

    test('cancelling confirmation modal returns to settings', async () => {
      const user = userEvent.setup();

      mockVineyardData = {
        id: 'vineyard-1',
        user_id: 'user-1',
        name: 'Test Vineyard',
        location: '',
        varieties: ['CABERNET', 'MERLOT'],
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      mockVinesData = [
        {
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
        },
      ];

      render(
        <VineyardSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      const varietiesInput = screen.getByDisplayValue('CABERNET, MERLOT');
      await user.clear(varietiesInput);
      await user.type(varietiesInput, 'MERLOT');

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('REMOVE VARIETIES')).toBeInTheDocument();
      });

      // Get all cancel buttons and click the one in the confirmation modal (last one)
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      await user.click(cancelButtons[cancelButtons.length - 1]);

      await waitFor(() => {
        expect(screen.queryByText('REMOVE VARIETIES')).not.toBeInTheDocument();
      });

      expect(mockVineyardUpdate).not.toHaveBeenCalled();
      expect(mockVineDelete).not.toHaveBeenCalled();
      expect(mockVineUpdate).not.toHaveBeenCalled();
    });
  });

  describe('multiple varieties removal', () => {
    test('shows all removed varieties and all affected vines', async () => {
      const user = userEvent.setup();

      mockVineyardData = {
        id: 'vineyard-1',
        user_id: 'user-1',
        name: 'Test Vineyard',
        location: '',
        varieties: ['CABERNET', 'MERLOT', 'CHARDONNAY'],
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      mockVinesData = [
        {
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
        },
        {
          id: 'vine-2',
          user_id: 'user-1',
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
        <VineyardSettingsModal
          isOpen={true}
          onClose={rs.fn()}
          onSuccess={rs.fn()}
        />
      );

      const varietiesInput = screen.getByDisplayValue('CABERNET, MERLOT, CHARDONNAY');
      await user.clear(varietiesInput);
      await user.type(varietiesInput, 'CHARDONNAY');

      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('REMOVE VARIETIES')).toBeInTheDocument();
      });

      expect(screen.getByText('CABERNET, MERLOT')).toBeInTheDocument();
      expect(screen.getByText(/2 vines are using these varieties/i)).toBeInTheDocument();
    });
  });

  describe('cancel button', () => {
    test('closes modal without saving', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      mockVineyardData = {
        id: 'vineyard-1',
        user_id: 'user-1',
        name: 'Test Vineyard',
        location: '',
        varieties: ['CABERNET'],
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      render(
        <VineyardSettingsModal
          isOpen={true}
          onClose={onClose}
          onSuccess={rs.fn()}
        />
      );

      const nameInput = screen.getByDisplayValue('Test Vineyard');
      await user.clear(nameInput);
      await user.type(nameInput, 'Changed Name');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
      expect(mockVineyardUpdate).not.toHaveBeenCalled();
    });
  });
});
