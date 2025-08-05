/**
 * Date and Time Utilities for Client-Side Application
 * All times are displayed in Amsterdam timezone (Europe/Amsterdam)
 */

const AMSTERDAM_TIMEZONE = 'Europe/Amsterdam';

/**
 * Format time in Amsterdam timezone (HH:MM format)
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
 * Format date in Amsterdam timezone (DD/MM/YYYY format)
 */
export const formatDateAmsterdam = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('nl-NL', {
    timeZone: AMSTERDAM_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Format full date and time in Amsterdam timezone (DD/MM/YYYY HH:MM format)
 */
export const formatDateTimeAmsterdam = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('nl-NL', {
    timeZone: AMSTERDAM_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get current time in Amsterdam timezone
 */
export const getCurrentTimeAmsterdam = (): string => {
  return formatTimeAmsterdam(new Date());
};

/**
 * Get current date in Amsterdam timezone
 */
export const getCurrentDateAmsterdam = (): string => {
  return formatDateAmsterdam(new Date());
};

/**
 * Get current date and time in Amsterdam timezone
 */
export const getCurrentDateTimeAmsterdam = (): string => {
  return formatDateTimeAmsterdam(new Date());
};

/**
 * Check if a date is today in Amsterdam timezone
 */
export const isTodayAmsterdam = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  const dateInAmsterdam = new Date(dateObj.toLocaleString('en-US', { timeZone: AMSTERDAM_TIMEZONE }));
  const todayInAmsterdam = new Date(today.toLocaleString('en-US', { timeZone: AMSTERDAM_TIMEZONE }));
  
  return dateInAmsterdam.toDateString() === todayInAmsterdam.toDateString();
};

/**
 * Format relative time (e.g., "2 minutes ago") in Amsterdam timezone
 */
export const formatTimeAgoAmsterdam = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // Convert both dates to Amsterdam timezone for comparison
  const dateInAmsterdam = new Date(dateObj.toLocaleString('en-US', { timeZone: AMSTERDAM_TIMEZONE }));
  const nowInAmsterdam = new Date(now.toLocaleString('en-US', { timeZone: AMSTERDAM_TIMEZONE }));
  
  const diffInMinutes = Math.floor((nowInAmsterdam.getTime() - dateInAmsterdam.getTime()) / 1000 / 60);
  
  if (diffInMinutes < 1) return 'zojuist';
  if (diffInMinutes === 1) return '1 minuut geleden';
  if (diffInMinutes < 60) return `${diffInMinutes} minuten geleden`;
  if (diffInMinutes < 120) return '1 uur geleden';
  return `${Math.floor(diffInMinutes / 60)} uur geleden`;
};

/**
 * Create a new Date object representing the current time in Amsterdam timezone
 */
export const nowInAmsterdam = (): Date => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: AMSTERDAM_TIMEZONE }));
};