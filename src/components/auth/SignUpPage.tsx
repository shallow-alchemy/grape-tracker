import { useEffect } from 'react';
import { SignUp, useUser } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { useQuery } from '@rocicorp/zero/react';
import { myUser } from '../../shared/queries';
import { OnboardingModal } from './OnboardingModal';
import styles from './SignUpPage.module.css';

// Authenticated version - uses Zero queries (requires ZeroProvider)
export const SignUpPageAuthenticated = () => {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [userData] = useQuery(myUser(user!.id) as any) as any;

  const handleOnboardingComplete = () => {
    setLocation('/');
  };

  const userRecord = userData?.[0];

  // Redirect in useEffect to avoid "setState during render" error
  useEffect(() => {
    if (userRecord?.onboarding_completed) {
      setLocation('/');
    }
  }, [userRecord, setLocation]);

  if (userRecord?.onboarding_completed) {
    return <div className={styles.loading}>Redirecting...</div>;
  }

  // No user record or onboarding not completed - show onboarding modal
  return (
    <div className={styles.container}>
      <OnboardingModal isOpen={true} onComplete={handleOnboardingComplete} />
    </div>
  );
};

// Unauthenticated version - just shows Clerk sign-up form (no Zero needed)
export const SignUpPage = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.appTitle}>GILBERT</div>
        <SignUp
          routing="hash"
          forceRedirectUrl="/sign-up"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
};
