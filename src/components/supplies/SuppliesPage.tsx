import { useState, useMemo } from 'react';
import { useQuery } from '@rocicorp/zero/react';
import { useUser } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { FiCheck } from 'react-icons/fi';
import { useZero } from '../../contexts/ZeroContext';
import { myTasks, myVintages, myWines, mySupplyInstances, supplyTemplates } from '../../shared/queries';
import { formatStage } from '../winery/stages';
import { formatDueDate } from '../winery/taskHelpers';
import styles from '../../App.module.css';

type FilterType = 'all' | 'needed' | 'acquired';

type SupplyWithContext = {
  instance: any;
  template: any;
  task: any;
  entity: any;
  entityType: 'vintage' | 'wine';
};

export const SuppliesPage = () => {
  const { user } = useUser();
  const zero = useZero();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterType>('all');

  // Query all relevant data
  const [supplyInstancesData] = useQuery(mySupplyInstances(user?.id) as any) as any;
  const [supplyTemplatesData] = useQuery(supplyTemplates(user?.id) as any) as any;
  const [tasksData] = useQuery(myTasks(user?.id) as any) as any;
  const [vintagesData] = useQuery(myVintages(user?.id) as any) as any;
  const [winesData] = useQuery(myWines(user?.id) as any) as any;

  // Build lookup maps
  const templateMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const t of supplyTemplatesData || []) {
      map.set(t.id, t);
    }
    return map;
  }, [supplyTemplatesData]);

  const taskMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const t of tasksData || []) {
      map.set(t.id, t);
    }
    return map;
  }, [tasksData]);

  const vintageMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const v of vintagesData || []) {
      map.set(v.id, v);
    }
    return map;
  }, [vintagesData]);

  const wineMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const w of winesData || []) {
      map.set(w.id, w);
    }
    return map;
  }, [winesData]);

  // Build supplies with full context
  const suppliesWithContext: SupplyWithContext[] = useMemo(() => {
    const result: SupplyWithContext[] = [];

    for (const instance of supplyInstancesData || []) {
      const template = templateMap.get(instance.supply_template_id);
      const task = taskMap.get(instance.task_id);

      if (!template || !task) continue;

      // Skip completed or skipped tasks
      if (task.completed_at || task.skipped) continue;

      const entityType = instance.entity_type as 'vintage' | 'wine';
      const entity = entityType === 'vintage'
        ? vintageMap.get(instance.entity_id)
        : wineMap.get(instance.entity_id);

      if (!entity) continue;

      result.push({ instance, template, task, entity, entityType });
    }

    return result;
  }, [supplyInstancesData, templateMap, taskMap, vintageMap, wineMap]);

  // Apply filter
  const filteredSupplies = useMemo(() => {
    if (filter === 'all') return suppliesWithContext;
    if (filter === 'needed') return suppliesWithContext.filter(s => !s.instance.verified_at);
    if (filter === 'acquired') return suppliesWithContext.filter(s => s.instance.verified_at);
    return suppliesWithContext;
  }, [suppliesWithContext, filter]);

  // Group by entity, then by stage
  const groupedSupplies = useMemo(() => {
    const groups = new Map<string, { entity: any; entityType: string; stages: Map<string, SupplyWithContext[]> }>();

    for (const supply of filteredSupplies) {
      const entityKey = `${supply.entityType}-${supply.entity.id}`;

      if (!groups.has(entityKey)) {
        groups.set(entityKey, {
          entity: supply.entity,
          entityType: supply.entityType,
          stages: new Map(),
        });
      }

      const group = groups.get(entityKey)!;
      const stage = supply.task.stage;

      if (!group.stages.has(stage)) {
        group.stages.set(stage, []);
      }

      group.stages.get(stage)!.push(supply);
    }

    // Sort by earliest task due date
    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      const aMinDue = Math.min(...Array.from(a.stages.values()).flat().map(s => s.task.due_date));
      const bMinDue = Math.min(...Array.from(b.stages.values()).flat().map(s => s.task.due_date));
      return aMinDue - bMinDue;
    });

    return sortedGroups;
  }, [filteredSupplies]);

  const toggleVerified = async (e: React.MouseEvent, instance: any) => {
    e.stopPropagation();
    const now = Date.now();
    await zero.mutate.supply_instance.update({
      id: instance.id,
      verified_at: instance.verified_at ? null : now,
      verified_by: instance.verified_at ? null : user?.id,
      updated_at: now,
    });
  };

  const getEntityName = (entity: any, entityType: string) => {
    if (entityType === 'vintage') {
      return `${entity.vintage_year} ${entity.variety}`;
    }
    return entity.name;
  };

  const neededCount = suppliesWithContext.filter(s => !s.instance.verified_at).length;
  const acquiredCount = suppliesWithContext.filter(s => s.instance.verified_at).length;

  return (
    <div className={styles.vineyardContainer}>
      <div className={styles.vineyardHeader}>
        <button className={styles.backButton} onClick={() => setLocation('/')}>
          ← BACK TO DASHBOARD
        </button>
        <div className={styles.vineyardTitle}>SUPPLIES</div>
      </div>

      <div className={styles.allTaskFilters}>
        <button
          className={`${styles.allTaskFilterTab} ${filter === 'all' ? styles.allTaskFilterTabActive : ''}`}
          onClick={() => setFilter('all')}
        >
          ALL ({suppliesWithContext.length})
        </button>
        <button
          className={`${styles.allTaskFilterTab} ${filter === 'needed' ? styles.allTaskFilterTabActive : ''}`}
          onClick={() => setFilter('needed')}
        >
          NEEDED ({neededCount})
        </button>
        <button
          className={`${styles.allTaskFilterTab} ${filter === 'acquired' ? styles.allTaskFilterTabActive : ''}`}
          onClick={() => setFilter('acquired')}
        >
          ACQUIRED ({acquiredCount})
        </button>
      </div>

      <div className={styles.allTasksList}>
        {groupedSupplies.length === 0 ? (
          <div className={styles.tasksEmptyState}>
            {filter === 'all'
              ? 'No supplies needed. Supplies will appear when you have upcoming tasks.'
              : filter === 'needed'
              ? 'All supplies acquired!'
              : 'No supplies acquired yet.'}
          </div>
        ) : (
          groupedSupplies.map((group) => (
            <div key={`${group.entityType}-${group.entity.id}`} className={styles.allTaskGroup}>
              <div className={styles.allTaskGroupHeader}>
                <span className={styles.allTaskGroupType}>{group.entityType.toUpperCase()}</span>
                <span className={styles.allTaskGroupName}>
                  {getEntityName(group.entity, group.entityType)}
                </span>
              </div>
              <div className={styles.allTaskGroupList}>
                {Array.from(group.stages.entries()).map(([stage, supplies]) => (
                  <div key={stage}>
                    <div className={styles.supplyStageHeader}>
                      {formatStage(stage)}
                    </div>
                    {supplies
                      .sort((a, b) => a.task.due_date - b.task.due_date)
                      .map((supply) => (
                        <div
                          key={supply.instance.id}
                          className={`${styles.allTaskCard} ${supply.instance.verified_at ? styles.allTaskCardDone : ''}`}
                          onClick={(e) => toggleVerified(e, supply.instance)}
                        >
                          <div className={styles.allTaskCardMain}>
                            <div className={`${styles.supplyCheckbox} ${supply.instance.verified_at ? styles.checked : ''}`}>
                              {supply.instance.verified_at && <FiCheck />}
                            </div>
                            <div className={styles.allTaskCardContent}>
                              <div className={styles.allTaskCardHeader}>
                                <span className={`${styles.allTaskCardName} ${supply.instance.verified_at ? styles.allTaskCardNameDone : ''}`}>
                                  {supply.template.name}
                                </span>
                                {supply.instance.calculated_quantity > 1 && (
                                  <span className={styles.supplyQuantityBadge}>
                                    x{supply.instance.calculated_quantity}
                                  </span>
                                )}
                              </div>
                              <div className={styles.allTaskCardMeta}>
                                <span>{supply.task.name}</span>
                                <span className={styles.allTaskMetaSeparator}>•</span>
                                <span>{formatDueDate(supply.task.due_date)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
