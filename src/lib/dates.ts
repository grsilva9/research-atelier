import { formatDistanceToNow, differenceInDays, parseISO, format } from 'date-fns';

export const now = (): string => new Date().toISOString();

export const relativeTime = (iso: string): string => {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return 'unknown';
  }
};

export const daysSince = (iso: string): number => {
  try {
    return differenceInDays(new Date(), parseISO(iso));
  } catch {
    return 0;
  }
};

export const formatDate = (iso: string, pattern = 'MMM d, yyyy'): string => {
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return iso;
  }
};

export const isOverdue = (deadlineIso?: string): boolean => {
  if (!deadlineIso) return false;
  try {
    return differenceInDays(parseISO(deadlineIso), new Date()) < 0;
  } catch {
    return false;
  }
};

export const daysUntil = (deadlineIso?: string): number | null => {
  if (!deadlineIso) return null;
  try {
    return differenceInDays(parseISO(deadlineIso), new Date());
  } catch {
    return null;
  }
};
