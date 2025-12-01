import { useState, useEffect } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { getBackendUrl } from '../../config';
import { useVineyard } from '../vineyard-hooks';
import { useZero } from '../../contexts/ZeroContext';
import { mySeasonalTasksByWeek } from '../../shared/queries';
import { useDebouncedCompletion } from '../../hooks/useDebouncedCompletion';
import { ActionLink } from '../ActionLink';
import styles from '../../App.module.css';

// Get Monday of the current week (timestamp in milliseconds)
const getWeekStart = (): number => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
};

// Module-level flag to prevent duplicate API calls across component instances
let fetchAttemptedForWeek: number | null = null;

type SeasonalTaskCardProps = {
  inline?: boolean;
  headerOnly?: boolean;
};

export const SeasonalTaskCard = ({ inline = false, headerOnly = false }: SeasonalTaskCardProps) => {
  const { user } = useUser();
  const vineyard = useVineyard();
  const zero = useZero();
  const weekStart = getWeekStart();

  const [tasksData] = useQuery(mySeasonalTasksByWeek(user?.id, weekStart) as any) as any;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { removedTaskId, startCompletion, undoCompletion, isPending } = useDebouncedCompletion(
    async (taskId) => {
      await zero.mutate.seasonal_task.update({
        id: taskId,
        completed_at: Date.now(),
        updated_at: Date.now(),
      });
    }
  );

  const containerClass = inline ? styles.seasonalTaskInline : styles.seasonalTaskCard;

  // Track if Zero has returned data (undefined = still syncing, [] = synced but empty)
  const zeroSynced = tasksData !== undefined;
  const tasks = Array.isArray(tasksData) ? tasksData : [];
  const hasNoTasks = tasks.length === 0;

  const fetchSeasonalTasks = async () => {
    if (!vineyard || !user?.id || fetchAttemptedForWeek === weekStart) return;
    fetchAttemptedForWeek = weekStart;

    setIsLoading(true);
    setError(null);

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/ai/seasonal-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          week_start: weekStart,
          vineyard_location: vineyard.location || null,
          varieties: vineyard.varieties || [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get seasonal tasks');
      }
      // Backend stores tasks in DB, Zero will sync them
      // Wait a moment for Zero to pick up the new data
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (err) {
      setError('Unable to load seasonal tasks');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch tasks if Zero has synced and returned empty for this week
  useEffect(() => {
    if (vineyard && user?.id && zeroSynced && hasNoTasks && !isLoading && fetchAttemptedForWeek !== weekStart) {
      fetchSeasonalTasks();
    }
  }, [vineyard, user?.id, zeroSynced, hasNoTasks, isLoading, weekStart]);

  // Get season name for header
  const sortedTasks = [...tasks].sort((a: any, b: any) => a.priority - b.priority);
  const topTask = sortedTasks[0];
  const season = topTask?.season || 'Growing Season';
  const incompleteTasks = sortedTasks.filter((t: any) => !t.completed_at && t.id !== removedTaskId);

  // Header-only mode: just render the title
  if (headerOnly) {
    if (!vineyard || !zeroSynced || isLoading || hasNoTasks) {
      return <div className={styles.activityHeader}>SEASONAL</div>;
    }
    return <div className={styles.activityHeader}>SEASONAL: {season.toUpperCase()}</div>;
  }

  // Inline mode: render content without title
  if (!vineyard) {
    return (
      <div className={containerClass}>
        <p className={styles.seasonalTaskEmpty}>Add a vineyard to get started</p>
      </div>
    );
  }

  if (!zeroSynced || isLoading) {
    return (
      <div className={containerClass}>
        <p className={styles.seasonalTaskLoading}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={containerClass}>
        <p className={styles.seasonalTaskError}>{error}</p>
      </div>
    );
  }

  if (hasNoTasks) {
    return (
      <div className={containerClass}>
        <p className={styles.seasonalTaskEmpty}>No seasonal tasks this week</p>
      </div>
    );
  }

  const currentTask = incompleteTasks[0];
  const currentTaskPending = currentTask && isPending(currentTask.id);

  return (
    <div className={containerClass}>
      {incompleteTasks.length > 0 ? (
        <>
          <div className={`${styles.seasonalTaskMain} ${currentTaskPending ? styles.taskItemPending : ''}`}>
            <div className={styles.seasonalTaskNameRow}>
              <div className={`${styles.seasonalTaskName} ${currentTaskPending ? styles.taskTextPending : ''}`}>{currentTask.task_name.toUpperCase()}</div>
              {currentTaskPending ? (
                <ActionLink
                  className={styles.seasonalTaskMoreLink}
                  onClick={() => undoCompletion(currentTask.id)}
                >
                  Undo
                </ActionLink>
              ) : (
                <ActionLink
                  className={styles.seasonalTaskMoreLink}
                  onClick={() => startCompletion(currentTask.id)}
                >
                  →
                </ActionLink>
              )}
            </div>
            <div className={`${styles.seasonalTaskTiming} ${currentTaskPending ? styles.taskTextPending : ''}`}>{currentTask.timing}</div>
            <div className={`${styles.seasonalTaskDetails} ${currentTaskPending ? styles.taskTextPending : ''}`}>{currentTask.details}</div>
          </div>
        </>
      ) : (
        <div className={styles.seasonalTaskMain}>
          <p className={styles.seasonalTaskEmpty}>All tasks completed this week!</p>
        </div>
      )}
    </div>
  );
};
