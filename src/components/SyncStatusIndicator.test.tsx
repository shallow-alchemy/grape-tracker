import { test, describe, expect, rs, afterEach, beforeEach } from '@rstest/core';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SyncStatusIndicator } from './SyncStatusIndicator';

const mockZero = {
  query: {},
  mutate: {},
};

rs.mock('../contexts/ZeroContext', () => ({
  useZero: () => mockZero,
}));

describe('SyncStatusIndicator', () => {
  const originalNavigatorOnLine = navigator.onLine;

  beforeEach(() => {
    rs.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigatorOnLine,
      writable: true,
      configurable: true,
    });
  });

  describe('initial state', () => {
    test('renders sync status button', () => {
      render(<SyncStatusIndicator />);
      expect(screen.getByRole('button', { name: /sync status/i })).toBeInTheDocument();
    });

    test('shows connected status when online', () => {
      render(<SyncStatusIndicator />);
      expect(screen.getByText('Synced')).toBeInTheDocument();
    });

    test('shows connected icon when online', () => {
      render(<SyncStatusIndicator />);
      expect(screen.getByText('●')).toBeInTheDocument();
    });
  });

  describe('details popup', () => {
    test('opens details popup when button clicked', async () => {
      const user = userEvent.setup();
      render(<SyncStatusIndicator />);

      const button = screen.getByRole('button', { name: /sync status/i });
      await user.click(button);

      expect(screen.getByText('Sync Status')).toBeInTheDocument();
      expect(screen.getByText('Status:')).toBeInTheDocument();
    });

    test('closes details popup when close button clicked', async () => {
      const user = userEvent.setup();
      render(<SyncStatusIndicator />);

      const button = screen.getByRole('button', { name: /sync status/i });
      await user.click(button);

      expect(screen.getByText('Sync Status')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByText('Sync Status')).not.toBeInTheDocument();
    });

    test('toggles details popup on repeated clicks', async () => {
      const user = userEvent.setup();
      render(<SyncStatusIndicator />);

      const button = screen.getByRole('button', { name: /sync status/i });

      await user.click(button);
      expect(screen.getByText('Sync Status')).toBeInTheDocument();

      await user.click(button);
      expect(screen.queryByText('Sync Status')).not.toBeInTheDocument();
    });
  });

  describe('offline status', () => {
    test('shows offline status when navigator offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      render(<SyncStatusIndicator />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    test('shows offline icon when navigator offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      render(<SyncStatusIndicator />);
      expect(screen.getByText('○')).toBeInTheDocument();
    });

    test('shows offline warning in details popup', async () => {
      const user = userEvent.setup();
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      render(<SyncStatusIndicator />);

      const button = screen.getByRole('button', { name: /sync status/i });
      await user.click(button);

      expect(screen.getByText(/changes are saved locally/i)).toBeInTheDocument();
    });
  });

  describe('status color classes', () => {
    test('uses connected class for synced status', () => {
      render(<SyncStatusIndicator />);
      const button = screen.getByRole('button', { name: /sync status/i });
      expect(button.className).toContain('statusConnected');
    });
  });

  describe('status text mapping', () => {
    test('displays Synced for connected status', () => {
      render(<SyncStatusIndicator />);
      expect(screen.getByText('Synced')).toBeInTheDocument();
    });

    test('displays Offline for offline status', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      render(<SyncStatusIndicator />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  describe('status icon mapping', () => {
    test('displays filled circle for connected status', () => {
      render(<SyncStatusIndicator />);
      expect(screen.getByText('●')).toBeInTheDocument();
    });

    test('displays empty circle for offline status', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      render(<SyncStatusIndicator />);
      expect(screen.getByText('○')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    let originalConsoleError: typeof console.error;
    let mockConsoleError: ReturnType<typeof rs.fn>;
    let errorCallback: ((message: string) => void) | null = null;

    beforeEach(() => {
      originalConsoleError = console.error;
      // Create a mock that captures the error but doesn't print to console
      mockConsoleError = rs.fn().mockImplementation((message: string) => {
        // Trigger any error listeners the component may have set up
        if (errorCallback) {
          errorCallback(message);
        }
      });
      console.error = mockConsoleError;
    });

    afterEach(() => {
      console.error = originalConsoleError;
      errorCallback = null;
    });

    test('shows error state when console.error contains WebSocket message', async () => {
      const { unmount } = render(<SyncStatusIndicator />);

      console.error('WebSocket connection failed');

      await waitFor(() => {
        expect(screen.getByText('Sync Error')).toBeInTheDocument();
      });

      unmount();
    });

    test('shows error warning icon', async () => {
      const { unmount } = render(<SyncStatusIndicator />);

      console.error('Failed to connect to server');

      await waitFor(() => {
        expect(screen.getByText('⚠')).toBeInTheDocument();
      });

      unmount();
    });

    test('shows error details with retry button', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<SyncStatusIndicator />);

      console.error('Connect timed out');

      await waitFor(() => {
        expect(screen.getByText('Sync Error')).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /sync status/i });
      await user.click(button);

      expect(screen.getByText(/sync error detected/i)).toBeInTheDocument();
      expect(screen.getByText('Refresh to retry')).toBeInTheDocument();

      unmount();
    });
  });

  describe('syncing state', () => {
    test('shows syncing when going online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      render(<SyncStatusIndicator />);
      expect(screen.getByText('Offline')).toBeInTheDocument();

      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      window.dispatchEvent(new Event('online'));

      await waitFor(() => {
        expect(screen.getByText('Syncing...')).toBeInTheDocument();
      });
    });

    test('shows syncing icon', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      render(<SyncStatusIndicator />);

      window.dispatchEvent(new Event('online'));

      await waitFor(() => {
        expect(screen.getByText('◐')).toBeInTheDocument();
      });
    });
  });
});
