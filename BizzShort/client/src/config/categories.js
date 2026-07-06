/**
 * Source of Truth for Categories
 * 
 * Matches the backend Mongoose enums and determines UI labels, 
 * routing paths, and icons.
 */

export const CATEGORIES = [
  // Special
  { id: 'fake-news', label: 'Fake News', path: '/fake-news', icon: 'fa-solid fa-magnifying-glass', group: 'special' },
  { id: 'positive', label: 'Positive News', path: '/positive-news', icon: 'fa-solid fa-face-smile', group: 'special' },
  
  // Levels
  { id: 'international', label: 'International', path: '/international-news', icon: 'fa-solid fa-globe', group: 'levels' },
  { id: 'national', label: 'National', path: '/national-news', icon: 'fa-solid fa-flag', group: 'levels' },
  { id: 'state', label: 'State', path: '/state-news', icon: 'fa-solid fa-location-dot', group: 'levels' },
  
  // Interests
  { id: 'economics', label: 'Economics', path: '/economics', icon: 'fa-solid fa-chart-line', group: 'interests' },
  { id: 'polity', label: 'Polity', path: '/polity', icon: 'fa-solid fa-landmark', group: 'interests' },
  { id: 'technology', label: 'Technology', path: '/technology', icon: 'fa-solid fa-laptop-code', group: 'interests' },
  { id: 'environment', label: 'Environment', path: '/environment', icon: 'fa-solid fa-leaf', group: 'interests' },
  { id: 'sports', label: 'Sports', path: '/sports', icon: 'fa-solid fa-volleyball', group: 'interests' },
  
  // New Categories
  { id: 'health', label: 'Health', path: '/health', icon: 'fa-solid fa-heart-pulse', group: 'interests' },
  { id: 'defence', label: 'Defence', path: '/defence', icon: 'fa-solid fa-shield-halved', group: 'interests' },
  { id: 'culture', label: 'Culture', path: '/culture', icon: 'fa-solid fa-masks-theater', group: 'interests' },
  { id: 'spirituality', label: 'Spirituality', path: '/spirituality', icon: 'fa-solid fa-om', group: 'interests' },
  { id: 'agriculture', label: 'Agriculture', path: '/agriculture', icon: 'fa-solid fa-wheat-awn', group: 'interests' },
  { id: 'geography', label: 'Geography', path: '/geography', icon: 'fa-solid fa-map-location-dot', group: 'interests' },
  { id: 'religion', label: 'Religion', path: '/religion', icon: 'fa-solid fa-place-of-worship', group: 'interests' },
  { id: 'ai', label: 'Artificial Intelligence (AI)', path: '/ai', icon: 'fa-solid fa-brain', group: 'interests' }
];

export const GET_CATEGORY_BY_ID = (id) => CATEGORIES.find(cat => cat.id === id);
export const GET_CATEGORIES_BY_GROUP = (group) => CATEGORIES.filter(cat => cat.group === group);
