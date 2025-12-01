import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { useLocation, Link } from 'wouter';
import { myTasks, myVintages, myMeasurements, supplyTemplates as supplyTemplatesQuery } from '../../shared/queries';
import { formatDueDate } from '../winery/taskHelpers';
import { formatStage } from '../winery/stages';
import styles from '../../App.module.css';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Module-level caches - persist across component unmount/remount to prevent flash on navigation
// See docs/engineering-principles.md "Zero Query Loading States" for pattern documentation
let cachedVintagesData: any[] | null = null;
let cachedMeasurementsData: any[] | null = null;
let cachedTasksData: any[] | null = null;
let cachedSupplyTemplatesData: any[] | null = null;

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
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [vintagesData] = useQuery(myVintages(user?.id) as any) as any;
  const [measurementsData] = useQuery(myMeasurements(user?.id) as any) as any;

  // Update module-level cache when we have real data
  if (vintagesData && vintagesData.length > 0) {
    cachedVintagesData = vintagesData;
  }
  if (measurementsData && measurementsData.length > 0) {
    cachedMeasurementsData = measurementsData;
  }

  // Use cached data if Zero is still syncing but we have previous data
  const effectiveVintagesData = vintagesData && vintagesData.length > 0 ? vintagesData : cachedVintagesData || [];
  const effectiveMeasurementsData = measurementsData && measurementsData.length > 0 ? measurementsData : cachedMeasurementsData || [];

  const currentYear = new Date().getFullYear();
  const currentYearVintages = effectiveVintagesData
    .filter((v: any) => v.vintage_year === currentYear)
    .sort((a: any, b: any) => (b.harvest_date || 0) - (a.harvest_date || 0));

  const latestVintage = currentYearVintages.length > 0
    ? currentYearVintages[0]
    : effectiveVintagesData.sort((a: any, b: any) => b.vintage_year - a.vintage_year)[0];

  const getHarvestMeasurement = (vintageId: string) => {
    return effectiveMeasurementsData.find(
      (m: any) => m.entity_type === 'vintage' && m.entity_id === vintageId && m.stage === 'harvest'
    );
  };

  if (!latestVintage) {
    return (
      <div className={styles.desktopPanel}>
        <div className={styles.panelTitleRow}>
          <h2 className={styles.panelTitle}>CURRENT VINTAGE</h2>
          <Link href="/winery/vintages" className={styles.panelLink}>VIEW ALL VINTAGES</Link>
        </div>
        <div className={styles.emptyPanelText}>No vintages yet. Add your first harvest to get started.</div>
      </div>
    );
  }

  if (currentYearVintages.length > 1) {
    return (
      <div className={styles.desktopPanel}>
        <div className={styles.panelTitleRow}>
          <h2 className={styles.panelTitle}>{currentYear} VINTAGES</h2>
          <Link href="/winery/vintages" className={styles.panelLink}>VIEW ALL</Link>
        </div>
        <div className={styles.vintageList}>
          {currentYearVintages.map((vintage: any) => {
            const measurement = getHarvestMeasurement(vintage.id);
            return (
              <div
                key={vintage.id}
                className={styles.vintageListItem}
                onClick={() => setLocation(`/winery/vintages/${vintage.id}`)}
              >
                <div className={styles.vintageListName}>{vintage.variety}</div>
                <div className={styles.vintageListMeta}>
                  <span>{formatStage(vintage.current_stage)}</span>
                  {measurement?.brix && <span>{measurement.brix}° BRIX</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const measurement = getHarvestMeasurement(latestVintage.id);

  return (
    <div className={styles.desktopPanel}>
      <div className={styles.panelTitleRow}>
        <h2 className={styles.panelTitle}>CURRENT VINTAGE</h2>
        <Link href="/winery/vintages" className={styles.panelLink}>VIEW ALL VINTAGES</Link>
      </div>
      <div
        className={`${styles.vintageName} ${styles.clickableActivityText}`}
        onClick={() => setLocation(`/winery/vintages/${latestVintage.id}`)}
      >
        {latestVintage.vintage_year} {latestVintage.variety}
      </div>
      <div className={styles.vintageStageLabel}>{formatStage(latestVintage.current_stage)}</div>
      {(measurement?.brix || measurement?.ta || measurement?.ph || latestVintage.harvest_weight_lbs) && (
        <div className={styles.vintageMetrics}>
          {measurement?.brix && (
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>BRIX</span>
              <span className={styles.metricValue}>{measurement.brix}°</span>
            </div>
          )}
          {measurement?.ph && (
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>PH</span>
              <span className={styles.metricValue}>{measurement.ph}</span>
            </div>
          )}
          {measurement?.ta && (
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>TA</span>
              <span className={styles.metricValue}>{measurement.ta} g/L</span>
            </div>
          )}
          {latestVintage.harvest_weight_lbs && (
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>WEIGHT</span>
              <span className={styles.metricValue}>{latestVintage.harvest_weight_lbs} LBS</span>
            </div>
          )}
        </div>
      )}
      {latestVintage.notes && (
        <div className={styles.tastingNote}>
          <div className={styles.tastingHeader}>NOTES</div>
          <div className={styles.tastingText}>{latestVintage.notes}</div>
        </div>
      )}
    </div>
  );
};

export const SuppliesNeeded = () => {
  const { user } = useUser();
  const [tasksData] = useQuery(myTasks(user?.id) as any) as any;
  const [supplyTemplatesData] = useQuery(supplyTemplatesQuery(user?.id) as any) as any;

  // Update module-level caches
  if (tasksData && tasksData.length > 0) {
    cachedTasksData = tasksData;
  }
  if (supplyTemplatesData && supplyTemplatesData.length > 0) {
    cachedSupplyTemplatesData = supplyTemplatesData;
  }

  const effectiveTasksData = tasksData && tasksData.length > 0 ? tasksData : cachedTasksData || [];
  const effectiveSupplyData = supplyTemplatesData && supplyTemplatesData.length > 0 ? supplyTemplatesData : cachedSupplyTemplatesData || [];

  // Get upcoming tasks (not completed, not skipped)
  const upcomingTasks = effectiveTasksData
    .filter((t: any) => !t.completed_at && !t.skipped)
    .sort((a: any, b: any) => a.due_date - b.due_date);

  // Build a map of task_template_id -> tasks
  const tasksByTemplateId = new Map<string, any[]>();
  for (const task of upcomingTasks) {
    const existing = tasksByTemplateId.get(task.task_template_id) || [];
    existing.push(task);
    tasksByTemplateId.set(task.task_template_id, existing);
  }

  // Find supplies that are due based on lead_time_days
  const now = Date.now();
  const suppliesNeeded: { supply: any; task: any }[] = [];

  for (const supply of effectiveSupplyData) {
    const tasksForTemplate = tasksByTemplateId.get(supply.task_template_id) || [];
    for (const task of tasksForTemplate) {
      const leadTimeMs = (supply.lead_time_days || 7) * MS_PER_DAY;
      const surfaceDate = task.due_date - leadTimeMs;
      if (surfaceDate <= now) {
        suppliesNeeded.push({ supply, task });
      }
    }
  }

  // Sort by task due date and limit to 6 items
  const sortedSupplies = suppliesNeeded
    .sort((a, b) => a.task.due_date - b.task.due_date)
    .slice(0, 6);

  return (
    <div className={styles.desktopPanel}>
      <div className={styles.panelTitleRow}>
        <h2 className={styles.panelTitle}>SUPPLIES NEEDED</h2>
        <Link href="/settings" className={styles.panelLink}>MANAGE</Link>
      </div>
      <div className={styles.suppliesList}>
        {sortedSupplies.length > 0 ? (
          sortedSupplies.map(({ supply, task }) => (
            <div key={`${supply.id}-${task.id}`} className={styles.supplyItem}>
              <span className={styles.supplyName}>{supply.name.toUpperCase()}</span>
              <span className={styles.supplyReason}>
                {task.name.toUpperCase()} - {formatDueDate(task.due_date)}
              </span>
            </div>
          ))
        ) : (
          <div className={styles.supplyItem}>
            <span className={styles.supplyName}>NO SUPPLIES NEEDED</span>
            <span className={styles.supplyReason}>ALL STOCKED UP</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const TaskListPanel = () => {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [tasksData] = useQuery(myTasks(user?.id) as any) as any;

  // Update module-level cache when we have real data
  if (tasksData && tasksData.length > 0) {
    cachedTasksData = tasksData;
  }

  // Use cached data if Zero is still syncing but we have previous data
  const effectiveTasksData = tasksData && tasksData.length > 0 ? tasksData : cachedTasksData || [];

  const upcomingTasks = effectiveTasksData
    .filter((t: any) => !t.completed_at && !t.skipped)
    .sort((a: any, b: any) => a.due_date - b.due_date)
    .slice(0, 4);

  return (
    <div className={styles.desktopPanel}>
      <div className={styles.panelTitleRow}>
        <h2 className={styles.panelTitle}>TASK LIST</h2>
        <Link href="/tasks" className={styles.panelLink}>VIEW ALL</Link>
      </div>
      <div className={styles.taskList}>
        {upcomingTasks.length > 0 ? (
          upcomingTasks.map((task: any) => (
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
        <TaskListPanel />
        <SuppliesNeeded />
      </div>
    </div>
  );
};
