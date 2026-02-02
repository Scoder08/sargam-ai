/**
 * Formatting Utilities
 * 
 * Platform-agnostic formatting functions.
 */

import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

/**
 * Format a date for display (e.g., "Today", "Yesterday", "Jan 15")
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isToday(d)) {
    return 'Today';
  }
  if (isYesterday(d)) {
    return 'Yesterday';
  }
  return format(d, 'MMM d');
}

/**
 * Format time ago (e.g., "5 minutes ago", "2 hours ago")
 */
export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format duration in seconds to mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration in minutes to human readable
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format a number with commas (e.g., 1,234,567)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-IN'); // Indian number format
}

/**
 * Format price in INR
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format streak for display
 */
export function formatStreak(days: number): string {
  if (days === 0) return 'No streak';
  if (days === 1) return '1 day streak 🔥';
  return `${days} day streak 🔥`;
}

/**
 * Get greeting based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
