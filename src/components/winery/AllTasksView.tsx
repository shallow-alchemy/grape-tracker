import { useState } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useLocation } from 'wouter';
import { useZero } from '../../contexts/ZeroContext';
import { formatDueDate, isOverdue } from './taskHelpers';
import styles from '../../App.module.css';

const TASKS_PER_PAGE = 20;

export const AllTasksView = () => {
  const zero = useZero();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  const [tasksData] = useQuery(zero.query.task);

  const filteredTasks = tasksData.filter(task => {
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

      {/* Search Bar */}
      <div className={styles.detailSection}>
        <input
          type="text"
          placeholder="Search tasks by title..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: 'var(--spacing-md)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--font-size-base)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>

      {/* Results Count */}
      <div className={styles.detailSection}>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
        }}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
          {totalPages > 1 && ` (Page ${currentPage + 1} of ${totalPages})`}
        </div>
      </div>

      {/* Tasks List */}
      <div className={styles.detailSection}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {paginatedTasks.length > 0 ? (
            paginatedTasks.map((task) => {
              const overdue = isOverdue(task.due_date, task.completed_at, task.skipped ? 1 : 0);
              const completed = task.completed_at !== null && task.completed_at !== undefined;
              const skipped = task.skipped && !completed;

              return (
                <div
                  key={task.id}
                  onClick={() => navigateToTask(task)}
                  style={{
                    padding: 'var(--spacing-md)',
                    border: `1px solid ${overdue ? 'var(--color-error)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: completed || skipped ? 'var(--color-surface)' : 'var(--color-surface-elevated)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                    e.currentTarget.style.backgroundColor = 'rgba(58, 122, 58, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = overdue ? 'var(--color-error)' : 'var(--color-border)';
                    e.currentTarget.style.backgroundColor = completed || skipped ? 'var(--color-surface)' : 'var(--color-surface-elevated)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 'var(--spacing-xs)',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'var(--font-size-sm)',
                      color: completed || skipped ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                      textDecoration: completed || skipped ? 'line-through' : 'none',
                    }}>
                      {task.name}
                    </div>
                    {overdue && (
                      <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-error)',
                        fontFamily: 'var(--font-body)',
                        textTransform: 'uppercase',
                      }}>
                        OVERDUE
                      </div>
                    )}
                    {completed && (
                      <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-success)',
                        fontFamily: 'var(--font-body)',
                        textTransform: 'uppercase',
                      }}>
                        COMPLETED
                      </div>
                    )}
                    {skipped && (
                      <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-body)',
                        textTransform: 'uppercase',
                      }}>
                        SKIPPED
                      </div>
                    )}
                  </div>

                  {task.description && (
                    <div style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-body)',
                      marginBottom: 'var(--spacing-xs)',
                    }}>
                      {task.description}
                    </div>
                  )}

                  <div style={{
                    fontSize: 'var(--font-size-xs)',
                    color: overdue ? 'var(--color-error)' : 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-body)',
                  }}>
                    Due: {formatDueDate(task.due_date)} • {task.entity_type === 'vintage' ? 'Vintage' : 'Wine'}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
              padding: 'var(--spacing-xl)',
            }}>
              {searchQuery ? 'No tasks found matching your search.' : 'No tasks yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={styles.detailSection}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'var(--spacing-md)',
            alignItems: 'center',
          }}>
            <button
              className={styles.actionButton}
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              style={{
                opacity: currentPage === 0 ? 0.5 : 1,
                cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ← PREVIOUS
            </button>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}>
              Page {currentPage + 1} of {totalPages}
            </div>
            <button
              className={styles.actionButton}
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              style={{
                opacity: currentPage === totalPages - 1 ? 0.5 : 1,
                cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              NEXT →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
