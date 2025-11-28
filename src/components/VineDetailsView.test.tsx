import { test, describe, expect, rs, beforeEach, afterEach } from '@rstest/core';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { VineDetailsView } from './VineDetailsView';

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}));

const mockVine = {
  id: 'vine-1',
  block: 'North Block',
  sequence_number: 1,
  variety: 'Cabernet Sauvignon',
  planting_date: new Date('2022-04-15').getTime(),
  health: 'Good',
  notes: 'Growing well, needs pruning',
  qr_generated: 1,
};

const mockZero = {
  mutate: {
    vine: {
      update: rs.fn().mockResolvedValue(undefined),
      delete: rs.fn().mockResolvedValue(undefined),
    },
  },
};

rs.mock('./vineyard-hooks', () => ({
  useBlocks: () => [
    { id: 'block-1', name: 'North Block' },
    { id: 'block-2', name: 'South Block' },
  ],
  useVineyard: () => ({ id: 'vineyard-1', name: 'Test Vineyard' }),
}));

rs.mock('../contexts/ZeroContext', () => ({
  useZero: () => mockZero,
}));

rs.mock('qrcode', () => ({
  toDataURL: async () => 'data:image/png;base64,mockqrcode',
  toCanvas: async () => undefined,
  toString: async () => '<svg></svg>',
}));

rs.mock('./vine-stake-3d', () => ({
  generate3MF: async () => new Blob(['mock 3mf data'], { type: 'application/3mf' }),
}));

