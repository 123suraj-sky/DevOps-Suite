import { useState } from 'react';
import { cn } from '../../utils';

export const Input = ({
  label,
  error,
  helperText,
  className,
  id,
  type = 'text',
  showPasswordToggle = true,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const isPassword = type === 'password';
  const inputType = isPassword && showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={inputType}
          className={cn(
            'block w-full px-3 py-2 text-sm rounded-md',
            'bg-[var(--surface-sunken)] text-[var(--text-primary)]',
            'border transition-colors duration-150',
            error
              ? 'border-red-400 dark:border-red-500'
              : 'border-[var(--border-subtle)] focus:border-[var(--accent)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-25',
            'placeholder:text-[var(--text-muted)]',
            isPassword && showPasswordToggle ? 'pr-10' : '',
            className
          )}
          {...props}
        />
        {isPassword && showPasswordToggle && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)] hover:text-[var(--text-secondary)] focus:outline-none transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-[var(--text-muted)]">{helperText}</p>}
    </div>
  );
};
