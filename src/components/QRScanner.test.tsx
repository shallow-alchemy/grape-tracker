import { test, describe, expect, rs, beforeEach, afterEach } from '@rstest/core';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QRScanner } from './QRScanner';

let scanCallback: any = null;

const mockQrScanner = {
  start: rs.fn().mockResolvedValue(undefined),
  stop: rs.fn(),
  destroy: rs.fn(),
};

rs.mock('qr-scanner', () => ({
  default: function(_videoEl: any, callback: any, _options: any) {
    scanCallback = callback;
    return mockQrScanner;
  },
}));

const mockSetLocation = rs.fn();

rs.mock('wouter', () => ({
  useLocation: () => ['/vineyard', mockSetLocation],
}));

describe('QRScanner', () => {
  beforeEach(() => {
    rs.clearAllMocks();
    scanCallback = null;
  });

  afterEach(() => {
    cleanup();
  });

  describe('when scanner opens', () => {
    test('displays scanner interface to user', () => {
      render(<QRScanner onClose={rs.fn()} />);

      expect(screen.getByText(/scan qr code/i)).toBeInTheDocument();
    });

    test('initializes camera scanner', async () => {
      render(<QRScanner onClose={rs.fn()} />);

      await waitFor(() => {
        expect(mockQrScanner.start).toHaveBeenCalled();
      });
    });

    test('user can see close button', () => {
      render(<QRScanner onClose={rs.fn()} />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  describe('closing scanner', () => {
    test('user can close scanner with button', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      render(<QRScanner onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    test('cleans up scanner on close', () => {
      const onClose = rs.fn();
      const { unmount } = render(<QRScanner onClose={onClose} />);

      unmount();

      expect(mockQrScanner.stop).toHaveBeenCalled();
      expect(mockQrScanner.destroy).toHaveBeenCalled();
    });
  });

  describe('scanning QR codes', () => {
    test('navigates to vine when QR code is scanned', async () => {
      const onClose = rs.fn();

      render(<QRScanner onClose={onClose} />);

      const scannedUrl = 'https://example.com/vineyard/vine/vine-123';
      scanCallback({ data: scannedUrl });

      await waitFor(() => {
        expect(mockSetLocation).toHaveBeenCalledWith('/vineyard/vine/vine-123');
        expect(onClose).toHaveBeenCalled();
      });
    });

    test('navigates to vine when vine ID is scanned', async () => {
      const onClose = rs.fn();

      render(<QRScanner onClose={onClose} />);

      scanCallback({ data: 'vine-456' });

      await waitFor(() => {
        expect(mockSetLocation).toHaveBeenCalledWith('/vineyard/vine/vine-456');
        expect(onClose).toHaveBeenCalled();
      });
    });

    test('automatically closes scanner after successful scan', async () => {
      const onClose = rs.fn();

      render(<QRScanner onClose={onClose} />);

      scanCallback({ data: 'vine-789' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('camera permissions', () => {
    test('shows error message when camera access is denied', async () => {
      mockQrScanner.start.mockRejectedValueOnce({ name: 'NotAllowedError', message: 'Permission denied' });

      render(<QRScanner onClose={rs.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/camera permission/i)).toBeInTheDocument();
      });
    });

    test('user can still close scanner after permission error', async () => {
      const user = userEvent.setup();
      const onClose = rs.fn();

      mockQrScanner.start.mockRejectedValueOnce({ name: 'NotAllowedError', message: 'Permission denied' });

      render(<QRScanner onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/camera permission/i)).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('scanner configuration', () => {
    test.todo('uses back camera on mobile devices', () => {
      render(<QRScanner onClose={rs.fn()} />);
    });

    test.todo('scans at 10 FPS for performance', () => {
      render(<QRScanner onClose={rs.fn()} />);
    });
  });
});
