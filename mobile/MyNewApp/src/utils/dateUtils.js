// Date utility functions for consistent date handling across the app

/**
 * Convert any date format to ISO format (YYYY-MM-DD)
 * @param {string|Date} date - Date in any format
 * @returns {string} - Date in YYYY-MM-DD format
 */
export const toISODate = (date) => {
  if (!date) return '';
  
  // If it's already in ISO format, return as is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // If it's a French date format like "17 oct. 2025", convert it
  if (typeof date === 'string' && date.includes('oct.')) {
    const dateObj = new Date(date);
    return dateObj.toISOString().split('T')[0];
  }
  
  // For any other format, try to parse it
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date format:', date);
    return '';
  }
  
  return dateObj.toISOString().split('T')[0];
};

/**
 * Convert ISO date to French display format
 * @param {string} isoDate - Date in YYYY-MM-DD format
 * @returns {string} - Date in French format like "17 oct. 2025"
 */
export const toFrenchDate = (isoDate) => {
  if (!isoDate) return 'Non défini';
  
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) {
    console.warn('Invalid ISO date:', isoDate);
    return 'Date invalide';
  }
  
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Get today's date in ISO format
 * @returns {string} - Today's date in YYYY-MM-DD format
 */
export const getTodayISO = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Get current date and time in ISO format
 * @returns {string} - Current date and time in ISO format
 */
export const getNowISO = () => {
  return new Date().toISOString();
};

/**
 * Check if a date is in the future
 * @param {string} isoDate - Date in YYYY-MM-DD format
 * @returns {boolean} - True if date is in the future
 */
export const isFutureDate = (isoDate) => {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
};

/**
 * Check if a date is today
 * @param {string} isoDate - Date in YYYY-MM-DD format
 * @returns {boolean} - True if date is today
 */
export const isToday = (isoDate) => {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Format date for calendar display
 * @param {string} isoDate - Date in YYYY-MM-DD format
 * @returns {string} - Formatted date for calendar
 */
export const formatForCalendar = (isoDate) => {
  if (!isoDate) return '';
  
  const date = new Date(isoDate);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
