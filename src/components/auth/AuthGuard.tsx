import { ReactNode, useEffect, useState, useRef } from 'react';
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
  // Track if we've ever verified - once verified, stay verified
  const hasVerifiedRef = useRef(false);
  const [hasWaited, setHasWaited] = useState(false);

  // Give Zero time to sync before making decisions
  useEffect(() => {
    const timer = setTimeout(() => setHasWaited(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Once verified, stay verified
    if (hasVerifiedRef.current) return;

    const userRecord = userData?.[0];

    if (userRecord?.onboarding_completed) {
      // User found with completed onboarding - verify immediately
      hasVerifiedRef.current = true;
      setIsVerified(true);
    } else if (hasWaited && isLoaded && user) {
      // Waited for Zero to sync and still no valid user - redirect
      setLocation('/sign-up');
    }
  }, [isLoaded, user, userData, hasWaited, setLocation]);

  // Already verified - render children immediately
  if (hasVerifiedRef.current || isVerified) {
    return <>{children}</>;
  }

  return (
    <div className={styles.loading}>
      <div className={styles.loadingText}>LOADING...</div>
    </div>
  );
};
