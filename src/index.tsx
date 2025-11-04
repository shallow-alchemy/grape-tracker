import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { GiGrapes } from 'react-icons/gi';
import { App } from './App';
import './index.css';
import styles from './index.module.css';

const publishableKey = process.env.PUBLIC_CLERK_PUBLISHABLE_KEY!;

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <SignedIn>
        <App />
      </SignedIn>
      <SignedOut>
        <div className={styles.signInContainer}>
          <div className={styles.signInContent}>
            <div className={styles.appTitle}>GILBERT</div>
            <SignInButton mode="modal">
              <button className={styles.signInButton}>SIGN IN</button>
            </SignInButton>
            <GiGrapes className={styles.grapes} />
          </div>
        </div>
      </SignedOut>
    </ClerkProvider>
  </React.StrictMode>
);
