import { useState, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@rocicorp/zero/react';
import { FiChevronDown, FiChevronRight, FiCheck, FiX, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiArchive, FiPackage } from 'react-icons/fi';
import { taskTemplates, allStages, supplyTemplates as supplyTemplatesQuery, vineyardStages, allGeneralTaskTemplates } from '../../../shared/queries';
import { type WineType } from '../../winery/stages';
import { useZero } from '../../../contexts/ZeroContext';
import styles from '../SettingsPage.module.css';
import taskStyles from './StagesTasksSection.module.css';

// Module-level cache - persists across component unmount/remount
let cachedStagesData: Stage[] | null = null;
let cachedTemplatesData: TaskTemplate[] | null = null;
let cachedSupplyTemplatesData: SupplyTemplate[] | null = null;
let cachedVineyardStagesData: Stage[] | null = null;
let cachedGeneralTaskTemplatesData: GeneralTaskTemplate[] | null = null;

// Vineyard seasonal stage labels for display
const VINEYARD_STAGE_LABELS: Record<string, string> = {
  dormant: 'Dormant',
  bud_break: 'Bud Break',
  flowering: 'Flowering',
  fruit_set: 'Fruit Set',
  veraison: 'Veraison',
  ripening: 'Ripening',
  harvest: 'Harvest',
  post_harvest: 'Post-Harvest',
};

type StageApplicability = 'required' | 'optional' | 'hidden';

type Stage = {
  id: string;
  user_id: string;
  entity_type: string;
  value: string;
  label: string;
  description: string;
  sort_order: number;
  is_archived: boolean;
  is_default: boolean;
  applicability: Record<WineType, StageApplicability> | null;
  created_at: number;
  updated_at: number;
};

type TaskTemplate = {
  id: string;
  user_id: string;
  stage: string;
  entity_type: string;
  wine_type: string;
  name: string;
  description: string;
  frequency: string;
  frequency_count: number;
  frequency_unit: string;
  default_enabled: boolean;
  is_archived: boolean;
  sort_order: number;
};

type SupplyTemplate = {
  id: string;
  user_id: string;
  task_template_id: string;
  name: string;
  quantity_formula: string | null;
  quantity_fixed: number;
  lead_time_days: number;
  notes: string;
  is_archived: boolean;
  sort_order: number;
  created_at: number;
  updated_at: number;
};

type GeneralTaskTemplate = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  scope: string;  // 'vineyard' or 'winery'
  frequency: string;
  frequency_count: number;
  frequency_unit: string;
  is_enabled: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at: number;
  updated_at: number;
};

const WINE_TYPES: { value: WineType; label: string }[] = [
  { value: 'red', label: 'Red' },
  { value: 'white', label: 'White' },
  { value: 'rose', label: 'Rosé' },
  { value: 'sparkling', label: 'Sparkling' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'fortified', label: 'Fortified' },
];

