import { SignIn, useUser, useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery } from '@rocicorp/zero/react';
import { myUser } from '../../shared/queries';
import styles from './SignInPage.module.css';

// Authenticated version - uses Zero queries (requires ZeroProvider)
export const SignInPageAuthenticated = () => {
  const { user } = useUser();
  const { signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasWaited, setHasWaited] = useState(false);
  const [userData] = useQuery(myUser(user!.id) as any) as any;

  // Give Zero time to sync before deciding user doesn't exist
  useEffect(() => {
    const timer = setTimeout(() => setHasWaited(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const userRecord = userData?.[0];

    if (userRecord) {
      // User found - check onboarding status
      if (!userRecord.onboarding_completed) {
        setLocation('/sign-up');
      } else {
        setLocation('/');
      }
    } else if (hasWaited && userData !== undefined) {
      // Waited long enough and still no user - they don't have an account
      setError('No account found. Please sign up first.');
      setChecking(false);
      signOut();
    }
  }, [userData, hasWaited, signOut, setLocation]);

  if (checking && !error) {
    return <div className={styles.loading}>Verifying account...</div>;
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.appTitle}>GILBERT</div>
          <div className={styles.errorBox}>
            <div className={styles.errorMessage}>{error}</div>
            <Link href="/sign-up">
              <button className={styles.signUpLink}>CREATE ACCOUNT</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <div className={styles.loading}>Redirecting...</div>;
};

// Unauthenticated version - just shows Clerk sign-in form (no Zero needed)
export const SignInPage = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.appTitle}>GILBERT</div>
        <SignIn
          routing="hash"
          fallbackRedirectUrl="/sign-in"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
};
