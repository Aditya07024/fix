import React from 'react';
import { cn } from '@/utils/helpers';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  noBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverable = false,
  noBorder = false,
}) => {
  return (
    <div
      className={cn(
        'rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-md dark:shadow-lg p-lg',
        hoverable && 'hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800 cursor-pointer transition-all duration-300',
        noBorder && 'border-0',
        className
      )}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className,
  children,
}) => {
  return (
    <div className={cn('flex-between mb-lg', className)}>
      <div className="flex items-start gap-md">
        {icon && <div className="text-2xl">{icon}</div>}
        <div>
          {title && <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-50">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-xs">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
      {children}
    </div>
  );
};

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className }) => {
  return <div className={cn('', className)}>{children}</div>;
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => {
  return (
    <div className={cn('mt-lg pt-lg border-t border-gray-100 dark:border-gray-800 flex-between gap-md', className)}>
      {children}
    </div>
  );
};
