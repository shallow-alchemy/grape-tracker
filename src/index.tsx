import React, { useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, useUser } from '@clerk/clerk-react';
import { Router, Route, Switch } from 'wouter';
import { ZeroProvider } from './contexts/ZeroContext';
import { App } from './App';
import { LandingPage } from './components/auth/LandingPage';
import { SignUpPage, SignUpPageAuthenticated } from './components/auth/SignUpPage';
import { SignInPage, SignInPageAuthenticated } from './components/auth/SignInPage';
import './index.css';

const publishableKey = process.env.PUBLIC_CLERK_PUBLISHABLE_KEY!;

// Wrapper that provides Zero context only when user is authenticated
const AuthenticatedApp = () => {
  const { user, isLoaded } = useUser();
  // Track if we've ever seen a user to prevent flashing during token refresh
  const hasSeenUser = useRef(false);

  // Show loading while Clerk initializes
  if (!isLoaded) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  // Remember if we've ever authenticated
  if (user) {
    hasSeenUser.current = true;
  }

  // No user and never had one - show public routes only
  if (!user && !hasSeenUser.current) {
    return (
      <Router>
        <Switch>
          <Route path="/sign-up">{() => <SignUpPage />}</Route>
          <Route path="/sign-in">{() => <SignInPage />}</Route>
          <Route>{() => <LandingPage />}</Route>
        </Switch>
      </Router>
    );
  }

  // User authenticated (or was authenticated) - keep ZeroProvider mounted
  // This prevents remounting during brief token refresh cycles
  return (
    <ZeroProvider>
      <Router>
        <Switch>
          <Route path="/sign-up">{() => <SignUpPageAuthenticated />}</Route>
          <Route path="/sign-in">{() => <SignInPageAuthenticated />}</Route>
          <Route>{() => <App />}</Route>
        </Switch>
      </Router>
    </ZeroProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={publishableKey}
      signUpFallbackRedirectUrl="/sign-up"
      signInFallbackRedirectUrl="/"
    >
      <AuthenticatedApp />
    </ClerkProvider>
  </React.StrictMode>
);
