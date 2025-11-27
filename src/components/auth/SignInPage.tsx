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
  const [userData] = useQuery(myUser(user!.id) as any) as any;

  useEffect(() => {
    if (userData !== undefined) {
      const userRecord = userData?.[0];
      if (!userRecord) {
        // No user record exists - block access
        setError('No account found. Please sign up first.');
        setChecking(false);
        signOut();
      } else if (!userRecord.onboarding_completed) {
        // User exists but didn't complete onboarding - redirect to sign-up
        setLocation('/sign-up');
      } else {
        // Valid user - redirect to dashboard
        setLocation('/');
      }
    }
  }, [userData, signOut, setLocation]);

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
