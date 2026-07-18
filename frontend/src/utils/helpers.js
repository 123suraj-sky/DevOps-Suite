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
