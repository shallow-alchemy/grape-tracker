import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useLocation } from 'wouter';
import { myTasks } from '../../queries';
import { formatDueDate, isOverdue } from './taskHelpers';
import styles from '../../App.module.css';

const TASKS_PER_PAGE = 20;

export const AllTasksView = () => {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  const [tasksData] = useQuery(myTasks()) as any as any;

  const filteredTasks = tasksData.filter((task: any) => {
    if (!searchQuery) return true;
    return task.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aDone = (a.completed_at !== null && a.completed_at !== undefined) || a.skipped;
    const bDone = (b.completed_at !== null && b.completed_at !== undefined) || b.skipped;

    if (aDone !== bDone) {
      return aDone ? 1 : -1;
    }

    return a.due_date - b.due_date;
  });

  const totalPages = Math.ceil(sortedTasks.length / TASKS_PER_PAGE);
  const startIndex = currentPage * TASKS_PER_PAGE;
  const paginatedTasks = sortedTasks.slice(startIndex, startIndex + TASKS_PER_PAGE);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(0);
  };

  const navigateToTask = (task: typeof tasksData[0]) => {
    const route = task.entity_type === 'vintage'
      ? `/winery/vintages/${task.entity_id}/tasks`
      : `/winery/wines/${task.entity_id}/tasks`;
    setLocation(route);
  };

  return (
    <div className={styles.vineyardContainer}>
      <div className={styles.vineyardHeader}>
        <button className={styles.backButton} onClick={() => setLocation('/')}>
          ← BACK TO DASHBOARD
        </button>
        <div className={styles.vineyardTitle}>ALL TASKS</div>
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

      <div className={styles.detailSection}>
        <div className={styles.tasksResultCount}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
          {totalPages > 1 && ` (Page ${currentPage + 1} of ${totalPages})`}
        </div>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.tasksListContainer}>
          {paginatedTasks.length > 0 ? (
            paginatedTasks.map((task) => {
              const overdue = isOverdue(task.due_date, task.completed_at, task.skipped ? 1 : 0);
              const completed = task.completed_at !== null && task.completed_at !== undefined;
              const skipped = task.skipped && !completed;

              return (
                <div
                  key={task.id}
                  onClick={() => navigateToTask(task)}
                  className={`${styles.taskCard} ${overdue ? styles.taskCardOverdue : ''} ${completed || skipped ? styles.taskCardCompleted : ''}`}
                >
                  <div className={styles.taskCardHeader}>
                    <div className={`${styles.taskCardTitle} ${completed || skipped ? styles.taskCardTitleMuted : ''}`}>
                      {task.name}
                    </div>
                    {overdue && (
                      <div className={`${styles.taskStatusBadge} ${styles.taskStatusOverdue}`}>
                        OVERDUE
                      </div>
                    )}
                    {completed && (
                      <div className={`${styles.taskStatusBadge} ${styles.taskStatusCompleted}`}>
                        COMPLETED
                      </div>
                    )}
                    {skipped && (
                      <div className={`${styles.taskStatusBadge} ${styles.taskStatusSkipped}`}>
                        SKIPPED
                      </div>
                    )}
                  </div>

                  {task.description && (
                    <div className={styles.taskCardDescription}>
                      {task.description}
                    </div>
                  )}

                  <div className={`${styles.taskCardDueDate} ${overdue ? styles.taskCardDueDateOverdue : ''}`}>
                    Due: {formatDueDate(task.due_date)} • {task.entity_type === 'vintage' ? 'Vintage' : 'Wine'}
                  </div>
                </div>
              );
            })
          ) : (
            <div className={styles.tasksEmptyState}>
              {searchQuery ? 'No tasks found matching your search.' : 'No tasks yet.'}
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className={styles.detailSection}>
          <div className={styles.paginationControls}>
            <button
              className={`${styles.actionButton} ${currentPage === 0 ? styles.paginationButtonDisabled : ''}`}
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              ← PREVIOUS
            </button>
            <div className={styles.paginationInfo}>
              Page {currentPage + 1} of {totalPages}
            </div>
            <button
              className={`${styles.actionButton} ${currentPage === totalPages - 1 ? styles.paginationButtonDisabled : ''}`}
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
            >
              NEXT →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
