import { test, describe, expect, rs, afterEach } from '@rstest/core';
import { render, screen, cleanup } from '@testing-library/react';
import { ZeroProvider } from './ZeroContext';

let mockUserValue: any = { user: null };

rs.mock('@clerk/clerk-react', () => ({
  useUser: () => mockUserValue,
}));

rs.mock('@rocicorp/zero/react', () => ({
  ZeroProvider: ({ children, userID }: { children: React.ReactNode; userID: string }) => (
    <div data-testid="zero-provider" data-user-id={userID}>
      {children}
    </div>
  ),
  useZero: rs.fn(),
}));

rs.mock('../../schema', () => ({
  schema: {},
}));

describe('ZeroContext', () => {
  afterEach(() => {
    cleanup();
    mockUserValue = { user: null }; // Reset to default
  });

  describe('ZeroProvider', () => {
    test('renders loading state when user is not available', () => {
      mockUserValue = { user: null };

      render(
        <ZeroProvider>
          <div>Test Content</div>
        </ZeroProvider>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    test('renders ZeroProvider with user ID when user is available', () => {
      mockUserValue = {
        user: { id: 'user-123' }
      };

      render(
        <ZeroProvider>
          <div>Test Content</div>
        </ZeroProvider>
      );

      const provider = screen.getByTestId('zero-provider');
      expect(provider).toBeInTheDocument();
      expect(provider.getAttribute('data-user-id')).toBe('user-123');
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('renders children when user is available', () => {
      mockUserValue = {
        user: { id: 'user-456' }
      };

      render(
        <ZeroProvider>
          <div data-testid="child-element">Child Component</div>
        </ZeroProvider>
      );

      expect(screen.getByTestId('child-element')).toBeInTheDocument();
    });
  });
});
