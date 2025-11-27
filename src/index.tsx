import React from 'react';
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

  // Show loading while Clerk initializes
  if (!isLoaded) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  // No user - show public routes only
  if (!user) {
    return (
      <Router>
        <Switch>
          <Route path="/sign-up" component={SignUpPage} />
          <Route path="/sign-in" component={SignInPage} />
          <Route component={LandingPage} />
        </Switch>
      </Router>
    );
  }

  // User authenticated - wrap everything in a single ZeroProvider
  return (
    <ZeroProvider>
      <Router>
        <Switch>
          <Route path="/sign-up" component={SignUpPageAuthenticated} />
          <Route path="/sign-in" component={SignInPageAuthenticated} />
          <Route component={App} />
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
      afterSignUpUrl="/sign-up"
      afterSignInUrl="/"
    >
      <AuthenticatedApp />
    </ClerkProvider>
  </React.StrictMode>
);
