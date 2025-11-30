import { rs } from '@rstest/core';

// Global mock for Clerk - applies to all tests
rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-123',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      imageUrl: null,
      primaryEmailAddress: {
        emailAddress: 'test@example.com',
      },
    },
    isLoaded: true,
    isSignedIn: true,
  }),
  useAuth: () => ({
    signOut: rs.fn(),
    getToken: async () => 'mock-token',
  }),
  useClerk: () => ({
    signOut: rs.fn(),
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignIn: () => null,
  SignedIn: ({ children }: { children: React.ReactNode }) => children,
  SignedOut: () => null,
  UserButton: () => null,
}));
