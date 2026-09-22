import { cn } from '../../utils';

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  children,
  ...props
}) => {
  const base = [
    'inline-flex items-center justify-center font-medium rounded-md',
    'transition-all duration-150',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-[var(--accent)]',
    'dark:focus-visible:ring-offset-[var(--surface-raised)]',
    'active:scale-[0.97]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
    'select-none',
  ].join(' ');

  const variants = {
    primary: [
      'bg-[var(--accent)] text-[var(--surface-base)]',
      'hover:bg-[var(--accent-hover)]',
      'dark:text-gray-950',
    ].join(' '),
    secondary: [
      'bg-[var(--surface-raised)] text-[var(--text-primary)]',
      'border border-[var(--border-strong)]',
      'hover:bg-[var(--surface-sunken)] hover:border-[var(--border-strong)]',
    ].join(' '),
    danger: [
      'bg-red-600 text-white',
      'hover:bg-red-700',
    ].join(' '),
    ghost: [
      'bg-transparent text-[var(--text-secondary)]',
      'hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
    ].join(' '),
    accent: [
      'bg-[var(--accent-subtle)] text-[var(--accent-text)]',
      'border border-[var(--accent-border)]',
      'hover:bg-[var(--accent)] hover:text-[var(--surface-base)] hover:border-[var(--accent)]',
      'dark:hover:text-gray-950',
    ].join(' '),
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 h-7',
    md: 'px-4 py-2 text-sm gap-2 h-9',
    lg: 'px-5 py-2.5 text-base gap-2 h-11',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin shrink-0 -ml-0.5 w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
};
