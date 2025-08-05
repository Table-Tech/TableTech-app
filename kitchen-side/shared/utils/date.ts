/**
 * Date utility functions with Amsterdam timezone support
 */

const AMSTERDAM_TIMEZONE = 'Europe/Amsterdam';

/**
 * Format date to Amsterdam timezone string
 */
export const formatDateAmsterdam = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('nl-NL', {
    timeZone: AMSTERDAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Format time only to Amsterdam timezone
 */
export const formatTimeAmsterdam = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('nl-NL', {
    timeZone: AMSTERDAM_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format date only to Amsterdam timezone
 */
export const formatDateOnlyAmsterdam = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('nl-NL', {
    timeZone: AMSTERDAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * Get current Amsterdam time
 */
export const getNowAmsterdam = (): Date => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: AMSTERDAM_TIMEZONE }));
};

/**
 * Format time ago with Amsterdam timezone
 */
export const formatTimeAgoAmsterdam = (dateString: string): string => {
  const date = new Date(dateString);
  const now = getNowAmsterdam();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
  
  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes === 1) return '1 min ago';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  if (diffInMinutes < 120) return '1 hour ago';
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
  if (diffInMinutes < 2880) return '1 day ago';
  return `${Math.floor(diffInMinutes / 1440)} days ago`;
};

/**
 * Convert UTC date to Amsterdam date object
 */
export const toAmsterdamDate = (utcDate: Date | string): Date => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.toLocaleString("en-US", { timeZone: AMSTERDAM_TIMEZONE }));
};

/**
 * Format date for display in Amsterdam timezone
 */
export const formatDisplayDateAmsterdam = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = getNowAmsterdam();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  
  const diffInDays = Math.floor((today.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return `Today at ${formatTimeAmsterdam(dateObj)}`;
  } else if (diffInDays === 1) {
    return `Yesterday at ${formatTimeAmsterdam(dateObj)}`;
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago at ${formatTimeAmsterdam(dateObj)}`;
  } else {
    return formatDateAmsterdam(dateObj);
  }
};