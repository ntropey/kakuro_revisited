import { describe, expect, it } from 'vitest';
import { formatElapsed, levelName, todayString } from '../src/ui';

describe('Formatting', () => {
  it('shows a clock as m:ss and h:mm:ss', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(1_999)).toBe('0:01');
    expect(formatElapsed(65_000)).toBe('1:05');
    expect(formatElapsed(600_000)).toBe('10:00');
    expect(formatElapsed(3_723_000)).toBe('1:02:03');
    expect(formatElapsed(-5)).toBe('0:00');
  });

  it('names levels and dates', () => {
    expect(levelName(1)).toBe('Trivial');
    expect(levelName(9)).toBe('Extreme');
    expect(todayString(new Date(2026, 9, 21))).toBe('2026-10-21');
  });
});
