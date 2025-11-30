import type { ReactNode } from 'react';

export const useUser = () => ({
  user: {
    id: 'test-user-123',
    fullName: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    imageUrl: null,
    primaryEmailAddress: { emailAddress: 'test@example.com' },
  },
  isLoaded: true,
  isSignedIn: true,
});

export const useAuth = () => ({
  signOut: async () => {},
  getToken: async () => 'mock-token',
});

export const SignedIn = ({ children }: { children: ReactNode }) => children;
export const SignedOut = () => null;
export const ClerkProvider = ({ children }: { children: ReactNode }) => children;
export const UserButton = () => null;
