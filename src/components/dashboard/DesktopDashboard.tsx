import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { useLocation, Link } from 'wouter';
import { myTasks, myVintages, myMeasurements, mySupplyInstances, supplyTemplates as supplyTemplatesQuery } from '../../shared/queries';
import { formatDueDate } from '../winery/taskHelpers';
import { formatStage } from '../winery/stages';
import { useZero } from '../../contexts/ZeroContext';
import { ActionLink } from '../ActionLink';
import styles from '../../App.module.css';

// Module-level caches - persist across component unmount/remount to prevent flash on navigation
// See docs/engineering-principles.md "Zero Query Loading States" for pattern documentation
let cachedVintagesData: any[] | null = null;
let cachedMeasurementsData: any[] | null = null;
let cachedTasksData: any[] | null = null;
let cachedSupplyTemplatesData: any[] | null = null;
let cachedSupplyInstancesData: any[] | null = null;

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
  const zero = useZero();
  const [tasksData] = useQuery(myTasks(user?.id) as any) as any;
  const [supplyTemplatesData] = useQuery(supplyTemplatesQuery(user?.id) as any) as any;
  const [supplyInstancesData] = useQuery(mySupplyInstances(user?.id) as any) as any;
  const [pendingSupplies, setPendingSupplies] = useState<Set<string>>(new Set());
  const [removedSupplies, setRemovedSupplies] = useState<Set<string>>(new Set());
  const sharedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSuppliesRef = useRef<Set<string>>(new Set());

  // Update module-level caches
  if (tasksData && tasksData.length > 0) {
    cachedTasksData = tasksData;
  }
  if (supplyTemplatesData && supplyTemplatesData.length > 0) {
    cachedSupplyTemplatesData = supplyTemplatesData;
  }
  if (supplyInstancesData && supplyInstancesData.length > 0) {
    cachedSupplyInstancesData = supplyInstancesData;
  }

  const effectiveTasksData = tasksData && tasksData.length > 0 ? tasksData : cachedTasksData || [];
  const effectiveSupplyTemplates = supplyTemplatesData && supplyTemplatesData.length > 0 ? supplyTemplatesData : cachedSupplyTemplatesData || [];
  const effectiveSupplyInstances = supplyInstancesData && supplyInstancesData.length > 0 ? supplyInstancesData : cachedSupplyInstancesData || [];

  // Build lookup maps
  const taskMap = new Map<string, any>();
  for (const task of effectiveTasksData) {
    taskMap.set(task.id, task);
  }

  const templateMap = new Map<string, any>();
  for (const template of effectiveSupplyTemplates) {
    templateMap.set(template.id, template);
  }

  // Get supply instances for upcoming tasks (not completed, not skipped, not verified)
  const suppliesNeeded = effectiveSupplyInstances
    .map((instance: any) => {
      const task = taskMap.get(instance.task_id);
      const template = templateMap.get(instance.supply_template_id);
      if (!task || !template) return null;
      if (task.completed_at || task.skipped) return null;
      if (removedSupplies.has(instance.id)) return null;
      return { instance, task, template };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => {
      // Sort: unverified first, then by due date
      if (a.instance.verified_at && !b.instance.verified_at) return 1;
      if (!a.instance.verified_at && b.instance.verified_at) return -1;
      return a.task.due_date - b.task.due_date;
    })
    .slice(0, 6);

  const resetSharedTimeout = useCallback(() => {
    if (sharedTimeoutRef.current) {
      clearTimeout(sharedTimeoutRef.current);
    }
    sharedTimeoutRef.current = setTimeout(async () => {
      const suppliesToVerify = Array.from(pendingSuppliesRef.current);
      if (suppliesToVerify.length === 0) return;

      const now = Date.now();
      for (const instanceId of suppliesToVerify) {
        await zero.mutate.supply_instance.update({
          id: instanceId,
          verified_at: now,
          verified_by: user?.id,
          updated_at: now,
        });
      }
      setRemovedSupplies(prev => {
        const next = new Set(prev);
        suppliesToVerify.forEach(id => next.add(id));
        return next;
      });
      setPendingSupplies(new Set());
      pendingSuppliesRef.current = new Set();
    }, 2000);
  }, [zero, user?.id]);

  const startSupplyVerification = useCallback((e: React.MouseEvent, instance: any) => {
    e.stopPropagation();
    setPendingSupplies(prev => {
      const next = new Set(prev).add(instance.id);
      pendingSuppliesRef.current = next;
      return next;
    });
    resetSharedTimeout();
  }, [resetSharedTimeout]);

  const undoSupplyVerification = useCallback((e: React.MouseEvent, instanceId: string) => {
    e.stopPropagation();
    setPendingSupplies(prev => {
      const next = new Set(prev);
      next.delete(instanceId);
      pendingSuppliesRef.current = next;
      return next;
    });
    resetSharedTimeout();
  }, [resetSharedTimeout]);

  return (
    <div className={styles.desktopPanel}>
      <div className={styles.panelTitleRow}>
        <h2 className={styles.panelTitle}>SUPPLIES NEEDED</h2>
        <Link href="/supplies" className={styles.panelLink}>VIEW ALL</Link>
      </div>
      <div className={styles.taskList}>
        {suppliesNeeded.length > 0 ? (
          suppliesNeeded.map(({ instance, task, template }: any) => {
            const isPending = pendingSupplies.has(instance.id);
            return (
              <div key={instance.id} className={`${styles.taskItem} ${isPending ? styles.taskItemPending : ''}`}>
                <span className={`${styles.taskText} ${isPending ? styles.taskTextPending : ''}`}>
                  {template.name.toUpperCase()}
                </span>
                <span className={styles.taskActions}>
                  {!isPending && (
                    <span className={styles.taskDate}>{formatDueDate(task.due_date, 'Needed')}</span>
                  )}
                  {isPending ? (
                    <ActionLink onClick={(e) => undoSupplyVerification(e, instance.id)}>
                      Undo
                    </ActionLink>
                  ) : (
                    <ActionLink onClick={(e) => startSupplyVerification(e, instance)}>
                      →
                    </ActionLink>
                  )}
                </span>
              </div>
            );
          })
        ) : (
          <div className={styles.taskItem}>
            <span className={styles.taskText}>NO SUPPLIES NEEDED</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const TaskListPanel = () => {
  const { user } = useUser();
  const zero = useZero();
  const [tasksData] = useQuery(myTasks(user?.id) as any) as any;
  const [pendingTasks, setPendingTasks] = useState<Set<string>>(new Set());
  const [removedTasks, setRemovedTasks] = useState<Set<string>>(new Set());
  const sharedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTasksRef = useRef<Set<string>>(new Set());

  // Update module-level cache when we have real data
  if (tasksData && tasksData.length > 0) {
    cachedTasksData = tasksData;
  }

  // Use cached data if Zero is still syncing but we have previous data
  const effectiveTasksData = tasksData && tasksData.length > 0 ? tasksData : cachedTasksData || [];

  const upcomingTasks = effectiveTasksData
    .filter((t: any) => !t.completed_at && !t.skipped && !removedTasks.has(t.id))
    .sort((a: any, b: any) => a.due_date - b.due_date)
    .slice(0, 4);

  const resetSharedTimeout = useCallback(() => {
    if (sharedTimeoutRef.current) {
      clearTimeout(sharedTimeoutRef.current);
    }
    sharedTimeoutRef.current = setTimeout(async () => {
      const tasksToComplete = Array.from(pendingTasksRef.current);
      if (tasksToComplete.length === 0) return;

      const now = Date.now();
      for (const taskId of tasksToComplete) {
        await zero.mutate.task.update({
          id: taskId,
          completed_at: now,
          completed_by: user?.id || '',
          updated_at: now,
        });
      }
      setRemovedTasks(prev => {
        const next = new Set(prev);
        tasksToComplete.forEach(id => next.add(id));
        return next;
      });
      setPendingTasks(new Set());
      pendingTasksRef.current = new Set();
    }, 2000);
  }, [zero, user?.id]);

  const startTaskCompletion = useCallback((e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    setPendingTasks(prev => {
      const next = new Set(prev).add(task.id);
      pendingTasksRef.current = next;
      return next;
    });
    resetSharedTimeout();
  }, [resetSharedTimeout]);

  const undoTaskCompletion = useCallback((e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setPendingTasks(prev => {
      const next = new Set(prev);
      next.delete(taskId);
      pendingTasksRef.current = next;
      return next;
    });
    resetSharedTimeout();
  }, [resetSharedTimeout]);

  return (
    <div className={styles.desktopPanel}>
      <div className={styles.panelTitleRow}>
        <h2 className={styles.panelTitle}>TASK LIST</h2>
        <Link href="/tasks" className={styles.panelLink}>VIEW ALL</Link>
      </div>
      <div className={styles.taskList}>
        {upcomingTasks.length > 0 ? (
          upcomingTasks.map((task: any) => {
            const isPending = pendingTasks.has(task.id);
            return (
              <div key={task.id} className={`${styles.taskItem} ${isPending ? styles.taskItemPending : ''}`}>
                <span className={`${styles.taskText} ${isPending ? styles.taskTextPending : ''}`}>
                  {task.name.toUpperCase()}
                </span>
                <span className={styles.taskActions}>
                  {!isPending && (
                    <span className={styles.taskDate}>{formatDueDate(task.due_date)}</span>
                  )}
                  {isPending ? (
                    <ActionLink onClick={(e) => undoTaskCompletion(e, task.id)}>
                      Undo
                    </ActionLink>
                  ) : (
                    <ActionLink onClick={(e) => startTaskCompletion(e, task)}>
                      →
                    </ActionLink>
                  )}
                </span>
              </div>
            );
          })
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
