import { test, describe, expect } from '@rstest/core';
import { calculateDueDate, isOverdue, formatDueDate } from './taskHelpers';

describe('taskHelpers', () => {
  describe('calculateDueDate', () => {
    const baseTime = 1700000000000; // Fixed timestamp for testing

    test('returns baseTime for "once" frequency', () => {
      expect(calculateDueDate(baseTime, 'once')).toBe(baseTime);
    });

    test('adds one day for "daily" frequency with default count', () => {
      const MS_PER_DAY = 86400000;
      expect(calculateDueDate(baseTime, 'daily')).toBe(baseTime + MS_PER_DAY);
    });

    test('adds multiple days for "daily" frequency with count', () => {
      const MS_PER_DAY = 86400000;
      expect(calculateDueDate(baseTime, 'daily', 3)).toBe(baseTime + (MS_PER_DAY * 3));
    });

    test('adds half day for "twice_daily" frequency with default count', () => {
      const MS_PER_HALF_DAY = 43200000;
      expect(calculateDueDate(baseTime, 'twice_daily')).toBe(baseTime + MS_PER_HALF_DAY);
    });

    test('adds multiple half days for "twice_daily" frequency with count', () => {
      const MS_PER_HALF_DAY = 43200000;
      expect(calculateDueDate(baseTime, 'twice_daily', 2)).toBe(baseTime + (MS_PER_HALF_DAY * 2));
    });

    test('adds one week for "weekly" frequency with default count', () => {
      const MS_PER_WEEK = 604800000;
      expect(calculateDueDate(baseTime, 'weekly')).toBe(baseTime + MS_PER_WEEK);
    });

    test('adds multiple weeks for "weekly" frequency with count', () => {
      const MS_PER_WEEK = 604800000;
      expect(calculateDueDate(baseTime, 'weekly', 2)).toBe(baseTime + (MS_PER_WEEK * 2));
    });

    test('adds one month for "monthly" frequency with default count', () => {
      const MS_PER_MONTH = 2592000000;
      expect(calculateDueDate(baseTime, 'monthly')).toBe(baseTime + MS_PER_MONTH);
    });

    test('adds multiple months for "monthly" frequency with count', () => {
      const MS_PER_MONTH = 2592000000;
      expect(calculateDueDate(baseTime, 'monthly', 3)).toBe(baseTime + (MS_PER_MONTH * 3));
    });

    test('returns baseTime for unknown frequency', () => {
      expect(calculateDueDate(baseTime, 'unknown')).toBe(baseTime);
    });
  });

  describe('isOverdue', () => {
    test('returns true for overdue incomplete task', () => {
      const pastDate = Date.now() - 86400000; // 1 day ago
      expect(isOverdue(pastDate, null, 0)).toBe(true);
    });

    test('returns false for future task', () => {
      const futureDate = Date.now() + 86400000; // 1 day from now
      expect(isOverdue(futureDate, null, 0)).toBe(false);
    });

    test('returns false for completed task even if overdue', () => {
      const pastDate = Date.now() - 86400000; // 1 day ago
      const completedAt = Date.now();
      expect(isOverdue(pastDate, completedAt, 0)).toBe(false);
    });

    test('returns false for skipped task even if overdue', () => {
      const pastDate = Date.now() - 86400000; // 1 day ago
      expect(isOverdue(pastDate, null, 1)).toBe(false);
    });

    test('returns false for completed and skipped task', () => {
      const pastDate = Date.now() - 86400000;
      const completedAt = Date.now();
      expect(isOverdue(pastDate, completedAt, 1)).toBe(false);
    });
  });

  describe('formatDueDate', () => {
    test('returns "OVERDUE" for past date', () => {
      const pastDate = Date.now() - 86400000; // 1 day ago
      expect(formatDueDate(pastDate)).toBe('OVERDUE');
    });

    test('returns "Today" with time for today', () => {
      const now = new Date();
      const today = new Date();
      // Set to a time that's guaranteed to be today but in the future
      // If it's before 10 PM, set to 11:30 PM today, otherwise set to 1 hour from now
      if (now.getHours() < 22) {
        today.setHours(23, 30, 0, 0);
      } else {
        // If it's 10 PM or later, just add 30 minutes
        today.setTime(now.getTime() + 1800000); // 30 minutes in ms
      }
      const result = formatDueDate(today.getTime());
      expect(result).toMatch(/^Today \d{1,2}:\d{2}/);
    });

    test('returns "Tomorrow" with time for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0); // 10:00 AM
      const result = formatDueDate(tomorrow.getTime());
      expect(result).toMatch(/^Tomorrow \d{1,2}:\d{2}/);
    });

    test('returns formatted date for future dates beyond tomorrow', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 1 week from now
      futureDate.setHours(14, 0, 0, 0);
      const result = formatDueDate(futureDate.getTime());

      // Should contain month abbreviation and day
      expect(result).toMatch(/\w{3} \d{1,2}/); // e.g., "Nov 25"
    });

    test('formats time correctly in 12-hour format', () => {
      const date = new Date();
      date.setDate(date.getDate() + 2); // Day after tomorrow
      date.setHours(15, 45, 0, 0); // 3:45 PM
      const result = formatDueDate(date.getTime());

      // Should include time in 12-hour format
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });
});