const FREQUENCY_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const formatFrequency = (template: TaskTemplate): string => {
  if (!template.frequency || template.frequency === 'once') {
    return 'Once';
  }
  if (template.frequency === 'daily') {
    return template.frequency_count === 1 ? 'Daily' : `${template.frequency_count}x Daily`;
  }
  if (template.frequency === 'weekly') {
    return template.frequency_count === 1 ? 'Weekly' : `Every ${template.frequency_count} Weeks`;
  }
  if (template.frequency === 'monthly') {
    return template.frequency_count === 1 ? 'Monthly' : `Every ${template.frequency_count} Months`;
  }
  return template.frequency;
};

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const StagesTasksSection = () => {
  const { user } = useUser();
  const zero = useZero();
  const [templatesData, templatesStatus] = useQuery(taskTemplates(user?.id) as any) as any;
  const [stagesData, stagesStatus] = useQuery(allStages(user?.id) as any) as any;
  const [supplyTemplatesData] = useQuery(supplyTemplatesQuery(user?.id) as any) as any;
  const [vineyardStagesData] = useQuery(vineyardStages(user?.id) as any) as any;
  const [generalTaskTemplatesData] = useQuery(allGeneralTaskTemplates(user?.id) as any) as any;

  // Update module-level cache when we have real data
  if (stagesData?.length > 0) {
    cachedStagesData = stagesData;
  }
  if (templatesData?.length > 0) {
    cachedTemplatesData = templatesData;
  }
  if (supplyTemplatesData?.length > 0) {
    cachedSupplyTemplatesData = supplyTemplatesData;
  }
  if (vineyardStagesData?.length > 0) {
    cachedVineyardStagesData = vineyardStagesData;
  }
  if (generalTaskTemplatesData?.length > 0) {
    cachedGeneralTaskTemplatesData = generalTaskTemplatesData;
  }

  // Use cached data if Zero is still syncing but we have previous data
  const effectiveStagesData = stagesData?.length > 0 ? stagesData : cachedStagesData || stagesData;
  const effectiveTemplatesData = templatesData?.length > 0 ? templatesData : cachedTemplatesData || templatesData;
  const effectiveSupplyTemplatesData = supplyTemplatesData?.length > 0 ? supplyTemplatesData : cachedSupplyTemplatesData || supplyTemplatesData;
  const effectiveVineyardStagesData = vineyardStagesData?.length > 0 ? vineyardStagesData : cachedVineyardStagesData || vineyardStagesData;
  const effectiveGeneralTaskTemplatesData = generalTaskTemplatesData?.length > 0 ? generalTaskTemplatesData : cachedGeneralTaskTemplatesData || generalTaskTemplatesData;

  // Only show loading on FIRST load - never show loading if we have cached data
  const hasLoadedBefore = cachedStagesData !== null || cachedTemplatesData !== null;
  const isLoading = !hasLoadedBefore && (stagesStatus?.type === 'unknown' || templatesStatus?.type === 'unknown');

  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(['crush']));
  const [expandedVineyardStages, setExpandedVineyardStages] = useState<Set<string>>(new Set(['dormant']));
  const [expandedGeneralScopes, setExpandedGeneralScopes] = useState<Set<string>>(new Set(['vineyard']));
  const [filterWineType, setFilterWineType] = useState<WineType | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Stage editing state
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [addingStage, setAddingStage] = useState(false);
  const [newStage, setNewStage] = useState({ label: '', value: '', description: '' });

  // Task editing state
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null);
  const [addingTaskToStage, setAddingTaskToStage] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    wine_type: '',
    frequency: 'once',
    frequency_count: 1,
  });

  // Supply editing state
  const [expandedTaskForSupplies, setExpandedTaskForSupplies] = useState<string | null>(null);
  const [editingSupply, setEditingSupply] = useState<SupplyTemplate | null>(null);
  const [addingSupplyToTask, setAddingSupplyToTask] = useState<string | null>(null);
  const [newSupply, setNewSupply] = useState({
    name: '',
    quantity_formula: '',
    quantity_fixed: 1,
    lead_time_days: 7,
    notes: '',
  });

  // General task editing state
  const [editingGeneralTask, setEditingGeneralTask] = useState<GeneralTaskTemplate | null>(null);
  const [addingGeneralTaskScope, setAddingGeneralTaskScope] = useState<string | null>(null);
  const [newGeneralTask, setNewGeneralTask] = useState({
    name: '',
    description: '',
    frequency: 'once',
    frequency_count: 1,
  });

  const stages: Stage[] = useMemo(() => {
    return (effectiveStagesData || [])
      .filter((s: Stage) => s.entity_type === 'wine')
      .filter((s: Stage) => showArchived || !s.is_archived)
      .sort((a: Stage, b: Stage) => a.sort_order - b.sort_order);
  }, [effectiveStagesData, showArchived]);

  // Vineyard seasonal stages
  const vineyardStagesList: Stage[] = useMemo(() => {
    return (effectiveVineyardStagesData || [])
      .filter((s: Stage) => showArchived || !s.is_archived)
      .sort((a: Stage, b: Stage) => a.sort_order - b.sort_order);
  }, [effectiveVineyardStagesData, showArchived]);

  const templates: TaskTemplate[] = useMemo(() => {
    return (effectiveTemplatesData || [])
      .filter((t: TaskTemplate) => t.entity_type === 'wine')
      .filter((t: TaskTemplate) => showArchived || !t.is_archived)
      .sort((a: TaskTemplate, b: TaskTemplate) => a.sort_order - b.sort_order);
  }, [effectiveTemplatesData, showArchived]);

  // Vineyard task templates
  const vineyardTemplates: TaskTemplate[] = useMemo(() => {
    return (effectiveTemplatesData || [])
      .filter((t: TaskTemplate) => t.entity_type === 'block')
      .filter((t: TaskTemplate) => showArchived || !t.is_archived)
      .sort((a: TaskTemplate, b: TaskTemplate) => a.sort_order - b.sort_order);
  }, [effectiveTemplatesData, showArchived]);

  const templatesByStage = useMemo(() => {
    const grouped = new Map<string, TaskTemplate[]>();

    for (const template of templates) {
      if (filterWineType !== 'all' && template.wine_type && template.wine_type !== filterWineType) {
        continue;
      }

      const stageTemplates = grouped.get(template.stage) || [];
      stageTemplates.push(template);
      grouped.set(template.stage, stageTemplates);
    }

    return grouped;
  }, [templates, filterWineType]);

  // Group vineyard templates by stage
  const vineyardTemplatesByStage = useMemo(() => {
    const grouped = new Map<string, TaskTemplate[]>();

    for (const template of vineyardTemplates) {
      const stageTemplates = grouped.get(template.stage) || [];
      stageTemplates.push(template);
      grouped.set(template.stage, stageTemplates);
    }

    return grouped;
  }, [vineyardTemplates]);

  // General task templates grouped by scope
  const generalTaskTemplates: GeneralTaskTemplate[] = useMemo(() => {
    return (effectiveGeneralTaskTemplatesData || [])
      .filter((t: GeneralTaskTemplate) => showArchived || !t.is_archived)
      .sort((a: GeneralTaskTemplate, b: GeneralTaskTemplate) => a.sort_order - b.sort_order);
  }, [effectiveGeneralTaskTemplatesData, showArchived]);

  const generalTasksByScope = useMemo(() => {
    const grouped = new Map<string, GeneralTaskTemplate[]>();

    for (const template of generalTaskTemplates) {
      const scopeTasks = grouped.get(template.scope) || [];
      scopeTasks.push(template);
      grouped.set(template.scope, scopeTasks);
    }

    return grouped;
  }, [generalTaskTemplates]);

  // Group supply templates by task template ID
  const supplyTemplates: SupplyTemplate[] = useMemo(() => {
    return (effectiveSupplyTemplatesData || [])
      .filter((s: SupplyTemplate) => showArchived || !s.is_archived)
      .sort((a: SupplyTemplate, b: SupplyTemplate) => a.sort_order - b.sort_order);
  }, [effectiveSupplyTemplatesData, showArchived]);

  const suppliesByTaskTemplate = useMemo(() => {
    const grouped = new Map<string, SupplyTemplate[]>();
    for (const supply of supplyTemplates) {
      const taskSupplies = grouped.get(supply.task_template_id) || [];
      taskSupplies.push(supply);
      grouped.set(supply.task_template_id, taskSupplies);
    }
    return grouped;
  }, [supplyTemplates]);

  const toggleStage = (stage: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  };

  const toggleVineyardStage = (stage: string) => {
    setExpandedVineyardStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  };

  const toggleGeneralScope = (scope: string) => {
    setExpandedGeneralScopes(prev => {
      const next = new Set(prev);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  };

  // Stage handlers
  const handleArchiveStage = async (stage: Stage) => {
    setIsUpdating(stage.id);
    try {
      await zero.mutate.stage.update({
        id: stage.id,
        is_archived: !stage.is_archived,
        updated_at: Date.now(),
      });
    } catch (err) {
      console.error('Failed to archive stage:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSaveStage = async (stage: Stage) => {
    setIsUpdating(stage.id);
    try {
      await zero.mutate.stage.update({
        id: stage.id,
        label: stage.label,
        description: stage.description,
        applicability: stage.applicability,
        updated_at: Date.now(),
      });
      setEditingStage(null);
    } catch (err) {
      console.error('Failed to update stage:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleAddStage = async () => {
    if (!newStage.label || !newStage.value) return;

    setIsUpdating('new-stage');
    try {
      const maxOrder = Math.max(...stages.map(s => s.sort_order), 0);
      await zero.mutate.stage.insert({
        id: generateId('stage'),
        user_id: user?.id || '',
        entity_type: 'wine',
        value: newStage.value.toLowerCase().replace(/\s+/g, '_'),
        label: newStage.label,
        description: newStage.description,
        sort_order: maxOrder + 1,
        is_archived: false,
        is_default: false,
        applicability: {
          red: 'optional',
          white: 'optional',
          rose: 'optional',
          sparkling: 'optional',
          dessert: 'optional',
          fortified: 'optional',
        },
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      setNewStage({ label: '', value: '', description: '' });
      setAddingStage(false);
    } catch (err) {
      console.error('Failed to add stage:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleResetStages = async () => {
    if (!confirm('This will restore all archived default stages. Continue?')) return;

    setIsUpdating('reset');
    try {
      // Unarchive all default stages
      for (const stage of effectiveStagesData || []) {
        if (stage.is_default && stage.is_archived) {
          await zero.mutate.stage.update({
            id: stage.id,
            is_archived: false,
            updated_at: Date.now(),
          });
        }
      }
    } catch (err) {
      console.error('Failed to reset stages:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  // Task template handlers
  const handleToggleEnabled = async (template: TaskTemplate) => {
    setIsUpdating(template.id);
    try {
      await zero.mutate.task_template.update({
        id: template.id,
        default_enabled: !template.default_enabled,
        updated_at: Date.now(),
      });
    } catch (err) {
      console.error('Failed to update task template:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleArchiveTask = async (template: TaskTemplate) => {
    setIsUpdating(template.id);
    try {
      await zero.mutate.task_template.update({
        id: template.id,
        is_archived: !template.is_archived,
        updated_at: Date.now(),
      });
    } catch (err) {
      console.error('Failed to archive task:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSaveTask = async (template: TaskTemplate) => {
    setIsUpdating(template.id);
    try {
      await zero.mutate.task_template.update({
        id: template.id,
        name: template.name,
        description: template.description,
        wine_type: template.wine_type,
        frequency: template.frequency,
        frequency_count: template.frequency_count,
        updated_at: Date.now(),
      });
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleAddTask = async (stageValue: string) => {
    if (!newTask.name) return;

    setIsUpdating('new-task');
    try {
      const stageTasks = templatesByStage.get(stageValue) || [];
      const maxOrder = Math.max(...stageTasks.map(t => t.sort_order), 0);

      await zero.mutate.task_template.insert({
        id: generateId('tt'),
        user_id: user?.id || '',
        vineyard_id: 'default',
        stage: stageValue,
        entity_type: 'wine',
        wine_type: newTask.wine_type,
        name: newTask.name,
        description: newTask.description,
        frequency: newTask.frequency,
        frequency_count: newTask.frequency_count,
        frequency_unit: newTask.frequency === 'once' ? '' : newTask.frequency.replace('ly', 's'),
        default_enabled: true,
        is_archived: false,
        sort_order: maxOrder + 1,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      setNewTask({ name: '', description: '', wine_type: '', frequency: 'once', frequency_count: 1 });
      setAddingTaskToStage(null);
    } catch (err) {
      console.error('Failed to add task:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  // Supply handlers
  const toggleTaskSupplies = (taskId: string) => {
    setExpandedTaskForSupplies(prev => prev === taskId ? null : taskId);
  };

  const handleAddSupply = async (taskTemplateId: string) => {
    if (!newSupply.name) return;

    setIsUpdating('new-supply');
    try {
      const taskSupplies = suppliesByTaskTemplate.get(taskTemplateId) || [];
      const maxOrder = Math.max(...taskSupplies.map(s => s.sort_order), 0);

      await zero.mutate.supply_template.insert({
        id: generateId('st'),
        user_id: user?.id || '',
        task_template_id: taskTemplateId,
        name: newSupply.name,
        quantity_formula: newSupply.quantity_formula || null,
        quantity_fixed: newSupply.quantity_fixed,
        lead_time_days: newSupply.lead_time_days,
        notes: newSupply.notes,
        is_archived: false,
        sort_order: maxOrder + 1,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      setNewSupply({ name: '', quantity_formula: '', quantity_fixed: 1, lead_time_days: 7, notes: '' });
      setAddingSupplyToTask(null);
    } catch (err) {
      console.error('Failed to add supply:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSaveSupply = async (supply: SupplyTemplate) => {
    setIsUpdating(supply.id);
    try {
      await zero.mutate.supply_template.update({
        id: supply.id,
        name: supply.name,
        quantity_formula: supply.quantity_formula,
        quantity_fixed: supply.quantity_fixed,
        lead_time_days: supply.lead_time_days,
        notes: supply.notes,
        updated_at: Date.now(),
      });
      setEditingSupply(null);
    } catch (err) {
      console.error('Failed to update supply:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleArchiveSupply = async (supply: SupplyTemplate) => {
    setIsUpdating(supply.id);
    try {
      await zero.mutate.supply_template.update({
        id: supply.id,
        is_archived: !supply.is_archived,
        updated_at: Date.now(),
      });
    } catch (err) {
      console.error('Failed to archive supply:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteSupply = async (supply: SupplyTemplate) => {
    if (!confirm(`Delete supply "${supply.name}"? This cannot be undone.`)) return;

    setIsUpdating(supply.id);
    try {
      await zero.mutate.supply_template.delete({ id: supply.id });
    } catch (err) {
      console.error('Failed to delete supply:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  // General task template handlers
  const handleToggleGeneralTaskEnabled = async (template: GeneralTaskTemplate) => {
    setIsUpdating(template.id);
    try {
      await (zero.mutate as any).general_task_template.update({
        id: template.id,
        is_enabled: !template.is_enabled,
        updated_at: Date.now(),
      });
    } catch (err) {
      console.error('Failed to toggle general task:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleArchiveGeneralTask = async (template: GeneralTaskTemplate) => {
    setIsUpdating(template.id);
    try {
      await (zero.mutate as any).general_task_template.update({
        id: template.id,
        is_archived: !template.is_archived,
        updated_at: Date.now(),
      });
    } catch (err) {
      console.error('Failed to archive general task:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSaveGeneralTask = async (template: GeneralTaskTemplate) => {
    setIsUpdating(template.id);
    try {
      await (zero.mutate as any).general_task_template.update({
        id: template.id,
        name: template.name,
        description: template.description,
        frequency: template.frequency,
        frequency_count: template.frequency_count,
        updated_at: Date.now(),
      });
      setEditingGeneralTask(null);
    } catch (err) {
      console.error('Failed to update general task:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleAddGeneralTask = async (scope: string) => {
    if (!newGeneralTask.name) return;

    setIsUpdating('new-general-task');
    try {
      const scopeTasks = generalTasksByScope.get(scope) || [];
      const maxOrder = Math.max(...scopeTasks.map(t => t.sort_order), 0);

      await (zero.mutate as any).general_task_template.insert({
        id: generateId('gtt'),
        user_id: user?.id || '',
        name: newGeneralTask.name,
        description: newGeneralTask.description,
        scope: scope,
        frequency: newGeneralTask.frequency,
        frequency_count: newGeneralTask.frequency_count,
        frequency_unit: newGeneralTask.frequency === 'once' ? '' : newGeneralTask.frequency.replace('ly', 's'),
        is_enabled: true,
        is_archived: false,
        sort_order: maxOrder + 1,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      setNewGeneralTask({ name: '', description: '', frequency: 'once', frequency_count: 1 });
      setAddingGeneralTaskScope(null);
    } catch (err) {
      console.error('Failed to add general task:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const formatGeneralTaskFrequency = (template: GeneralTaskTemplate): string => {
    if (!template.frequency || template.frequency === 'once') {
      return 'Once';
    }
    if (template.frequency === 'daily') {
      return template.frequency_count === 1 ? 'Daily' : `${template.frequency_count}x Daily`;
    }
    if (template.frequency === 'weekly') {
      return template.frequency_count === 1 ? 'Weekly' : `Every ${template.frequency_count} Weeks`;
    }
    if (template.frequency === 'biweekly') {
      return 'Every 2 Weeks';
    }
    if (template.frequency === 'monthly') {
      return template.frequency_count === 1 ? 'Monthly' : `Every ${template.frequency_count} Months`;
    }
    return template.frequency;
  };

  const getStagesForFilter = (): Stage[] => {
    if (filterWineType === 'all') {
      return stages;
    }
    return stages.filter(stage => {
      if (!stage.applicability) return true;
      return stage.applicability[filterWineType] !== 'hidden';
    });
  };

  const stagesToShow = getStagesForFilter();

  // Show loading state when data hasn't loaded yet
  if (isLoading) {
    return (
      <div className={styles.sectionContent}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Stages & Tasks</h2>
          <p className={styles.sectionDescription}>
            Configure winemaking stages and task templates that are automatically created when a wine enters each stage.
          </p>
        </div>
        <div className={taskStyles.emptyState}>
          Loading stages and tasks...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sectionContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Stages & Tasks</h2>
        <p className={styles.sectionDescription}>
          Configure winemaking stages and task templates that are automatically created when a wine enters each stage.
        </p>
      </div>

      {/* Controls bar */}
      <div className={taskStyles.filterBar}>
        <label className={taskStyles.filterLabel}>Filter by wine type:</label>
        <select
          className={taskStyles.filterSelect}
          value={filterWineType}
          onChange={(e) => setFilterWineType(e.target.value as WineType | 'all')}
        >
          <option value="all">All Wine Types</option>
          {WINE_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>

        <label className={taskStyles.checkboxLabel}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>

        <div className={taskStyles.actionButtons}>
          <button
            className={taskStyles.actionButton}
            onClick={() => setAddingStage(true)}
            title="Add new stage"
          >
            <FiPlus /> Add Stage
          </button>
          <button
            className={taskStyles.actionButton}
            onClick={handleResetStages}
            disabled={isUpdating === 'reset'}
            title="Reset to defaults"
          >
            <FiRefreshCw /> Reset Defaults
          </button>
        </div>
      </div>

      {/* Add stage form */}
      {addingStage && (
        <div className={taskStyles.addForm}>
          <h4>Add New Stage</h4>
          <div className={taskStyles.formRow}>
            <input
              type="text"
              placeholder="Stage label (e.g., Cold Soak)"
              value={newStage.label}
              onChange={(e) => setNewStage(prev => ({
                ...prev,
                label: e.target.value,
                value: e.target.value.toLowerCase().replace(/\s+/g, '_')
              }))}
              className={taskStyles.formInput}
            />
            <input
              type="text"
              placeholder="Stage ID (auto-generated)"
              value={newStage.value}
              onChange={(e) => setNewStage(prev => ({ ...prev, value: e.target.value }))}
              className={taskStyles.formInput}
            />
          </div>
          <textarea
            placeholder="Description"
            value={newStage.description}
            onChange={(e) => setNewStage(prev => ({ ...prev, description: e.target.value }))}
            className={taskStyles.formTextarea}
          />
          <div className={taskStyles.formActions}>
            <button onClick={() => setAddingStage(false)} className={taskStyles.cancelButton}>
              Cancel
            </button>
            <button
              onClick={handleAddStage}
              className={taskStyles.saveButton}
              disabled={!newStage.label || isUpdating === 'new-stage'}
            >
              Add Stage
            </button>
          </div>
        </div>
      )}

      {/* Winemaking Stages */}
      <div className={styles.subsection}>
        <h3 className={styles.subsectionTitle}>Winemaking Stages</h3>
        <p className={styles.subsectionDescription}>
          Configure winemaking stages and the tasks that are created when a wine enters each stage.
        </p>

        <div className={taskStyles.stagesContainer}>
          {stagesToShow.map((stage) => {
          const stageTemplates = templatesByStage.get(stage.value) || [];
          const isExpanded = expandedStages.has(stage.value);
          const enabledCount = stageTemplates.filter(t => t.default_enabled && !t.is_archived).length;
          const isEditing = editingStage?.id === stage.id;

          return (
            <div
              key={stage.id}
              className={`${taskStyles.stageSection} ${stage.is_archived ? taskStyles.archivedStage : ''}`}
            >
              {isEditing ? (
                <div className={taskStyles.stageEditForm}>
                  <input
                    type="text"
                    value={editingStage.label}
                    onChange={(e) => setEditingStage({ ...editingStage, label: e.target.value })}
                    className={taskStyles.formInput}
                    placeholder="Stage label"
                  />
                  <input
                    type="text"
                    value={editingStage.description}
                    onChange={(e) => setEditingStage({ ...editingStage, description: e.target.value })}
                    className={taskStyles.formInput}
                    placeholder="Description"
                  />
                  <div className={taskStyles.applicabilityGrid}>
                    {WINE_TYPES.map(type => (
                      <label key={type.value} className={taskStyles.applicabilityLabel}>
                        <span>{type.label}:</span>
                        <select
                          value={editingStage.applicability?.[type.value] || 'optional'}
                          onChange={(e) => {
                            const currentApplicability = editingStage.applicability || {
                              red: 'optional' as const,
                              white: 'optional' as const,
                              rose: 'optional' as const,
                              sparkling: 'optional' as const,
                              dessert: 'optional' as const,
                              fortified: 'optional' as const,
                            };
                            setEditingStage({
                              ...editingStage,
                              applicability: {
                                ...currentApplicability,
                                [type.value]: e.target.value as StageApplicability,
                              },
                            });
                          }}
                          className={taskStyles.applicabilitySelect}
                        >
                          <option value="required">Required</option>
                          <option value="optional">Optional</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </label>
                    ))}
                  </div>
                  <div className={taskStyles.formActions}>
                    <button onClick={() => setEditingStage(null)} className={taskStyles.cancelButton}>
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveStage(editingStage)}
                      className={taskStyles.saveButton}
                      disabled={isUpdating === stage.id}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={taskStyles.stageHeader}>
                    <button
                      className={taskStyles.stageExpandButton}
                      onClick={() => toggleStage(stage.value)}
                    >
                      <span className={taskStyles.stageChevron}>
                        {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                      </span>
                      <span className={taskStyles.stageName}>{stage.label}</span>
                      <span className={taskStyles.stageCount}>
                        {enabledCount}/{stageTemplates.filter(t => !t.is_archived).length} tasks
                      </span>
                      {stage.is_archived && (
                        <span className={taskStyles.archivedBadge}>Archived</span>
                      )}
                      {filterWineType !== 'all' && stage.applicability?.[filterWineType] === 'optional' && (
                        <span className={taskStyles.optionalBadge}>Optional Stage</span>
                      )}
                    </button>
                    <div className={taskStyles.stageActions}>
                      <button
                        onClick={() => setEditingStage(stage)}
                        className={taskStyles.iconButton}
                        title="Edit stage"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => handleArchiveStage(stage)}
                        className={taskStyles.iconButton}
                        title={stage.is_archived ? 'Restore stage' : 'Archive stage'}
                        disabled={isUpdating === stage.id}
                      >
                        {stage.is_archived ? <FiRefreshCw /> : <FiArchive />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={taskStyles.stageContent}>
                      {stage.description && (
                        <p className={taskStyles.stageDescription}>{stage.description}</p>
                      )}

                      {stageTemplates.length === 0 ? (
                        <div className={taskStyles.emptyState}>
                          No task templates for this stage
                          {filterWineType !== 'all' && ' (with current filter)'}
                        </div>
                      ) : (
                        <div className={taskStyles.taskList}>
                          {stageTemplates.map((template) => {
                            const isTaskEditing = editingTask?.id === template.id;

                            if (isTaskEditing) {
                              return (
                                <div key={template.id} className={taskStyles.taskEditForm}>
                                  <input
                                    type="text"
                                    value={editingTask.name}
                                    onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                                    className={taskStyles.formInput}
                                    placeholder="Task name"
                                  />
                                  <textarea
                                    value={editingTask.description}
                                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                    className={taskStyles.formTextarea}
                                    placeholder="Description"
                                  />
                                  <div className={taskStyles.formRow}>
                                    <select
                                      value={editingTask.wine_type}
                                      onChange={(e) => setEditingTask({ ...editingTask, wine_type: e.target.value })}
                                      className={taskStyles.formSelect}
                                    >
                                      <option value="">All wine types</option>
                                      {WINE_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                      ))}
                                    </select>
                                    <select
                                      value={editingTask.frequency}
                                      onChange={(e) => setEditingTask({ ...editingTask, frequency: e.target.value })}
                                      className={taskStyles.formSelect}
                                    >
                                      {FREQUENCY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                    {editingTask.frequency !== 'once' && (
                                      <input
                                        type="number"
                                        min="1"
                                        value={editingTask.frequency_count}
                                        onChange={(e) => setEditingTask({ ...editingTask, frequency_count: parseInt(e.target.value) || 1 })}
                                        className={taskStyles.formInputSmall}
                                      />
                                    )}
                                  </div>
                                  <div className={taskStyles.formActions}>
                                    <button onClick={() => setEditingTask(null)} className={taskStyles.cancelButton}>
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleSaveTask(editingTask)}
                                      className={taskStyles.saveButton}
                                      disabled={isUpdating === template.id}
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            const taskSupplies = suppliesByTaskTemplate.get(template.id) || [];
                            const isSuppliesExpanded = expandedTaskForSupplies === template.id;

                            return (
                              <div key={template.id} className={taskStyles.taskItemWrapper}>
                                <div
                                  className={`${taskStyles.taskItem} ${!template.default_enabled ? taskStyles.taskDisabled : ''} ${template.is_archived ? taskStyles.taskArchived : ''}`}
                                >
                                  <button
                                    className={`${taskStyles.toggleButton} ${template.default_enabled ? taskStyles.toggleEnabled : taskStyles.toggleDisabled}`}
                                    onClick={() => handleToggleEnabled(template)}
                                    disabled={isUpdating === template.id}
                                    title={template.default_enabled ? 'Disable task' : 'Enable task'}
                                  >
                                    {template.default_enabled ? <FiCheck /> : <FiX />}
                                  </button>

                                  <div className={taskStyles.taskInfo}>
                                    <div className={taskStyles.taskName}>
                                      {template.name}
                                      {template.wine_type && (
                                        <span className={taskStyles.wineTypeBadge}>
                                          {WINE_TYPES.find(t => t.value === template.wine_type)?.label || template.wine_type}
                                        </span>
                                      )}
                                      {template.is_archived && (
                                        <span className={taskStyles.archivedBadge}>Archived</span>
                                      )}
                                    </div>
                                    {template.description && (
                                      <div className={taskStyles.taskDescription}>
                                        {template.description}
                                      </div>
                                    )}
                                  </div>

                                  <div className={taskStyles.taskFrequency}>
                                    {formatFrequency(template)}
                                  </div>

                                  <div className={taskStyles.taskActions}>
                                    <button
                                      onClick={() => toggleTaskSupplies(template.id)}
                                      className={`${taskStyles.iconButton} ${taskSupplies.length > 0 ? taskStyles.hasSupplies : ''}`}
                                      title={`Supplies (${taskSupplies.length})`}
                                    >
                                      <FiPackage />
                                      {taskSupplies.length > 0 && (
                                        <span className={taskStyles.supplyCount}>{taskSupplies.length}</span>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setEditingTask(template)}
                                      className={taskStyles.iconButton}
                                      title="Edit task"
                                    >
                                      <FiEdit2 />
                                    </button>
                                    <button
                                      onClick={() => handleArchiveTask(template)}
                                      className={taskStyles.iconButton}
                                      title={template.is_archived ? 'Restore task' : 'Archive task'}
                                      disabled={isUpdating === template.id}
                                    >
                                      {template.is_archived ? <FiRefreshCw /> : <FiTrash2 />}
                                    </button>
                                  </div>
                                </div>

                                {/* Supplies section */}
                                {isSuppliesExpanded && (
                                  <div className={taskStyles.suppliesSection}>
                                    <div className={taskStyles.suppliesHeader}>
                                      <FiPackage /> Supplies for this task
                                    </div>

                                    {taskSupplies.length === 0 && addingSupplyToTask !== template.id && (
                                      <div className={taskStyles.noSupplies}>
                                        No supplies configured
                                      </div>
                                    )}

                                    {taskSupplies.map((supply) => {
                                      const isEditingThisSupply = editingSupply?.id === supply.id;

                                      if (isEditingThisSupply) {
                                        return (
                                          <div key={supply.id} className={taskStyles.supplyEditForm}>
                                            <input
                                              type="text"
                                              value={editingSupply.name}
                                              onChange={(e) => setEditingSupply({ ...editingSupply, name: e.target.value })}
                                              className={taskStyles.formInput}
                                              placeholder="Supply name"
                                            />
                                            <div className={taskStyles.formRow}>
                                              <input
                                                type="text"
                                                value={editingSupply.quantity_formula || ''}
                                                onChange={(e) => setEditingSupply({ ...editingSupply, quantity_formula: e.target.value || null })}
                                                className={taskStyles.formInput}
                                                placeholder="Quantity formula (e.g., 1 per 30 lbs)"
                                              />
                                              <input
                                                type="number"
                                                min="1"
                                                value={editingSupply.quantity_fixed}
                                                onChange={(e) => setEditingSupply({ ...editingSupply, quantity_fixed: parseInt(e.target.value) || 1 })}
                                                className={taskStyles.formInputSmall}
                                                title="Fixed quantity"
                                              />
                                              <input
                                                type="number"
                                                min="0"
                                                value={editingSupply.lead_time_days}
                                                onChange={(e) => setEditingSupply({ ...editingSupply, lead_time_days: parseInt(e.target.value) || 0 })}
                                                className={taskStyles.formInputSmall}
                                                title="Lead time (days)"
                                              />
                                            </div>
                                            <input
                                              type="text"
                                              value={editingSupply.notes}
                                              onChange={(e) => setEditingSupply({ ...editingSupply, notes: e.target.value })}
                                              className={taskStyles.formInput}
                                              placeholder="Notes (optional)"
                                            />
                                            <div className={taskStyles.formActions}>
                                              <button onClick={() => setEditingSupply(null)} className={taskStyles.cancelButton}>
                                                Cancel
                                              </button>
                                              <button
                                                onClick={() => handleSaveSupply(editingSupply)}
                                                className={taskStyles.saveButton}
                                                disabled={isUpdating === supply.id}
                                              >
                                                Save
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      }

                                      return (
                                        <div
                                          key={supply.id}
                                          className={`${taskStyles.supplyItem} ${supply.is_archived ? taskStyles.supplyArchived : ''}`}
                                        >
                                          <div className={taskStyles.supplyInfo}>
                                            <span className={taskStyles.supplyName}>
                                              {supply.name}
                                              {supply.is_archived && (
                                                <span className={taskStyles.archivedBadge}>Archived</span>
                                              )}
                                            </span>
                                            <span className={taskStyles.supplyDetails}>
                                              {supply.quantity_formula || `${supply.quantity_fixed} needed`}
                                              <span className={taskStyles.leadTime}>{supply.lead_time_days}d lead</span>
                                            </span>
                                          </div>
                                          <div className={taskStyles.supplyActions}>
                                            <button
                                              onClick={() => setEditingSupply(supply)}
                                              className={taskStyles.iconButton}
                                              title="Edit supply"
                                            >
                                              <FiEdit2 />
                                            </button>
                                            <button
                                              onClick={() => handleArchiveSupply(supply)}
                                              className={taskStyles.iconButton}
                                              title={supply.is_archived ? 'Restore supply' : 'Archive supply'}
                                              disabled={isUpdating === supply.id}
                                            >
                                              {supply.is_archived ? <FiRefreshCw /> : <FiArchive />}
                                            </button>
                                            <button
                                              onClick={() => handleDeleteSupply(supply)}
                                              className={taskStyles.iconButton}
                                              title="Delete supply"
                                              disabled={isUpdating === supply.id}
                                            >
                                              <FiTrash2 />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Add supply form */}
                                    {addingSupplyToTask === template.id ? (
                                      <div className={taskStyles.addSupplyForm}>
                                        <input
                                          type="text"
                                          placeholder="Supply name"
                                          value={newSupply.name}
                                          onChange={(e) => setNewSupply(prev => ({ ...prev, name: e.target.value }))}
                                          className={taskStyles.formInput}
                                        />
                                        <div className={taskStyles.formRow}>
                                          <input
                                            type="text"
                                            placeholder="Quantity formula (optional)"
                                            value={newSupply.quantity_formula}
                                            onChange={(e) => setNewSupply(prev => ({ ...prev, quantity_formula: e.target.value }))}
                                            className={taskStyles.formInput}
                                          />
                                          <input
                                            type="number"
                                            min="1"
                                            value={newSupply.quantity_fixed}
                                            onChange={(e) => setNewSupply(prev => ({ ...prev, quantity_fixed: parseInt(e.target.value) || 1 }))}
                                            className={taskStyles.formInputSmall}
                                            placeholder="Qty"
                                            title="Fixed quantity"
                                          />
                                          <input
                                            type="number"
                                            min="0"
                                            value={newSupply.lead_time_days}
                                            onChange={(e) => setNewSupply(prev => ({ ...prev, lead_time_days: parseInt(e.target.value) || 0 }))}
                                            className={taskStyles.formInputSmall}
                                            placeholder="Days"
                                            title="Lead time (days)"
                                          />
                                        </div>
                                        <input
                                          type="text"
                                          placeholder="Notes (optional)"
                                          value={newSupply.notes}
                                          onChange={(e) => setNewSupply(prev => ({ ...prev, notes: e.target.value }))}
                                          className={taskStyles.formInput}
                                        />
                                        <div className={taskStyles.formActions}>
                                          <button onClick={() => setAddingSupplyToTask(null)} className={taskStyles.cancelButton}>
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleAddSupply(template.id)}
                                            className={taskStyles.saveButton}
                                            disabled={!newSupply.name || isUpdating === 'new-supply'}
                                          >
                                            Add Supply
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        className={taskStyles.addSupplyButton}
                                        onClick={() => setAddingSupplyToTask(template.id)}
                                      >
                                        <FiPlus /> Add Supply
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add task form */}
                      {addingTaskToStage === stage.value ? (
                        <div className={taskStyles.addTaskForm}>
                          <input
                            type="text"
                            placeholder="Task name"
                            value={newTask.name}
                            onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                            className={taskStyles.formInput}
                          />
                          <textarea
                            placeholder="Description (optional)"
                            value={newTask.description}
                            onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                            className={taskStyles.formTextarea}
                          />
                          <div className={taskStyles.formRow}>
                            <select
                              value={newTask.wine_type}
                              onChange={(e) => setNewTask(prev => ({ ...prev, wine_type: e.target.value }))}
                              className={taskStyles.formSelect}
                            >
                              <option value="">All wine types</option>
                              {WINE_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                            <select
                              value={newTask.frequency}
                              onChange={(e) => setNewTask(prev => ({ ...prev, frequency: e.target.value }))}
                              className={taskStyles.formSelect}
                            >
                              {FREQUENCY_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            {newTask.frequency !== 'once' && (
                              <input
                                type="number"
                                min="1"
                                value={newTask.frequency_count}
                                onChange={(e) => setNewTask(prev => ({ ...prev, frequency_count: parseInt(e.target.value) || 1 }))}
                                className={taskStyles.formInputSmall}
                                placeholder="Count"
                              />
                            )}
                          </div>
                          <div className={taskStyles.formActions}>
                            <button onClick={() => setAddingTaskToStage(null)} className={taskStyles.cancelButton}>
                              Cancel
                            </button>
                            <button
                              onClick={() => handleAddTask(stage.value)}
                              className={taskStyles.saveButton}
                              disabled={!newTask.name || isUpdating === 'new-task'}
                            >
                              Add Task
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className={taskStyles.addTaskButton}
                          onClick={() => setAddingTaskToStage(stage.value)}
                        >
                          <FiPlus /> Add Task
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {/* Vineyard Seasonal Tasks */}
      <div className={styles.subsection}>
        <h3 className={styles.subsectionTitle}>Vineyard Seasonal Tasks</h3>
        <p className={styles.subsectionDescription}>
          Configure task templates for vineyard seasonal stages. Tasks are created when a block transitions to each stage.
        </p>

        <div className={taskStyles.stagesContainer}>
          {vineyardStagesList.map((stage) => {
            const stageTemplates = vineyardTemplatesByStage.get(stage.value) || [];
            const isExpanded = expandedVineyardStages.has(stage.value);
            const enabledCount = stageTemplates.filter(t => t.default_enabled && !t.is_archived).length;
            const stageLabel = VINEYARD_STAGE_LABELS[stage.value] || stage.label;

            return (
              <div
                key={stage.id}
                className={`${taskStyles.stageSection} ${stage.is_archived ? taskStyles.archivedStage : ''}`}
              >
                <div className={taskStyles.stageHeader}>
                  <button
                    className={taskStyles.stageExpandButton}
                    onClick={() => toggleVineyardStage(stage.value)}
                  >
                    <span className={taskStyles.stageChevron}>
                      {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                    </span>
                    <span className={taskStyles.stageName}>{stageLabel}</span>
                    <span className={taskStyles.stageCount}>
                      {enabledCount}/{stageTemplates.filter(t => !t.is_archived).length} tasks
                    </span>
                    {stage.is_archived && (
                      <span className={taskStyles.archivedBadge}>Archived</span>
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className={taskStyles.stageContent}>
                    {stage.description && (
                      <p className={taskStyles.stageDescription}>{stage.description}</p>
                    )}

                    {stageTemplates.length === 0 ? (
                      <div className={taskStyles.emptyState}>
                        No task templates for this stage
                      </div>
                    ) : (
                      <div className={taskStyles.taskList}>
                        {stageTemplates.map((template) => {
                          const taskSupplies = suppliesByTaskTemplate.get(template.id) || [];
                          const isSuppliesExpanded = expandedTaskForSupplies === template.id;

                          return (
                            <div key={template.id} className={taskStyles.taskItemWrapper}>
                              <div
                                className={`${taskStyles.taskItem} ${!template.default_enabled ? taskStyles.taskDisabled : ''} ${template.is_archived ? taskStyles.taskArchived : ''}`}
                              >
                                <button
                                  className={`${taskStyles.toggleButton} ${template.default_enabled ? taskStyles.toggleEnabled : taskStyles.toggleDisabled}`}
                                  onClick={() => handleToggleEnabled(template)}
                                  disabled={isUpdating === template.id}
                                  title={template.default_enabled ? 'Disable task' : 'Enable task'}
                                >
                                  {template.default_enabled ? <FiCheck /> : <FiX />}
                                </button>

                                <div className={taskStyles.taskInfo}>
                                  <div className={taskStyles.taskName}>
                                    {template.name}
                                    {template.is_archived && (
                                      <span className={taskStyles.archivedBadge}>Archived</span>
                                    )}
                                  </div>
                                  {template.description && (
                                    <div className={taskStyles.taskDescription}>
                                      {template.description}
                                    </div>
                                  )}
                                </div>

                                <div className={taskStyles.taskFrequency}>
                                  {formatFrequency(template)}
                                </div>

                                <div className={taskStyles.taskActions}>
                                  <button
                                    onClick={() => toggleTaskSupplies(template.id)}
                                    className={`${taskStyles.iconButton} ${taskSupplies.length > 0 ? taskStyles.hasSupplies : ''}`}
                                    title={`Supplies (${taskSupplies.length})`}
                                  >
                                    <FiPackage />
                                    {taskSupplies.length > 0 && (
                                      <span className={taskStyles.supplyCount}>{taskSupplies.length}</span>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setEditingTask(template)}
                                    className={taskStyles.iconButton}
                                    title="Edit task"
                                  >
                                    <FiEdit2 />
                                  </button>
                                  <button
                                    onClick={() => handleArchiveTask(template)}
                                    className={taskStyles.iconButton}
                                    title={template.is_archived ? 'Restore task' : 'Archive task'}
                                    disabled={isUpdating === template.id}
                                  >
                                    {template.is_archived ? <FiRefreshCw /> : <FiTrash2 />}
                                  </button>
                                </div>
                              </div>

                              {/* Supplies section for vineyard tasks */}
                              {isSuppliesExpanded && (
                                <div className={taskStyles.suppliesSection}>
                                  <div className={taskStyles.suppliesHeader}>
                                    <FiPackage /> Supplies for this task
                                  </div>

                                  {taskSupplies.length === 0 && addingSupplyToTask !== template.id && (
                                    <div className={taskStyles.noSupplies}>
                                      No supplies configured
                                    </div>
                                  )}

                                  {taskSupplies.map((supply) => (
                                    <div
                                      key={supply.id}
                                      className={`${taskStyles.supplyItem} ${supply.is_archived ? taskStyles.supplyArchived : ''}`}
                                    >
                                      <div className={taskStyles.supplyInfo}>
                                        <span className={taskStyles.supplyName}>
                                          {supply.name}
                                          {supply.is_archived && (
                                            <span className={taskStyles.archivedBadge}>Archived</span>
                                          )}
                                        </span>
                                        <span className={taskStyles.supplyDetails}>
                                          {supply.quantity_formula || `${supply.quantity_fixed} needed`}
                                          <span className={taskStyles.leadTime}>{supply.lead_time_days}d lead</span>
                                        </span>
                                      </div>
                                      <div className={taskStyles.supplyActions}>
                                        <button
                                          onClick={() => setEditingSupply(supply)}
                                          className={taskStyles.iconButton}
                                          title="Edit supply"
                                        >
                                          <FiEdit2 />
                                        </button>
                                        <button
                                          onClick={() => handleArchiveSupply(supply)}
                                          className={taskStyles.iconButton}
                                          title={supply.is_archived ? 'Restore supply' : 'Archive supply'}
                                          disabled={isUpdating === supply.id}
                                        >
                                          {supply.is_archived ? <FiRefreshCw /> : <FiArchive />}
                                        </button>
                                      </div>
                                    </div>
                                  ))}

                                  <button
                                    className={taskStyles.addSupplyButton}
                                    onClick={() => setAddingSupplyToTask(template.id)}
                                  >
                                    <FiPlus /> Add Supply
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add task to vineyard stage */}
                    {addingTaskToStage === stage.value ? (
                      <div className={taskStyles.addTaskForm}>
                        <input
                          type="text"
                          placeholder="Task name"
                          value={newTask.name}
                          onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                          className={taskStyles.formInput}
                        />
                        <textarea
                          placeholder="Description (optional)"
                          value={newTask.description}
                          onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                          className={taskStyles.formTextarea}
                        />
                        <div className={taskStyles.formRow}>
                          <select
                            value={newTask.frequency}
                            onChange={(e) => setNewTask(prev => ({ ...prev, frequency: e.target.value }))}
                            className={taskStyles.formSelect}
                          >
                            {FREQUENCY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {newTask.frequency !== 'once' && (
                            <input
                              type="number"
                              min="1"
                              value={newTask.frequency_count}
                              onChange={(e) => setNewTask(prev => ({ ...prev, frequency_count: parseInt(e.target.value) || 1 }))}
                              className={taskStyles.formInputSmall}
                              placeholder="Count"
                            />
                          )}
                        </div>
                        <div className={taskStyles.formActions}>
                          <button onClick={() => setAddingTaskToStage(null)} className={taskStyles.cancelButton}>
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (!newTask.name) return;
                              setIsUpdating('new-task');
                              try {
                                const stageTasks = vineyardTemplatesByStage.get(stage.value) || [];
                                const maxOrder = Math.max(...stageTasks.map(t => t.sort_order), 0);
                                await zero.mutate.task_template.insert({
                                  id: generateId('vtt'),
                                  user_id: user?.id || '',
                                  vineyard_id: 'default',
                                  stage: stage.value,
                                  entity_type: 'block',
                                  wine_type: '',
                                  name: newTask.name,
                                  description: newTask.description,
                                  frequency: newTask.frequency,
                                  frequency_count: newTask.frequency_count,
                                  frequency_unit: newTask.frequency === 'once' ? '' : newTask.frequency.replace('ly', 's'),
                                  default_enabled: true,
                                  is_archived: false,
                                  sort_order: maxOrder + 1,
                                  created_at: Date.now(),
                                  updated_at: Date.now(),
                                });
                                setNewTask({ name: '', description: '', wine_type: '', frequency: 'once', frequency_count: 1 });
                                setAddingTaskToStage(null);
                              } catch (err) {
                                console.error('Failed to add vineyard task:', err);
                              } finally {
                                setIsUpdating(null);
                              }
                            }}
                            className={taskStyles.saveButton}
                            disabled={!newTask.name || isUpdating === 'new-task'}
                          >
                            Add Task
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className={taskStyles.addTaskButton}
                        onClick={() => setAddingTaskToStage(stage.value)}
                      >
                        <FiPlus /> Add Task
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* General Tasks */}
      <div className={styles.subsection}>
        <h3 className={styles.subsectionTitle}>General Tasks</h3>
        <p className={styles.subsectionDescription}>
          Create recurring or one-time tasks not tied to any specific stage. Can be attached to either the vineyard or winery.
        </p>

        <div className={taskStyles.stagesContainer}>
          {(['vineyard', 'winery'] as const).map((scope) => {
            const scopeTemplates = generalTasksByScope.get(scope) || [];
            const isExpanded = expandedGeneralScopes.has(scope);
            const enabledCount = scopeTemplates.filter(t => t.is_enabled && !t.is_archived).length;
            const scopeLabel = scope === 'vineyard' ? 'Vineyard Tasks' : 'Winery Tasks';
            const scopeDescription = scope === 'vineyard'
              ? 'General tasks for vineyard operations and maintenance'
              : 'General tasks for winery operations and maintenance';

            return (
              <div key={scope} className={taskStyles.stageSection}>
                <div className={taskStyles.stageHeader}>
                  <button
                    className={taskStyles.stageExpandButton}
                    onClick={() => toggleGeneralScope(scope)}
                  >
                    <span className={taskStyles.stageChevron}>
                      {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                    </span>
                    <span className={taskStyles.stageName}>{scopeLabel}</span>
                    <span className={taskStyles.stageCount}>
                      {enabledCount}/{scopeTemplates.filter(t => !t.is_archived).length} tasks
                    </span>
                  </button>
                </div>

                {isExpanded && (
                  <div className={taskStyles.stageContent}>
                    <p className={taskStyles.stageDescription}>{scopeDescription}</p>

                    {scopeTemplates.length === 0 ? (
                      <div className={taskStyles.emptyState}>
                        No general tasks configured for {scope}
                      </div>
                    ) : (
                      <div className={taskStyles.taskList}>
                        {scopeTemplates.map((template) => {
                          const isTaskEditing = editingGeneralTask?.id === template.id;

                          if (isTaskEditing) {
                            return (
                              <div key={template.id} className={taskStyles.taskEditForm}>
                                <input
                                  type="text"
                                  value={editingGeneralTask.name}
                                  onChange={(e) => setEditingGeneralTask({ ...editingGeneralTask, name: e.target.value })}
                                  className={taskStyles.formInput}
                                  placeholder="Task name"
                                />
                                <textarea
                                  value={editingGeneralTask.description}
                                  onChange={(e) => setEditingGeneralTask({ ...editingGeneralTask, description: e.target.value })}
                                  className={taskStyles.formTextarea}
                                  placeholder="Description"
                                />
                                <div className={taskStyles.formRow}>
                                  <select
                                    value={editingGeneralTask.frequency}
                                    onChange={(e) => setEditingGeneralTask({ ...editingGeneralTask, frequency: e.target.value })}
                                    className={taskStyles.formSelect}
                                  >
                                    {FREQUENCY_OPTIONS.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                    <option value="biweekly">Biweekly</option>
                                  </select>
                                  {editingGeneralTask.frequency !== 'once' && editingGeneralTask.frequency !== 'biweekly' && (
                                    <input
                                      type="number"
                                      min="1"
                                      value={editingGeneralTask.frequency_count}
                                      onChange={(e) => setEditingGeneralTask({ ...editingGeneralTask, frequency_count: parseInt(e.target.value) || 1 })}
                                      className={taskStyles.formInputSmall}
                                    />
                                  )}
                                </div>
                                <div className={taskStyles.formActions}>
                                  <button onClick={() => setEditingGeneralTask(null)} className={taskStyles.cancelButton}>
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveGeneralTask(editingGeneralTask)}
                                    className={taskStyles.saveButton}
                                    disabled={isUpdating === template.id}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={template.id}
                              className={`${taskStyles.taskItem} ${!template.is_enabled ? taskStyles.taskDisabled : ''} ${template.is_archived ? taskStyles.taskArchived : ''}`}
                            >
                              <button
                                className={`${taskStyles.toggleButton} ${template.is_enabled ? taskStyles.toggleEnabled : taskStyles.toggleDisabled}`}
                                onClick={() => handleToggleGeneralTaskEnabled(template)}
                                disabled={isUpdating === template.id}
                                title={template.is_enabled ? 'Disable task' : 'Enable task'}
                              >
                                {template.is_enabled ? <FiCheck /> : <FiX />}
                              </button>

                              <div className={taskStyles.taskInfo}>
                                <div className={taskStyles.taskName}>
                                  {template.name}
                                  {template.is_archived && (
                                    <span className={taskStyles.archivedBadge}>Archived</span>
                                  )}
                                </div>
                                {template.description && (
                                  <div className={taskStyles.taskDescription}>
                                    {template.description}
                                  </div>
                                )}
                              </div>

                              <div className={taskStyles.taskFrequency}>
                                {formatGeneralTaskFrequency(template)}
                              </div>

                              <div className={taskStyles.taskActions}>
                                <button
                                  onClick={() => setEditingGeneralTask(template)}
                                  className={taskStyles.iconButton}
                                  title="Edit task"
                                >
                                  <FiEdit2 />
                                </button>
                                <button
                                  onClick={() => handleArchiveGeneralTask(template)}
                                  className={taskStyles.iconButton}
                                  title={template.is_archived ? 'Restore task' : 'Archive task'}
                                  disabled={isUpdating === template.id}
                                >
                                  {template.is_archived ? <FiRefreshCw /> : <FiTrash2 />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add general task form */}
                    {addingGeneralTaskScope === scope ? (
                      <div className={taskStyles.addTaskForm}>
                        <input
                          type="text"
                          placeholder="Task name"
                          value={newGeneralTask.name}
                          onChange={(e) => setNewGeneralTask(prev => ({ ...prev, name: e.target.value }))}
                          className={taskStyles.formInput}
                        />
                        <textarea
                          placeholder="Description (optional)"
                          value={newGeneralTask.description}
                          onChange={(e) => setNewGeneralTask(prev => ({ ...prev, description: e.target.value }))}
                          className={taskStyles.formTextarea}
                        />
                        <div className={taskStyles.formRow}>
                          <select
                            value={newGeneralTask.frequency}
                            onChange={(e) => setNewGeneralTask(prev => ({ ...prev, frequency: e.target.value }))}
                            className={taskStyles.formSelect}
                          >
                            {FREQUENCY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                            <option value="biweekly">Biweekly</option>
                          </select>
                          {newGeneralTask.frequency !== 'once' && newGeneralTask.frequency !== 'biweekly' && (
                            <input
                              type="number"
                              min="1"
                              value={newGeneralTask.frequency_count}
                              onChange={(e) => setNewGeneralTask(prev => ({ ...prev, frequency_count: parseInt(e.target.value) || 1 }))}
                              className={taskStyles.formInputSmall}
                              placeholder="Count"
                            />
                          )}
                        </div>
                        <div className={taskStyles.formActions}>
                          <button onClick={() => setAddingGeneralTaskScope(null)} className={taskStyles.cancelButton}>
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAddGeneralTask(scope)}
                            className={taskStyles.saveButton}
                            disabled={!newGeneralTask.name || isUpdating === 'new-general-task'}
                          >
                            Add Task
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className={taskStyles.addTaskButton}
                        onClick={() => setAddingGeneralTaskScope(scope)}
                      >
                        <FiPlus /> Add Task
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
