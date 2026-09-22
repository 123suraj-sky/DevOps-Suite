import { cn } from '../../utils';

export const Select = ({
  label,
  error,
  options = [],
  placeholder,
  className,
  id,
  children,
  ...props
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'block w-full px-3 py-2 text-sm rounded-md border transition-colors',
          'bg-[var(--surface-sunken)] text-[var(--text-primary)]',
          error
            ? 'border-red-400 dark:border-red-500'
            : 'border-[var(--border-subtle)] focus:border-[var(--accent)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-25',
          className
        )}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.length > 0
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
            ))
          : children}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
};
