import { cn } from '../../utils';

/**
 * Panel / Card component.
 *
 * variant:
 *   default  — surface-raised background + border (no shadow)
 *   sunken   — surface-sunken background + border
 *   ghost    — transparent, no border, just padding
 *
 * padding:  none | sm (p-4) | md (p-5) | lg (p-6)
 */
export const Card = ({ children, className, padding = 'md', variant = 'default', ...rest }) => {
  const paddings = {
    none: '',
    sm:   'p-4',
    md:   'p-5',
    lg:   'p-6',
  };

  const variants = {
    default: 'bg-[var(--surface-raised)] border border-[var(--border-subtle)]',
    sunken:  'bg-[var(--surface-sunken)] border border-[var(--border-subtle)]',
    ghost:   'bg-transparent',
  };

  return (
    <div
      className={cn(
        'rounded-lg',
        variants[variant],
        paddings[padding],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};
