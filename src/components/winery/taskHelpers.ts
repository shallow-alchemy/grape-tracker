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

const MIN_VALID_DATE = 946684800000; // Jan 1, 2000

const getStartOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const isOverdue = (dueDate: number | null | undefined, completedAt: number | null | undefined, skipped: number): boolean => {
  if (!dueDate || dueDate < MIN_VALID_DATE) return false;
  if (completedAt || skipped !== 0) return false;

  const today = getStartOfDay(new Date());
  const dueDay = getStartOfDay(new Date(dueDate));

  return dueDay < today;
};

export const isDueToday = (dueDate: number | null | undefined): boolean => {
  if (!dueDate || dueDate < MIN_VALID_DATE) return false;

  const today = new Date();
  const dueDay = new Date(dueDate);

  return dueDay.toDateString() === today.toDateString();
};

export const formatDueDate = (dueDate: number | null | undefined, prefix: string = 'Due'): string => {
  if (!dueDate || dueDate < MIN_VALID_DATE) {
    return 'No due date';
  }

  const date = new Date(dueDate);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const todayStart = getStartOfDay(today);
  const dueDayStart = getStartOfDay(date);
  const isPast = dueDayStart < todayStart;

  if (isPast) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (isToday) {
    return `${prefix} today`;
  }

  if (isTomorrow) {
    return `${prefix} tomorrow`;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
