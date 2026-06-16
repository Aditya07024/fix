import React from 'react';
import { cn } from '@/utils/helpers';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="label-base">{label}</label>}
        <div className="relative">
          {icon && <div className="absolute left-md top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
          <input
            ref={ref}
            className={cn(
              'input-base',
              icon ? 'pl-xl' : '',
              error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-red-500 text-sm mt-xs">{error}</p>}
        {helperText && <p className="text-gray-500 text-sm mt-xs dark:text-gray-400">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rows?: number;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, rows = 4, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="label-base">{label}</label>}
        <textarea
          ref={ref}
          rows={rows}
          className={cn(
            'input-base resize-none',
            error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-red-500 text-sm mt-xs">{error}</p>}
        {helperText && <p className="text-gray-500 text-sm mt-xs dark:text-gray-400">{helperText}</p>}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="label-base">{label}</label>}
        <select
          ref={ref}
          className={cn(
            'input-base',
            error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-red-500 text-sm mt-xs">{error}</p>}
        {helperText && <p className="text-gray-500 text-sm mt-xs dark:text-gray-400">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex items-center gap-md">
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            'w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer dark:bg-gray-800 dark:border-gray-600',
            className
          )}
          {...props}
        />
        {label && <label className="cursor-pointer text-gray-900 dark:text-gray-50">{label}</label>}
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <div className="flex items-center gap-md">
        <input
          ref={ref}
          type="radio"
          className={cn(
            'w-4 h-4 border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer dark:bg-gray-800 dark:border-gray-600',
            className
          )}
          {...props}
        />
        {label && <label className="cursor-pointer text-gray-900 dark:text-gray-50">{label}</label>}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
