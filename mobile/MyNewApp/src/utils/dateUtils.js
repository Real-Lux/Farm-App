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

/**
 * Calculate estimated hatching/birth date based on species and incubation start date
 * @param {string} species - Species name (poussins, cailles, canards, oies, dindes, lapins, chèvres, brebis)
 * @param {string} race - Race name (for special cases like barbaries ducks)
 * @param {string} incubationStartDate - Start date in ISO format (YYYY-MM-DD)
 * @returns {object} - Object with { estimatedDate, minDate, maxDate }
 */
export const calculateEstimatedHatchingDate = (species, race, incubationStartDate) => {
  if (!incubationStartDate) return { estimatedDate: null, minDate: null, maxDate: null };

  const startDate = new Date(incubationStartDate);
  if (isNaN(startDate.getTime())) return { estimatedDate: null, minDate: null, maxDate: null };

  let days = 0;
  let variance = 0;

  switch (species) {
    case 'poussins':
      days = 21;
      variance = 2;
      break;
    case 'cailles':
      days = 17;
      variance = 2;
      break;
    case 'canards':
      // Special case for barbaries
      if (race && race.toLowerCase().includes('barbarie')) {
        days = 35;
        variance = 2;
      } else {
        days = 28;
        variance = 2;
      }
      break;
    case 'oies':
      days = 30;
      // Oies: 30 jours - 2 jours et jusqu'à + 5 jours
      variance = { min: 2, max: 5 };
      break;
    case 'dindes':
      days = 28;
      variance = 2;
      break;
    case 'lapins':
      days = 30;
      variance = 2;
      break;
    case 'chèvres':
    case 'brebis':
      // 5 months = approximately 150 days
      days = 150;
      variance = 7; // ±1 week
      break;
    default:
      days = 21;
      variance = 2;
  }

  // Calculate estimated date
  const estimatedDate = new Date(startDate);
  estimatedDate.setDate(startDate.getDate() + days);

  // Calculate min and max dates
  let minDate, maxDate;
  if (species === 'oies') {
    // Oies: 30 jours - 2 jours et jusqu'à + 5 jours
    minDate = new Date(startDate);
    minDate.setDate(startDate.getDate() + days - variance.min);
    maxDate = new Date(startDate);
    maxDate.setDate(startDate.getDate() + days + variance.max);
  } else {
    minDate = new Date(startDate);
    minDate.setDate(startDate.getDate() + days - variance);
    maxDate = new Date(startDate);
    maxDate.setDate(startDate.getDate() + days + variance);
  }

  return {
    estimatedDate: estimatedDate.toISOString().split('T')[0],
    minDate: minDate.toISOString().split('T')[0],
    maxDate: maxDate.toISOString().split('T')[0]
  };
};

/**
 * Add days to a date
 * @param {string} isoDate - Date in ISO format
 * @param {number} days - Number of days to add
 * @returns {string} - New date in ISO format
 */
export const addDays = (isoDate, days) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

/**
 * Calculate suggested fertilization check date (typically 7 days after incubation start)
 * @param {string} incubationStartDate - Start date in ISO format
 * @returns {string} - Suggested check date in ISO format
 */
export const getSuggestedFertilizationCheckDate = (incubationStartDate) => {
  if (!incubationStartDate) return null;
  return addDays(incubationStartDate, 7);
};