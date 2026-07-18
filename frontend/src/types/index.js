// Enums as plain objects

export const ProjectStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  DELETED: 'DELETED',
});

export const ProjectRole = Object.freeze({
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
});

export const TaskStatus = Object.freeze({
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
});

export const TaskPriority = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

export const ProgrammingLanguage = Object.freeze({
  JAVA: 'JAVA',
  PYTHON: 'PYTHON',
  JAVASCRIPT: 'JAVASCRIPT',
});

export const ExecutionStatus = Object.freeze({
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  TIMEOUT: 'TIMEOUT',
});

export const LogLevel = Object.freeze({
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  TRACE: 'TRACE',
});

export const AlertCondition = Object.freeze({
  GREATER_THAN: 'GREATER_THAN',
  LESS_THAN: 'LESS_THAN',
  EQUAL_TO: 'EQUAL_TO',
});

export const HealthStatus = Object.freeze({
  UP: 'UP',
  DOWN: 'DOWN',
  DEGRADED: 'DEGRADED',
});

export const NotificationType = Object.freeze({
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_UPDATED: 'TASK_UPDATED',
  PROJECT_INVITE: 'PROJECT_INVITE',
  CODE_EXECUTION_COMPLETE: 'CODE_EXECUTION_COMPLETE',
  ALERT: 'ALERT',
  SYSTEM: 'SYSTEM',
});
