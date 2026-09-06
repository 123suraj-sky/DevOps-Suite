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
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        paddings[padding],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};
