import { cn } from '../../utils';

export const Card = ({ children, className, padding = 'md', ...rest }) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm',
        paddings[padding],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};
