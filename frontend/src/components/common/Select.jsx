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
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'block w-full px-3 py-2 border rounded-md shadow-sm',
          'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
          'focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500',
          error ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600',
          'text-sm',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options && options.length > 0
          ? options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))
          : children}
      </select>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};
