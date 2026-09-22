import { Button } from './Button';

/**
 * Empty state component.
 *
 * variant:
 *   page    — large, centered, good for full-page empty states (py-24)
 *   inline  — medium (py-12), for panel/card empty states
 *   compact — small (py-6), for inline list empty states
 *
 * Props:
 *   title         — required heading
 *   description   — optional subtext
 *   icon          — optional SVG img src string (renders inside an icon container)
 *   action        — optional { label, onClick } for primary CTA
 *   secondaryAction — optional { label, onClick } for secondary CTA
 */
export const EmptyState = ({
  title,
  description,
  icon,
  action,
  secondaryAction,
  variant = 'inline',
}) => {
  const padding = {
    page:    'py-24',
    inline:  'py-12',
    compact: 'py-6',
  }[variant] ?? 'py-12';

  const iconSize = variant === 'page' ? 'w-16 h-16' : 'w-12 h-12';
  const imgSize  = variant === 'page' ? 'w-7 h-7'   : 'w-5 h-5';

  return (
    <div className={`flex flex-col items-center justify-center ${padding} text-center`}>
      {icon && (
        <div className={`${iconSize} rounded-full bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center mb-4`}>
          <img src={icon} alt="" className={`${imgSize} dark:brightness-0 dark:invert opacity-40`} aria-hidden="true" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 mt-5">
          {action && (
            <Button variant="primary" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
