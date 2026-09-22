import { cn } from '../../utils';

/**
 * Skeleton placeholder.
 * Wraps the `.skeleton` CSS class defined in index.css.
 *
 * Use `<Skeleton className="h-4 w-32" />` for inline placeholders.
 * Use `<Skeleton.Block>` compositions for card-level loading states.
 */
export const Skeleton = ({ className, ...rest }) => (
  <div className={cn('skeleton rounded', className)} {...rest} />
);

/** A stat-card skeleton: label line + big number line */
Skeleton.StatCard = () => (
  <div className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)] p-5 space-y-3">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-8 w-16" />
    <Skeleton className="h-2.5 w-32" />
  </div>
);

/** A list-row skeleton */
Skeleton.Row = ({ className }) => (
  <div className={cn('flex items-center gap-3 py-3', className)}>
    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-2.5 w-1/3" />
    </div>
  </div>
);

/** A card body skeleton with one heading + 3 content lines */
Skeleton.Card = ({ rows = 3 }) => (
  <div className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)] p-5 space-y-3">
    <Skeleton className="h-4 w-40 mb-4" />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className={`h-3 ${i === rows - 1 ? 'w-1/2' : 'w-full'}`} />
    ))}
  </div>
);

/** Kanban column skeleton */
Skeleton.KanbanColumn = () => (
  <div className="bg-[var(--surface-sunken)] border border-[var(--border-subtle)] border-t-2 border-t-gray-300 rounded-lg p-4 space-y-3 min-w-[240px] lg:min-w-0">
    <Skeleton className="h-5 w-24" />
    {[1, 2, 3].map((n) => (
      <div key={n} className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border-subtle)] p-3 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-2.5 w-2/3" />
        <div className="flex justify-between">
          <Skeleton className="h-2 w-12" />
          <Skeleton className="h-2 w-10" />
        </div>
      </div>
    ))}
  </div>
);
