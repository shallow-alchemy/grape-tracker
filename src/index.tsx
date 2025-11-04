import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import App from './App';
import './index.css';

const publishableKey = process.env.PUBLIC_CLERK_PUBLISHABLE_KEY!;

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <SignedIn>
        <App />
      </SignedIn>
      <SignedOut>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <SignInButton mode="modal" />
        </div>
      </SignedOut>
    </ClerkProvider>
  </React.StrictMode>
);
