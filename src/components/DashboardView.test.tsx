import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DashboardView, QRScanButton } from './DashboardView';

// Mock child components
rs.mock('./Weather', () => ({
  Weather: () => <div data-testid="weather-component">Weather</div>,
}));

rs.mock('./QRScanner', () => ({
  QRScanner: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="qr-scanner">
      <button onClick={onClose}>Close Scanner</button>
    </div>
  ),
}));

rs.mock('./dashboard/DesktopDashboard', () => ({
  DesktopDashboard: () => <div data-testid="desktop-dashboard">Desktop Dashboard</div>,
}));

describe('QRScanButton', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders button with icon and text', () => {
    const onClick = rs.fn();

    render(<QRScanButton onClick={onClick} />);

    expect(screen.getByText('SCAN QR CODE')).toBeInTheDocument();
    expect(screen.getByText('⊞')).toBeInTheDocument();
  });

  test('calls onClick when button pressed', async () => {
    const user = userEvent.setup();
    const onClick = rs.fn();

    render(<QRScanButton onClick={onClick} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('calls onClick when button pressed multiple times', async () => {
    const user = userEvent.setup();
    const onClick = rs.fn();

    render(<QRScanButton onClick={onClick} />);

    const button = screen.getByRole('button');
    await user.click(button);
    await user.click(button);
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(3);
  });
});

describe('DashboardView', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders Weather component', () => {
    render(<DashboardView />);

    expect(screen.getByTestId('weather-component')).toBeInTheDocument();
  });

  test('renders QRScanButton', () => {
    render(<DashboardView />);

    expect(screen.getByText('SCAN QR CODE')).toBeInTheDocument();
  });

  test('renders DesktopDashboard', () => {
    render(<DashboardView />);

    expect(screen.getByTestId('desktop-dashboard')).toBeInTheDocument();
  });

  test('does not show QRScanner initially', () => {
    render(<DashboardView />);

    expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument();
  });

  test('shows QRScanner when scan button clicked', async () => {
    const user = userEvent.setup();

    render(<DashboardView />);

    const scanButton = screen.getByRole('button', { name: /SCAN QR CODE/i });
    await user.click(scanButton);

    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
  });

  test('hides QRScanner when close is called', async () => {
    const user = userEvent.setup();

    render(<DashboardView />);

    // Open scanner
    const scanButton = screen.getByRole('button', { name: /SCAN QR CODE/i });
    await user.click(scanButton);

    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();

    // Close scanner
    const closeButton = screen.getByText('Close Scanner');
    await user.click(closeButton);

    expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument();
  });

  test('can toggle scanner multiple times', async () => {
    const user = userEvent.setup();

    render(<DashboardView />);

    const scanButton = screen.getByRole('button', { name: /SCAN QR CODE/i });

    // Open
    await user.click(scanButton);
    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();

    // Close
    const closeButton = screen.getByText('Close Scanner');
    await user.click(closeButton);
    expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument();

    // Open again
    await user.click(scanButton);
    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
  });
});
