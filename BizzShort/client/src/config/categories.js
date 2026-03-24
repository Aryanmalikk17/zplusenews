/**
 * Source of Truth for Categories
 * 
 * Matches the backend Mongoose enums and determines UI labels, 
 * routing paths, and icons.
 */

export const CATEGORIES = [
  // Special
  { id: 'fake-news', label: 'Fake News', path: '/fake-news', icon: '🔍', group: 'special' },
  
  // Levels
  { id: 'international', label: 'International', path: '/international-news', icon: '🌍', group: 'levels' },
  { id: 'national', label: 'National', path: '/national-news', icon: '🇮🇳', group: 'levels' },
  { id: 'state', label: 'State', path: '/state-news', icon: '📍', group: 'levels' },
  
  // Interests
  { id: 'economics', label: 'Economics', path: '/economics', icon: '💰', group: 'interests' },
  { id: 'polity', label: 'Polity', path: '/polity', icon: '🏛️', group: 'interests' },
  { id: 'technology', label: 'Technology', path: '/technology', icon: '💻', group: 'interests' },
  { id: 'environment', label: 'Environment', path: '/environment', icon: '🌱', group: 'interests' },
  { id: 'sports', label: 'Sports', path: '/sports', icon: '⚽', group: 'interests' },
];

export const GET_CATEGORY_BY_ID = (id) => CATEGORIES.find(cat => cat.id === id);
export const GET_CATEGORIES_BY_GROUP = (group) => CATEGORIES.filter(cat => cat.group === group);
