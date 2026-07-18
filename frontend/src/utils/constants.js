export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const WS_URL = import.meta.env.VITE_WS_URL || '/ws';

export const TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';

export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
};

export const TASK_COLUMNS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
};

export const LOG_LEVEL_COLORS = {
  ERROR: 'text-red-500',
  WARN: 'text-yellow-500',
  INFO: 'text-green-500',
  DEBUG: 'text-blue-400',
  TRACE: 'text-gray-400',
};

export const SUPPORTED_LANGUAGES = [
  { value: 'JAVA', label: 'Java' },
  { value: 'PYTHON', label: 'Python' },
  { value: 'JAVASCRIPT', label: 'JavaScript' },
];

export const TIME_RANGES = [
  { value: '1h', label: '1 Hour' },
  { value: '6h', label: '6 Hours' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

export const METRICS_REFRESH_INTERVAL = 30000;
