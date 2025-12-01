import { useState, useRef, useCallback } from 'react';

type CompletionMutator = (taskId: string) => Promise<void>;

type UseDebouncedCompletionResult = {
  pendingTaskId: string | null;
  removedTaskId: string | null;
  startCompletion: (taskId: string) => void;
  undoCompletion: () => void;
  isPending: (taskId: string) => boolean;
  isRemoved: (taskId: string) => boolean;
};

export const useDebouncedCompletion = (
  onComplete: CompletionMutator,
  delay: number = 2000
): UseDebouncedCompletionResult => {
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [removedTaskId, setRemovedTaskId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startCompletion = useCallback((taskId: string) => {
    setPendingTaskId(taskId);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(async () => {
      await onComplete(taskId);
      setRemovedTaskId(taskId);
      setPendingTaskId(null);
    }, delay);
  }, [onComplete, delay]);

  const undoCompletion = useCallback(() => {
    setPendingTaskId(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const isPending = useCallback((taskId: string) => pendingTaskId === taskId, [pendingTaskId]);
  const isRemoved = useCallback((taskId: string) => removedTaskId === taskId, [removedTaskId]);

  return {
    pendingTaskId,
    removedTaskId,
    startCompletion,
    undoCompletion,
    isPending,
    isRemoved,
  };
};
