import { cn } from '../../utils';

/**
 * Circular spinner for inline/button loading states.
 * For page-level loading use the Skeleton component instead.
 */
export const Spinner = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-7 w-7',
    lg: 'h-10 w-10',
  };

  return (
    <div className={cn('flex items-center justify-center', className)} role="status" aria-label="Loading">
      <svg
        className={cn('animate-spin text-[var(--accent)]', sizes[size])}
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
};
