import { ReactNode, useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@rocicorp/zero/react';
import { useLocation } from 'wouter';
import { myUser } from '../../shared/queries';
import styles from './AuthGuard.module.css';

type AuthGuardProps = {
  children: ReactNode;
};

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const [userData] = useQuery(myUser(user?.id) as any) as any;
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isLoaded && user && userData !== undefined) {
      const userRecord = userData?.[0];

      if (!userRecord || !userRecord.onboarding_completed) {
        // No valid user record - redirect to sign-up to complete onboarding
        setLocation('/sign-up');
      } else {
        // User has valid record - allow access
        setIsVerified(true);
        setIsChecking(false);
      }
    }
  }, [isLoaded, user, userData, setLocation]);

  if (!isLoaded || isChecking) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>LOADING...</div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>REDIRECTING...</div>
      </div>
    );
  }

  return <>{children}</>;
};