describe('VineDetailsView', () => {
  const originalCreateElement = document.createElement.bind(document);
  const originalAppendChild = document.body.appendChild.bind(document.body);
  const originalRemoveChild = document.body.removeChild.bind(document.body);

  beforeEach(() => {
    global.URL.createObjectURL = rs.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = rs.fn();
  });

  afterEach(() => {
    cleanup();
    rs.clearAllMocks();
    document.createElement = originalCreateElement;
    document.body.appendChild = originalAppendChild;
    document.body.removeChild = originalRemoveChild;
  });

  describe('displaying vine information', () => {
    test('shows vine variety to user', () => {
      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument();
    });

    test('shows block name to user', () => {
      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      const elements = screen.getAllByText(/North Block/);
      expect(elements.length).toBeGreaterThan(0);
    });

    test('shows planting date to user', () => {
      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      expect(screen.getByText('PLANTED')).toBeInTheDocument();
      expect(screen.getByText(/2022/)).toBeInTheDocument();
    });

    test('shows vine age calculated from planting date', () => {
      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      expect(screen.getByText('AGE')).toBeInTheDocument();
      expect(screen.getByText(/years?/)).toBeInTheDocument();
    });

    test('shows health status to user', () => {
      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      expect(screen.getByText(/Good/)).toBeInTheDocument();
    });

    test.todo('shows notes to user', () => {
      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      expect(screen.getByText('Growing well, needs pruning')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    test('user can navigate back to vine list', async () => {
      const user = userEvent.setup();
      const navigateBack = rs.fn();

      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={navigateBack}
        />
      );

      const backButton = screen.getByText('< BACK TO VINES');
      await user.click(backButton);

      expect(navigateBack).toHaveBeenCalled();
    });
  });

  describe('editing vine details', () => {
    test('user can open settings to edit vine', async () => {
      const user = userEvent.setup();

      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      expect(screen.getByText(/vine settings/i)).toBeInTheDocument();
    });

    test.todo('user can change vine health status', async () => {
      const user = userEvent.setup();
      const onUpdateSuccess = rs.fn();

      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={onUpdateSuccess}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const healthSelect = screen.getByLabelText(/health/i);
      await user.selectOptions(healthSelect, 'Excellent');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockZero.mutate.vine.update).toHaveBeenCalledWith(
          expect.objectContaining({
            health: 'Excellent',
          })
        );
      });
    });

    test('shows success message after updating vine', async () => {
      const user = userEvent.setup();
      const onUpdateSuccess = rs.fn();

      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={onUpdateSuccess}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onUpdateSuccess).toHaveBeenCalledWith(expect.stringContaining('updated'));
      });
    });

    test('user can edit planting date inline', async () => {
      const user = userEvent.setup();
      const onUpdateSuccess = rs.fn();

      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={onUpdateSuccess}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      const plantedLabel = screen.getByText('PLANTED');
      const plantedContainer = plantedLabel.closest('div');
      const editButton = plantedContainer?.querySelector('button');

      expect(editButton).toBeTruthy();
      await user.click(editButton!);

      const dateInput = screen.getByDisplayValue('2022-04-15');
      await user.clear(dateInput);
      await user.type(dateInput, '2023-05-20');
      await user.tab();

      await waitFor(() => {
        expect(mockZero.mutate.vine.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'vine-1',
            planting_date: expect.any(Number),
          })
        );
      });

      expect(onUpdateSuccess).toHaveBeenCalledWith('Planting date updated');
    });
  });

  describe('deleting vine', () => {
    test('user can open delete confirmation', async () => {
      const user = userEvent.setup();

      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(screen.getByText(/delete vine/i)).toBeInTheDocument();
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    test('user can cancel vine deletion', async () => {
      const user = userEvent.setup();
      const onDeleteSuccess = rs.fn();

      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={onDeleteSuccess}
          navigateBack={rs.fn()}
        />
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockZero.mutate.vine.delete).not.toHaveBeenCalled();
      expect(onDeleteSuccess).not.toHaveBeenCalled();
    });

    test('user can confirm vine deletion', async () => {
      const user = userEvent.setup();
      const onDeleteSuccess = rs.fn();

      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={onDeleteSuccess}
          navigateBack={rs.fn()}
        />
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const deleteButton = screen.getByRole('button', { name: /delete vine/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockZero.mutate.vine.delete).toHaveBeenCalledWith({
          id: 'vine-1',
        });
      });
    });

    test('shows success message after deleting vine', async () => {
      const user = userEvent.setup();
      const onDeleteSuccess = rs.fn();

      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={onDeleteSuccess}
          navigateBack={rs.fn()}
        />
      );

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      const deleteButton = screen.getByRole('button', { name: /delete vine/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(onDeleteSuccess).toHaveBeenCalledWith(expect.stringContaining('deleted'));
      });
    });
  });

  describe('QR code generation', () => {
    test('user can view QR code', async () => {
      const user = userEvent.setup();

      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      const qrButton = screen.getByRole('button', { name: /generate tag/i });
      await user.click(qrButton);

      await waitFor(() => {
        expect(screen.getByRole('img', { name: /qr code/i })).toBeInTheDocument();
      });
    });

    test('user can close QR code modal', async () => {
      const user = userEvent.setup();

      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      const qrButton = screen.getByRole('button', { name: /generate tag/i });
      await user.click(qrButton);

      await waitFor(() => {
        expect(screen.getByRole('img', { name: /qr code/i })).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('img', { name: /qr code/i })).not.toBeInTheDocument();
    });

    test('user can download QR code as SVG', async () => {
      const user = userEvent.setup();

      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      const mockLink = {
        click: rs.fn(),
        href: '',
        download: '',
      };
      document.createElement = rs.fn((tag: string) => {
        if (tag === 'a') return mockLink as any;
        return originalCreateElement(tag);
      });

      const qrButton = screen.getByRole('button', { name: /generate tag/i });
      await user.click(qrButton);

      const downloadButton = screen.getByRole('button', { name: /download svg/i });
      await user.click(downloadButton);

      expect(mockLink.click).toHaveBeenCalled();
    });

    test('user can download 3D printable tag', async () => {
      const user = userEvent.setup();

      render(
        <VineDetailsView
          vine={mockVine}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      const mockLink = {
        click: rs.fn(),
        href: '',
        download: '',
      };
      document.createElement = rs.fn((tag: string) => {
        if (tag === 'a') return mockLink as any;
        return originalCreateElement(tag);
      });
      document.body.appendChild = rs.fn(() => mockLink as any);
      document.body.removeChild = rs.fn(() => mockLink as any);

      const qrButton = screen.getByRole('button', { name: /generate tag/i });
      await user.click(qrButton);

      const download3DButton = screen.getByRole('button', { name: /download 3d file/i });
      await user.click(download3DButton);

      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('when vine is null', () => {
    test('shows error message to user', () => {
      render(
        <VineDetailsView
          vine={null}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={rs.fn()}
        />
      );

      expect(screen.getByText(/vine not found/i)).toBeInTheDocument();
    });

    test('user can navigate back from error state', async () => {
      const user = userEvent.setup();
      const navigateBack = rs.fn();

      render(
        <VineDetailsView
          vine={null}
          onUpdateSuccess={rs.fn()}
          onDeleteSuccess={rs.fn()}
          navigateBack={navigateBack}
        />
      );

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      expect(navigateBack).toHaveBeenCalled();
    });
  });
});
