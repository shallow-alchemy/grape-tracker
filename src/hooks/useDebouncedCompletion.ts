import { useState, useRef, useCallback } from 'react';

type CompletionMutator = (taskId: string) => Promise<void>;

type UseDebouncedCompletionResult = {
  pendingTaskId: string | null;  // Kept for backwards compat, returns first pending
  removedTaskId: string | null;
  startCompletion: (taskId: string) => void;
  undoCompletion: (taskId: string) => void;
  isPending: (taskId: string) => boolean;
  isRemoved: (taskId: string) => boolean;
};

export const useDebouncedCompletion = (
  onComplete: CompletionMutator,
  delay: number = 5000
): UseDebouncedCompletionResult => {
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [removedTaskIds, setRemovedTaskIds] = useState<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRef = useRef<Set<string>>(new Set());

  const startCompletion = useCallback((taskId: string) => {
    // Add to pending set
    pendingRef.current.add(taskId);
    setPendingTaskIds(new Set(pendingRef.current));

    // Clear existing shared timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Start new shared timer - all pending tasks complete together
    timeoutRef.current = setTimeout(async () => {
      const tasksToComplete = Array.from(pendingRef.current);
      for (const id of tasksToComplete) {
        await onComplete(id);
      }
      setRemovedTaskIds(prev => new Set([...prev, ...tasksToComplete]));
      pendingRef.current.clear();
      setPendingTaskIds(new Set());
      timeoutRef.current = null;
    }, delay);
  }, [onComplete, delay]);

  const undoCompletion = useCallback((taskId: string) => {
    pendingRef.current.delete(taskId);
    setPendingTaskIds(new Set(pendingRef.current));

    // If no more pending tasks, clear the timer
    if (pendingRef.current.size === 0 && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const isPending = useCallback((taskId: string) => pendingTaskIds.has(taskId), [pendingTaskIds]);
  const isRemoved = useCallback((taskId: string) => removedTaskIds.has(taskId), [removedTaskIds]);

  // For backwards compat, return first pending task id
  const pendingTaskId = pendingTaskIds.size > 0 ? Array.from(pendingTaskIds)[0] : null;
  const removedTaskId = removedTaskIds.size > 0 ? Array.from(removedTaskIds)[0] : null;

  return {
    pendingTaskId,
    removedTaskId,
    startCompletion,
    undoCompletion,
    isPending,
    isRemoved,
  };
};
