import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useZero } from '../../contexts/ZeroContext';
import type { EntityType } from './stages';
import { calculateDueDate } from './taskHelpers';

export type StageTransitionData = {
  toStage: string;
  notes: string;
  skipCurrentStage: boolean;
};

export type StageTransitionResult = {
  success: boolean;
  error?: string;
  tasksCreated?: number;
};

/**
 * Custom hook for handling stage transitions
 * Encapsulates the business logic for completing current stage and starting new stage
 */
export const useStageTransition = (entityType: EntityType, entityId: string, wineType?: string) => {
  const { user } = useUser();
  const zero = useZero();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const advanceStage = async (
    currentStage: string,
    data: StageTransitionData
  ): Promise<StageTransitionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const now = Date.now();

      // Step 1: Find and complete the current stage_history entry
      const allStageHistory = await zero.query.stage_history
        .where('entity_type', entityType)
        .where('entity_id', entityId)
        .where('stage', currentStage)
        .run();

      const currentEntry = allStageHistory.find(s => !s.completed_at);
      if (currentEntry) {
        await zero.mutate.stage_history.update({
          id: currentEntry.id,
          completed_at: now,
          skipped: data.skipCurrentStage,
          notes: data.notes,
          updated_at: now,
        });
      }

      // Step 2: Create new stage_history entry for the new stage
      await zero.mutate.stage_history.insert({
        id: crypto.randomUUID(),
        user_id: user!.id,
        entity_type: entityType,
        entity_id: entityId,
        stage: data.toStage,
        started_at: now,
        completed_at: null,
        skipped: false,
        notes: '',
        created_at: now,
        updated_at: now,
      });

      // Step 3: Update the entity's current_stage field
      if (entityType === 'wine') {
        await zero.mutate.wine.update({
          id: entityId,
          current_stage: data.toStage,
          updated_at: now,
        });
      } else if (entityType === 'vintage') {
        await zero.mutate.vintage.update({
          id: entityId,
          current_stage: data.toStage,
          updated_at: now,
        });
      }

      // Step 4: Create tasks from templates
      const allTemplates = await zero.query.task_template.run();

      const relevantTemplates = allTemplates.filter(template => {
        const stageMatch = template.stage === data.toStage;
        const entityMatch = template.entity_type === entityType;
        const wineTypeMatch = !wineType || !template.wine_type || template.wine_type === wineType;
        const enabled = template.default_enabled === true;

        return stageMatch && entityMatch && wineTypeMatch && enabled;
      });

      let tasksCreated = 0;
      for (const template of relevantTemplates) {
        const dueDate = calculateDueDate(now, template.frequency, template.frequency_count);

        await zero.mutate.task.insert({
          id: crypto.randomUUID(),
          user_id: user!.id,
          task_template_id: template.id,
          entity_type: entityType,
          entity_id: entityId,
          stage: data.toStage,
          name: template.name,
          description: template.description,
          due_date: dueDate,
          completed_at: null as any,
          completed_by: '',
          notes: '',
          skipped: false,
          created_at: now,
          updated_at: now,
        });

        tasksCreated++;
      }

      setIsLoading(false);
      return { success: true, tasksCreated };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to transition stage';
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  return {
    advanceStage,
    isLoading,
    error,
  };
};
