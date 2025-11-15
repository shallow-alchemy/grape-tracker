import { type ReactNode } from 'react';
import { rs } from '@rstest/core';
import type { Zero } from '@rocicorp/zero';
import type { Schema } from '../schema';

// Mock Zero instance
export const createMockZero = (): Zero<Schema> => {
  const mockQuery = {
    vineyard: {
      run: rs.fn().mockResolvedValue([]),
      where: rs.fn().mockReturnThis(),
      one: rs.fn().mockResolvedValue(null),
    },
    block: {
      run: rs.fn().mockResolvedValue([]),
      where: rs.fn().mockReturnThis(),
      one: rs.fn().mockResolvedValue(null),
    },
    vine: {
      run: rs.fn().mockResolvedValue([]),
      where: rs.fn().mockReturnThis(),
      one: rs.fn().mockResolvedValue(null),
    },
    vintage: {
      run: rs.fn().mockResolvedValue([]),
      where: rs.fn().mockReturnThis(),
      one: rs.fn().mockResolvedValue(null),
    },
    wine: {
      run: rs.fn().mockResolvedValue([]),
      where: rs.fn().mockReturnThis(),
      one: rs.fn().mockResolvedValue(null),
    },
    stage_history: {
      run: rs.fn().mockResolvedValue([]),
      where: rs.fn().mockReturnThis(),
      one: rs.fn().mockResolvedValue(null),
    },
    task: {
      run: rs.fn().mockResolvedValue([]),
      where: rs.fn().mockReturnThis(),
      one: rs.fn().mockResolvedValue(null),
    },
    task_template: {
      run: rs.fn().mockResolvedValue([]),
      where: rs.fn().mockReturnThis(),
      one: rs.fn().mockResolvedValue(null),
    },
    measurement: {
      run: rs.fn().mockResolvedValue([]),
      where: rs.fn().mockReturnThis(),
      one: rs.fn().mockResolvedValue(null),
    },
    measurement_range: {
      run: rs.fn().mockResolvedValue([]),
      where: rs.fn().mockReturnThis(),
      one: rs.fn().mockResolvedValue(null),
    },
  };

  const mockMutate = {
    vineyard: {
      insert: rs.fn().mockResolvedValue(undefined),
      update: rs.fn().mockResolvedValue(undefined),
      delete: rs.fn().mockResolvedValue(undefined),
    },
    block: {
      insert: rs.fn().mockResolvedValue(undefined),
      update: rs.fn().mockResolvedValue(undefined),
      delete: rs.fn().mockResolvedValue(undefined),
    },
    vine: {
      insert: rs.fn().mockResolvedValue(undefined),
      update: rs.fn().mockResolvedValue(undefined),
      delete: rs.fn().mockResolvedValue(undefined),
    },
    vintage: {
      insert: rs.fn().mockResolvedValue(undefined),
      update: rs.fn().mockResolvedValue(undefined),
      delete: rs.fn().mockResolvedValue(undefined),
    },
    wine: {
      insert: rs.fn().mockResolvedValue(undefined),
      update: rs.fn().mockResolvedValue(undefined),
      delete: rs.fn().mockResolvedValue(undefined),
    },
    stage_history: {
      insert: rs.fn().mockResolvedValue(undefined),
      update: rs.fn().mockResolvedValue(undefined),
      delete: rs.fn().mockResolvedValue(undefined),
    },
    task: {
      insert: rs.fn().mockResolvedValue(undefined),
      update: rs.fn().mockResolvedValue(undefined),
      delete: rs.fn().mockResolvedValue(undefined),
    },
    task_template: {
      insert: rs.fn().mockResolvedValue(undefined),
      update: rs.fn().mockResolvedValue(undefined),
      delete: rs.fn().mockResolvedValue(undefined),
    },
    measurement: {
      insert: rs.fn().mockResolvedValue(undefined),
      update: rs.fn().mockResolvedValue(undefined),
      delete: rs.fn().mockResolvedValue(undefined),
    },
    measurement_range: {
      insert: rs.fn().mockResolvedValue(undefined),
      update: rs.fn().mockResolvedValue(undefined),
      delete: rs.fn().mockResolvedValue(undefined),
    },
  };

  return {
    query: mockQuery,
    mutate: mockMutate,
    close: rs.fn(),
  } as any;
};

// Mock ZeroContext provider for tests
export const MockZeroProvider = ({ children, zero }: { children: ReactNode; zero?: Zero<Schema> }) => {
  const mockZero = zero || createMockZero();

  // We need to import the actual context to use it
  const { ZeroContext } = require('./contexts/ZeroContext');

  return <ZeroContext.Provider value={mockZero}>{children}</ZeroContext.Provider>;
};

// Mock Clerk user
export const createMockUser = () => ({
  id: 'test-user-id',
  firstName: 'Test',
  lastName: 'User',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
});

// Mock ClerkProvider for tests
export const MockClerkProvider = ({ children }: { children: ReactNode }) => {
  const mockUser = createMockUser();

  return (
    <div data-testid="mock-clerk-provider">
      {children}
    </div>
  );
};

// Helper to render with all providers
export const renderWithProviders = (
  component: ReactNode,
  { zero }: { zero?: Zero<Schema> } = {}
) => {
  return (
    <MockClerkProvider>
      <MockZeroProvider zero={zero}>
        {component}
      </MockZeroProvider>
    </MockClerkProvider>
  );
};
