import { cn } from '../../utils';

/**
 * Status badge / pill.
 * variants: default | success | warning | danger | accent
 */
export const Badge = ({ variant = 'default', children, className }) => {
  const variants = {
    default: 'bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    danger:  'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    // 'info' kept as alias for backward compat
    info:    'bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
    accent:  'bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
