import { useQuery } from '@rocicorp/zero/react';
import { useLocation, Link } from 'wouter';
import { useZero } from '../../contexts/ZeroContext';
import { formatDueDate } from '../winery/taskHelpers';
import styles from '../../App.module.css';

export const RecentActivity = () => {
  return (
    <div className={styles.desktopPanel}>
      <h2 className={styles.panelTitle}>RECENT ACTIVITY</h2>
      <div className={styles.activityList}>
        <div className={styles.activityItem}>
          <span className={styles.activityTime}>10:23 AM</span>
          <span className={styles.activityText}>VINE A-123 SCANNED</span>
        </div>
        <div className={styles.activityItem}>
          <span className={styles.activityTime}>09:45 AM</span>
          <span className={styles.activityText}>BATCH B-456 UPDATED</span>
        </div>
        <div className={styles.activityItem}>
          <span className={styles.activityTime}>08:12 AM</span>
          <span className={styles.activityText}>HARVEST LOG CREATED</span>
        </div>
      </div>
    </div>
  );
};

export const CurrentVintage = () => {
  return (
    <div className={styles.desktopPanel}>
      <div className={styles.panelTitleRow}>
        <h2 className={styles.panelTitle}>CURRENT VINTAGE</h2>
        <a href="#vintages" className={styles.panelLink}>VIEW ALL VINTAGES</a>
      </div>
      <div className={styles.vintageName}>2024 CABERNET SAUVIGNON</div>
      <div className={styles.vintageMetrics}>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>HARVEST BRIX</span>
          <span className={styles.metricValue}>24.5</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>TA</span>
          <span className={styles.metricValue}>6.2 g/L</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>PH</span>
          <span className={styles.metricValue}>3.65</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>OAK TIME</span>
          <span className={styles.metricValue}>8 MONTHS</span>
        </div>
      </div>
      <div className={styles.tastingNote}>
        <div className={styles.tastingHeader}>LATEST TASTING (NOV 1)</div>
        <div className={styles.tastingText}>DEVELOPING WELL. BERRY FORWARD WITH SOFT TANNINS. HINTS OF VANILLA FROM OAK.</div>
      </div>
    </div>
  );
};

export const SuppliesNeeded = () => {
  return (
    <div className={styles.desktopPanel}>
      <div className={styles.panelTitleRow}>
        <h2 className={styles.panelTitle}>SUPPLIES NEEDED</h2>
        <a href="#inventory" className={styles.panelLink}>VIEW INVENTORY</a>
      </div>
      <div className={styles.suppliesList}>
        <div className={styles.supplyItem}>
          <span className={styles.supplyName}>YEAST (RED STAR)</span>
          <span className={styles.supplyReason}>HARVEST - NOV 20</span>
        </div>
        <div className={styles.supplyItem}>
          <span className={styles.supplyName}>POTASSIUM METABISULFATE</span>
          <span className={styles.supplyReason}>HARVEST - NOV 20</span>
        </div>
        <div className={styles.supplyItem}>
          <span className={styles.supplyName}>CARBOYS (5 GAL)</span>
          <span className={styles.supplyReason}>SECONDARY FERMENT</span>
        </div>
        <div className={styles.supplyItem}>
          <span className={styles.supplyName}>SANITIZER</span>
          <span className={styles.supplyReason}>EQUIPMENT MAINT</span>
        </div>
      </div>
    </div>
  );
};

export const TaskManagement = () => {
  const zero = useZero();
  const [, setLocation] = useLocation();
  const [tasksData] = useQuery(zero.query.task);

  const upcomingTasks = tasksData
    .filter(t => !t.completed_at && !t.skipped)
    .sort((a, b) => a.due_date - b.due_date)
    .slice(0, 5);

  return (
    <div className={styles.desktopPanel}>
      <div className={styles.panelTitleRow}>
        <h2 className={styles.panelTitle}>TASK MANAGEMENT</h2>
        <Link href="/tasks" className={styles.panelLink}>VIEW ALL TASKS</Link>
      </div>
      <div className={styles.taskList}>
        {upcomingTasks.length > 0 ? (
          upcomingTasks.map((task) => (
            <div
              key={task.id}
              className={`${styles.taskItem} ${styles.clickableActivityText}`}
              onClick={() => {
                const route = task.entity_type === 'vintage'
                  ? `/winery/vintages/${task.entity_id}/tasks`
                  : `/winery/wines/${task.entity_id}/tasks`;
                setLocation(route);
              }}
            >
              <span className={styles.taskText}>{task.name.toUpperCase()}</span>
              <span className={styles.taskDate}>{formatDueDate(task.due_date)}</span>
            </div>
          ))
        ) : (
          <div className={styles.taskItem}>
            <span className={styles.taskText}>NO UPCOMING TASKS</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const DesktopDashboard = () => {
  return (
    <div className={styles.desktopDashboard}>
      <div className={styles.desktopRow}>
        <RecentActivity />
        <CurrentVintage />
      </div>
      <div className={styles.desktopRow}>
        <SuppliesNeeded />
        <TaskManagement />
      </div>
    </div>
  );
};
