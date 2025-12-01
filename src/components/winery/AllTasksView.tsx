import React, { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { myTasks, myVintages, myWines, mySeasonalTasksByWeek } from '../../shared/queries';
import { formatDueDate, isOverdue, isDueToday } from './taskHelpers';
import { useZero } from '../../contexts/ZeroContext';
import styles from '../../App.module.css';

type FilterTab = 'active' | 'completed' | 'skipped' | 'all';

// Get Monday of the current week (timestamp in milliseconds)
const getWeekStart = (): number => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
};

// Get Sunday of the current week (end of week)
const getWeekEnd = (): number => {
  const weekStart = getWeekStart();
  return weekStart + 6 * 24 * 60 * 60 * 1000; // Add 6 days
};

export const AllTasksView = () => {
  const { user } = useUser();
  const zero = useZero();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('active');

  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  const [tasksData] = useQuery(myTasks(user?.id) as any) as any;
  const [vintagesData] = useQuery(myVintages(user?.id) as any) as any;
  const [winesData] = useQuery(myWines(user?.id) as any) as any;
  const [seasonalTasksData] = useQuery(mySeasonalTasksByWeek(user?.id, weekStart) as any) as any;

  // Wait for all queries to sync before rendering (undefined = still syncing)
  const allQueriesSynced = tasksData !== undefined && seasonalTasksData !== undefined;

  // Transform seasonal tasks to match regular task format
  const seasonalTasks = (seasonalTasksData || []).map((st: any) => ({
    id: st.id,
    name: st.task_name,
    description: st.details,
    due_date: weekEnd,
    completed_at: st.completed_at,
    skipped: false,
    entity_type: 'seasonal' as const,
    entity_id: st.id,
    stage: st.season,
    timing: st.timing,
    priority: st.priority,
  }));

  const getVintageName = (vintageId: string) => {
    const vintage = vintagesData?.find((v: any) => v.id === vintageId);
    return vintage ? `${vintage.vintage_year} ${vintage.variety}` : 'Unknown Vintage';
  };

  const getWineName = (wineId: string) => {
    const wine = winesData?.find((w: any) => w.id === wineId);
    return wine?.name || 'Unknown Wine';
  };

  // Combine regular tasks and seasonal tasks
  const allTasks = [...(tasksData || []), ...seasonalTasks];

  const filteredBySearch = allTasks.filter((task: any) => {
    if (!searchQuery) return true;
    return task.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
  });

  const filteredTasks = filteredBySearch.filter((task: any) => {
    const completed = task.completed_at !== null && task.completed_at !== undefined;
    const skipped = !!task.skipped;

    switch (activeFilter) {
      case 'active':
        return !completed && !skipped;
      case 'completed':
        return completed;
      case 'skipped':
        return skipped && !completed;
      case 'all':
      default:
        return true;
    }
  });

  const getTaskSource = (task: any): string => {
    if (task.entity_type === 'seasonal') {
      return 'Seasonal';
    } else if (task.entity_type === 'vintage') {
      return getVintageName(task.entity_id);
    } else {
      return getWineName(task.entity_id);
    }
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (activeFilter === 'active') {
      // Sort by due date ascending for active tasks
      return a.due_date - b.due_date;
    }
    // Sort by due date descending for other tabs
    return b.due_date - a.due_date;
  });

  const counts = allQueriesSynced ? {
    active: filteredBySearch.filter((t: any) => !t.completed_at && !t.skipped).length,
    completed: filteredBySearch.filter((t: any) => t.completed_at).length,
    skipped: filteredBySearch.filter((t: any) => t.skipped && !t.completed_at).length,
    all: filteredBySearch.length,
  } : { active: 0, completed: 0, skipped: 0, all: 0 };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const navigateToTask = (task: any) => {
    if (task.entity_type === 'seasonal') {
      // Seasonal tasks don't navigate anywhere
      return;
    }
    const route = task.entity_type === 'vintage'
      ? `/winery/vintages/${task.entity_id}`
      : `/winery/wines/${task.entity_id}`;
    setLocation(route);
  };

  const handleToggleComplete = (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    const completed = task.completed_at !== null && task.completed_at !== undefined;

    if (task.entity_type === 'seasonal') {
      zero.mutate.seasonal_task.update({
        id: task.id,
        completed_at: completed ? undefined : Date.now(),
        updated_at: Date.now(),
      });
    } else {
      zero.mutate.task.update({
        id: task.id,
        completed_at: completed ? undefined : Date.now(),
        updated_at: Date.now(),
      });
    }
  };

  const renderTaskCard = (task: any) => {
    const overdue = isOverdue(task.due_date, task.completed_at, task.skipped ? 1 : 0);
    const dueToday = isDueToday(task.due_date);
    const completed = task.completed_at !== null && task.completed_at !== undefined;
    const skipped = task.skipped && !completed;

    return (
      <div
        key={task.id}
        onClick={() => navigateToTask(task)}
        className={`${styles.allTaskCard} ${overdue ? styles.allTaskCardOverdue : ''} ${completed || skipped ? styles.allTaskCardDone : ''}`}
      >
        <div className={styles.allTaskCardMain}>
          {activeFilter === 'active' && (
            <input
              type="checkbox"
              checked={completed}
              onClick={(e) => handleToggleComplete(e, task)}
              onChange={() => {}}
              className={styles.allTaskCheckbox}
            />
          )}
          <div className={styles.allTaskCardContent}>
            <div className={styles.allTaskCardHeader}>
              <span className={`${styles.allTaskCardName} ${completed || skipped ? styles.allTaskCardNameDone : ''}`}>
                {task.name}
              </span>
              {overdue && !completed && !skipped && (
                <span className={styles.allTaskBadgeOverdue}>OVERDUE</span>
              )}
              {completed && (
                <span className={styles.allTaskBadgeCompleted}>COMPLETED</span>
              )}
              {skipped && (
                <span className={styles.allTaskBadgeSkipped}>SKIPPED</span>
              )}
            </div>
            {task.description && (
              <div className={styles.allTaskCardDescription}>{task.description}</div>
            )}
            <div className={styles.allTaskCardMeta}>
              <span className={styles.allTaskMetaSource}>{getTaskSource(task)}</span>
              <span className={styles.allTaskMetaSeparator}>•</span>
              <span className={
                overdue && !completed && !skipped ? styles.allTaskMetaOverdue :
                dueToday && !completed && !skipped ? styles.allTaskMetaDueToday : ''
              }>
                {formatDueDate(task.due_date)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className={styles.vineyardContainer}>
      <div className={styles.vineyardHeader}>
        <button className={styles.backButton} onClick={() => setLocation('/')}>
          ← BACK TO DASHBOARD
        </button>
        <div className={styles.vineyardTitle}>ALL TASKS</div>
      </div>

      <div className={styles.allTaskFilters}>
        <button
          className={`${styles.allTaskFilterTab} ${activeFilter === 'active' ? styles.allTaskFilterTabActive : ''}`}
          onClick={() => setActiveFilter('active')}
        >
          ACTIVE ({counts.active})
        </button>
        <button
          className={`${styles.allTaskFilterTab} ${activeFilter === 'completed' ? styles.allTaskFilterTabActive : ''}`}
          onClick={() => setActiveFilter('completed')}
        >
          COMPLETED ({counts.completed})
        </button>
        <button
          className={`${styles.allTaskFilterTab} ${activeFilter === 'skipped' ? styles.allTaskFilterTabActive : ''}`}
          onClick={() => setActiveFilter('skipped')}
        >
          SKIPPED ({counts.skipped})
        </button>
        <button
          className={`${styles.allTaskFilterTab} ${activeFilter === 'all' ? styles.allTaskFilterTabActive : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          ALL ({counts.all})
        </button>
      </div>

      <div className={styles.detailSection}>
        <input
          type="text"
          placeholder="Search tasks by title..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className={styles.taskSearchInput}
        />
      </div>

      <div className={styles.allTasksList}>
        {!allQueriesSynced ? (
          <div className={styles.tasksEmptyState}>Loading tasks...</div>
        ) : sortedTasks.length > 0 ? sortedTasks.map(renderTaskCard) : (
          <div className={styles.tasksEmptyState}>
            {searchQuery ? 'No tasks found matching your search.' : `No ${activeFilter} tasks.`}
          </div>
        )}
      </div>
    </div>
  );
};
