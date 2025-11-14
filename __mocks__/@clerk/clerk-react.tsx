import type { ReactNode } from 'react';

export const useUser = () => ({
  user: {
    id: 'test-user-123',
    fullName: 'Test User',
    primaryEmailAddress: { emailAddress: 'test@example.com' },
  },
  isLoaded: true,
  isSignedIn: true,
});

export const SignedIn = ({ children }: { children: ReactNode }) => children;
export const SignedOut = () => null;
export const ClerkProvider = ({ children }: { children: ReactNode }) => children;
export const UserButton = () => null;
