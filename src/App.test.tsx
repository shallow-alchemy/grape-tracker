import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { App } from './App';

// Mock all the dependencies
rs.mock('@clerk/clerk-react', () => ({
  UserButton: () => <div data-testid="user-button">User Button</div>,
}));

rs.mock('./contexts/ZeroContext', () => ({
  ZeroProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="zero-provider">{children}</div>
  ),
  useZero: () => ({
    query: {},
  }),
}));

rs.mock('./components/VineyardView', () => ({
  VineyardView: ({ initialVineId, initialBlockId }: { initialVineId?: string; initialBlockId?: string }) => (
    <div data-testid="vineyard-view">
      Vineyard View
      {initialVineId && <span data-testid="vine-id">{initialVineId}</span>}
      {initialBlockId && <span data-testid="block-id">{initialBlockId}</span>}
    </div>
  ),
}));

rs.mock('./components/winery/WineryView', () => ({
  WineryView: ({ initialVintageId, initialWineId }: { initialVintageId?: string; initialWineId?: string }) => (
    <div data-testid="winery-view">
      Winery View
      {initialVintageId && <span data-testid="vintage-id">{initialVintageId}</span>}
      {initialWineId && <span data-testid="wine-id">{initialWineId}</span>}
    </div>
  ),
}));

rs.mock('./components/DashboardView', () => ({
  DashboardView: () => <div data-testid="dashboard-view">Dashboard View</div>,
}));

rs.mock('./components/SyncStatusIndicator', () => ({
  SyncStatusIndicator: () => <div data-testid="sync-status">Synced</div>,
}));

rs.mock('./components/winery/AllTasksView', () => ({
  AllTasksView: () => <div data-testid="all-tasks-view">All Tasks View</div>,
}));

rs.mock('./components/auth/AuthGuard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-guard">{children}</div>
  ),
}));

describe('App', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders without crashing', () => {
    // Verify that the App component can be imported
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  test('renders App component', () => {
    render(<App />);

    expect(screen.getByTestId('zero-provider')).toBeInTheDocument();
  });

  test('renders header with app title', () => {
    render(<App />);

    expect(screen.getByText('GILBERT')).toBeInTheDocument();
  });

  test('renders navigation links', () => {
    render(<App />);

    expect(screen.getByText('VINEYARD')).toBeInTheDocument();
    expect(screen.getByText('WINERY')).toBeInTheDocument();
  });

  test('renders UserButton', () => {
    render(<App />);

    expect(screen.getByTestId('user-button')).toBeInTheDocument();
  });

  test('renders DashboardView on root path', () => {
    render(<App />);

    expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
  });

  test('app title links to home', () => {
    render(<App />);

    const titleLink = screen.getByText('GILBERT').closest('a');
    expect(titleLink).toHaveAttribute('href', '/');
  });

  test('vineyard nav link has correct href', () => {
    render(<App />);

    const vineyardLink = screen.getByText('VINEYARD').closest('a');
    expect(vineyardLink).toHaveAttribute('href', '/vineyard');
  });

  test('winery nav link has correct href', () => {
    render(<App />);

    const wineryLink = screen.getByText('WINERY').closest('a');
    expect(wineryLink).toHaveAttribute('href', '/winery/vintages');
  });

  test('wraps content in ZeroProvider', () => {
    render(<App />);

    const zeroProvider = screen.getByTestId('zero-provider');
    expect(zeroProvider).toBeInTheDocument();

    // Check that app content is inside ZeroProvider
    const appTitle = screen.getByText('GILBERT');
    expect(zeroProvider).toContainElement(appTitle);
  });

  test('renders header navigation structure', () => {
    render(<App />);

    // Check all header elements are present
    expect(screen.getByText('GILBERT')).toBeInTheDocument();
    expect(screen.getByText('VINEYARD')).toBeInTheDocument();
    expect(screen.getByText('WINERY')).toBeInTheDocument();
    expect(screen.getByTestId('user-button')).toBeInTheDocument();
  });
});
