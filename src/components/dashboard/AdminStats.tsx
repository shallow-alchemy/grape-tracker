import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@rocicorp/zero/react';
import { activeWines } from '../../shared/queries';
import styles from '../../App.module.css';

export const AdminStats = () => {
  const { user } = useUser();

  // Pass user ID as context (like ztunes pattern)
  // Client passes userID for optimistic rendering, server provides authenticated value
  const [wines] = useQuery(activeWines(user?.id));

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
