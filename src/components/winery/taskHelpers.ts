export const calculateDueDate = (
  baseTime: number,
  frequency: string,
  frequencyCount?: number
): number => {
  const count = frequencyCount || 1;

  const MS_PER_DAY = 86400000;
  const MS_PER_HALF_DAY = 43200000;
  const MS_PER_WEEK = 604800000;
  const MS_PER_MONTH = 2592000000;

  switch (frequency) {
    case 'once':
      return baseTime;
    case 'daily':
      return baseTime + (MS_PER_DAY * count);
    case 'twice_daily':
      return baseTime + (MS_PER_HALF_DAY * count);
    case 'weekly':
      return baseTime + (MS_PER_WEEK * count);
    case 'monthly':
      return baseTime + (MS_PER_MONTH * count);
    default:
      return baseTime;
  }
};

export const isOverdue = (dueDate: number, completedAt: number | null, skipped: number): boolean => {
  return dueDate < Date.now() && !completedAt && skipped === 0;
};

export const formatDueDate = (dueDate: number): string => {
  const now = Date.now();
  const diff = dueDate - now;

  if (diff < 0) {
    return 'OVERDUE';
  }

  const date = new Date(dueDate);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) {
    return `Today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  if (isTomorrow) {
    return `Tomorrow ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};
