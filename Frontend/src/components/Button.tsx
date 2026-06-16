import React from 'react';
import { cn } from '@/utils/helpers';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const buttonVariants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'px-md py-sm rounded-base bg-red-500 text-white font-medium hover:bg-red-600 active:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 inline-flex items-center gap-xs',
};

const buttonSizes = {
  sm: 'px-sm py-xs text-sm',
  md: 'px-md py-sm text-base',
  lg: 'px-lg py-md text-lg',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      className={cn(
        buttonVariants[variant],
        buttonSizes[size],
        fullWidth && 'w-full justify-center',
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {icon && !loading && icon}
      {children}
    </button>
  );
};

export const IconButton: React.FC<Omit<ButtonProps, 'children'> & { icon: React.ReactNode }> = ({
  icon,
  ...props
}) => {
  return (
    <Button
      {...props}
      className={cn('btn-icon w-10 h-10', props.className)}
      variant="ghost"
    >
      {icon}
    </Button>
  );
};
