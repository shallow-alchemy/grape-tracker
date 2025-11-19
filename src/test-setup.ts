import { rs } from '@rstest/core';

// Global mock for Clerk - applies to all tests
rs.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-123',
      primaryEmailAddress: {
        emailAddress: 'test@example.com',
      },
    },
    isLoaded: true,
    isSignedIn: true,
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
