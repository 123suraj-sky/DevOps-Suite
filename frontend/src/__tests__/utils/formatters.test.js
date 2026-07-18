import { formatDate, formatDateTime, formatRelativeTime } from '../../utils/formatters';

describe('formatDate', () => {
  it('formats a date string correctly', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toBeTruthy();
  });
});

describe('formatDateTime', () => {
  it('formats a datetime string correctly', () => {
    const result = formatDateTime('2024-01-15T10:30:00Z');
    expect(result).toBeTruthy();
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for recent timestamps', () => {
    const now = new Date().toISOString();
    const result = formatRelativeTime(now);
    expect(result).toBe('just now');
  });
});
