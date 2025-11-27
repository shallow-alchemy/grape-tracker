import React, { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { myTasks, myVintages, myWines } from '../../shared/queries';
import { formatDueDate, isOverdue } from './taskHelpers';
import { useZero } from '../../contexts/ZeroContext';
import styles from '../../App.module.css';

type FilterTab = 'active' | 'completed' | 'skipped' | 'all';

export const AllTasksView = () => {
  const { user } = useUser();
  const zero = useZero();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('active');

  const [tasksData] = useQuery(myTasks(user?.id) as any) as any;
  const [vintagesData] = useQuery(myVintages(user?.id) as any) as any;
  const [winesData] = useQuery(myWines(user?.id) as any) as any;

  const getVintageName = (vintageId: string) => {
    const vintage = vintagesData?.find((v: any) => v.id === vintageId);
    return vintage ? `${vintage.vintage_year} ${vintage.variety}` : 'Unknown Vintage';
  };

  const getWineName = (wineId: string) => {
    const wine = winesData?.find((w: any) => w.id === wineId);
    return wine?.name || 'Unknown Wine';
  };

  const filteredBySearch = (tasksData || []).filter((task: any) => {
    if (!searchQuery) return true;
    return task.name.toLowerCase().includes(searchQuery.toLowerCase());
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

  const groupedTasks = () => {
    if (activeFilter !== 'active') {
      return { ungrouped: [...filteredTasks].sort((a, b) => b.due_date - a.due_date) };
    }

    const vintageTasksMap: Record<string, any[]> = {};
    const wineTasksMap: Record<string, any[]> = {};

    filteredTasks.forEach((task: any) => {
      if (task.entity_type === 'vintage') {
        const name = getVintageName(task.entity_id);
        if (!vintageTasksMap[name]) vintageTasksMap[name] = [];
        vintageTasksMap[name].push(task);
      } else {
        const name = getWineName(task.entity_id);
        if (!wineTasksMap[name]) wineTasksMap[name] = [];
        wineTasksMap[name].push(task);
      }
    });

    Object.values(vintageTasksMap).forEach(tasks => tasks.sort((a, b) => a.due_date - b.due_date));
    Object.values(wineTasksMap).forEach(tasks => tasks.sort((a, b) => a.due_date - b.due_date));

    return { vintages: vintageTasksMap, wines: wineTasksMap };
  };

  const groups = groupedTasks();

  const counts = {
    active: filteredBySearch.filter((t: any) => !t.completed_at && !t.skipped).length,
    completed: filteredBySearch.filter((t: any) => t.completed_at).length,
    skipped: filteredBySearch.filter((t: any) => t.skipped && !t.completed_at).length,
    all: filteredBySearch.length,
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const navigateToTask = (task: typeof tasksData[0]) => {
    const route = task.entity_type === 'vintage'
      ? `/winery/vintages/${task.entity_id}/tasks`
      : `/winery/wines/${task.entity_id}/tasks`;
    setLocation(route);
  };

  const handleToggleComplete = (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    const completed = task.completed_at !== null && task.completed_at !== undefined;
    zero.mutate.task.update({
      id: task.id,
      completed_at: completed ? undefined : Date.now(),
      updated_at: Date.now(),
    });
  };

  const renderTaskCard = (task: any) => {
    const overdue = isOverdue(task.due_date, task.completed_at, task.skipped ? 1 : 0);
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
              <span className={overdue && !completed && !skipped ? styles.allTaskMetaOverdue : ''}>
                {formatDueDate(task.due_date)}
              </span>
              <span className={styles.allTaskMetaSeparator}>•</span>
              <span className={styles.allTaskMetaStage}>{task.stage?.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGroupedTasks = () => {
    if ('ungrouped' in groups && groups.ungrouped) {
      return groups.ungrouped.map(renderTaskCard);
    }

    const sections: React.ReactNode[] = [];

    if (groups.vintages && Object.keys(groups.vintages).length > 0) {
      Object.entries(groups.vintages).forEach(([name, tasks]) => {
        sections.push(
          <div key={`vintage-${name}`} className={styles.allTaskGroup}>
            <div className={styles.allTaskGroupHeader}>
              <span className={styles.allTaskGroupType}>VINTAGE</span>
              <span className={styles.allTaskGroupName}>{name}</span>
            </div>
            <div className={styles.allTaskGroupList}>
              {tasks.map(renderTaskCard)}
            </div>
          </div>
        );
      });
    }

    if (groups.wines && Object.keys(groups.wines).length > 0) {
      Object.entries(groups.wines).forEach(([name, tasks]) => {
        sections.push(
          <div key={`wine-${name}`} className={styles.allTaskGroup}>
            <div className={styles.allTaskGroupHeader}>
              <span className={styles.allTaskGroupType}>WINE</span>
              <span className={styles.allTaskGroupName}>{name}</span>
            </div>
            <div className={styles.allTaskGroupList}>
              {tasks.map(renderTaskCard)}
            </div>
          </div>
        );
      });
    }

    return sections.length > 0 ? sections : (
      <div className={styles.tasksEmptyState}>No tasks found.</div>
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
        {filteredTasks.length > 0 ? renderGroupedTasks() : (
          <div className={styles.tasksEmptyState}>
            {searchQuery ? 'No tasks found matching your search.' : `No ${activeFilter} tasks.`}
          </div>
        )}
      </div>
    </div>
  );
};
