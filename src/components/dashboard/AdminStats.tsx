import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@rocicorp/zero/react';
import { activeWines } from '../../shared/queries';
import styles from '../../App.module.css';

// Admin user ID from Clerk - only this user sees the panel
const ADMIN_USER_ID = 'user_34zvb6YsnjkI4IFo9qDJyUXGQfK';

export const AdminStats = () => {
  const { user } = useUser();

  // Only render for admin user
  if (user?.id !== ADMIN_USER_ID) {
    return null;
  }

  // Use the synced query - this will be resolved by zero-cache -> queries-service
  // Client passes null for context; server provides real auth context
  const [wines] = useQuery(activeWines(null));

  return (
    <div className={styles.desktopPanel}>
      <h2 className={styles.panelTitle}>ADMIN STATS</h2>
      <div className={styles.activityList}>
        <div className={styles.activityItem}>
          <span className={styles.activityText}>ACTIVE WINES</span>
          <span className={styles.activityTime}>{wines.length}</span>
        </div>
      </div>
    </div>
  );
};
