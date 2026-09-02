import maleAvatar from '../assets/01_male_user.svg';
import femaleAvatar from '../assets/02_female_user.svg';

/**
 * Returns a gender-based default avatar image when the user has no custom avatar.
 * @param {string|null} gender - 'MALE', 'FEMALE', or anything else
 * @returns {string} imported asset URL, or null if gender is not MALE/FEMALE
 */
export const getDefaultAvatar = (gender) => {
  if (gender === 'MALE') return maleAvatar;
  if (gender === 'FEMALE') return femaleAvatar;
  return null;
};

export const truncate = (str, length) => {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
};

export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
