import React from 'react';
import { cn } from '@/utils/helpers';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const badgeVariants = {
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200',
  secondary: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-200',
  success: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
  warning: 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-200',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
};

const badgeSizes = {
  sm: 'px-sm py-xs text-xs',
  md: 'px-md py-xs text-sm',
  lg: 'px-lg py-sm text-base',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        badgeVariants[variant],
        badgeSizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};

interface StatusBadgeProps {
  status: string;
  children?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, children }) => {
  const statusVariants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'warning',
    confirmed: 'info',
    accepted: 'info',
    'in-progress': 'info',
    completed: 'success',
    cancelled: 'danger',
    online: 'success',
    offline: 'danger',
    active: 'success',
    inactive: 'danger',
  };

  return (
    <Badge variant={statusVariants[status] || 'info'}>
      {children || status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = 'User',
  size = 'md',
  className,
}) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br from-primary-400 to-accent-400 text-white font-semibold flex-center',
        avatarSizes[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
};

interface DividerProps {
  className?: string;
  text?: string;
}

export const Divider: React.FC<DividerProps> = ({ className, text }) => {
  if (text) {
    return (
      <div className={cn('flex items-center gap-md my-lg', className)}>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
        <span className="text-sm text-gray-500 dark:text-gray-400 px-md">{text}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
      </div>
    );
  }

  return <div className={cn('h-px bg-gray-200 dark:bg-gray-700 my-lg', className)}></div>;
};

interface ProgressProps {
  value: number;
  max?: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  animated?: boolean;
}

const progressVariants = {
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-accent-500',
  danger: 'bg-red-500',
};

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'primary',
  showLabel = false,
  animated = false,
}) => {
  const percentage = (value / max) * 100;

  return (
    <div className="w-full">
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500',
            progressVariants[variant],
            animated && 'animate-pulse-soft'
          )}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      {showLabel && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-xs">{Math.round(percentage)}%</p>
      )}
    </div>
  );
};
