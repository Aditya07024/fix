import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeButton?: boolean;
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeButton = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex-center bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={cn(
          'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full mx-md animate-slide-in',
          modalSizes[size]
        )}
      >
        {title && (
          <div className="flex-between px-lg py-md border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
            {closeButton && (
              <button
                onClick={onClose}
                className="p-xs hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="px-lg py-lg max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide">
          {children}
        </div>
        {footer && (
          <div className="px-lg py-md border-t border-gray-100 dark:border-gray-800 flex-between gap-md">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70">
      <div
        className={cn(
          'fixed top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl animate-slide-in',
          position === 'right' ? 'right-0' : 'left-0'
        )}
      >
        {title && (
          <div className="flex-between px-lg py-md border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
            <button
              onClick={onClose}
              className="p-xs hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="px-lg py-lg h-[calc(100vh-60px)] overflow-y-auto scrollbar-hide">
          {children}
        </div>
      </div>
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
    </div>
  );
};

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
  const positionClasses = {
    top: 'bottom-full mb-md -translate-x-1/2 left-1/2',
    bottom: 'top-full mt-md -translate-x-1/2 left-1/2',
    left: 'right-full mr-md top-1/2 -translate-y-1/2',
    right: 'left-full ml-md top-1/2 -translate-y-1/2',
  };

  return (
    <div className="relative inline-block group">
      {children}
      <div
        className={cn(
          'absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-40',
          'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-md px-md py-sm whitespace-nowrap',
          positionClasses[position]
        )}
      >
        {text}
        <div
          className={cn(
            'absolute w-0 h-0 border-4',
            position === 'top' && 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-100 border-l-transparent border-r-transparent border-b-transparent',
            position === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-100 border-l-transparent border-r-transparent border-t-transparent',
            position === 'left' && 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-100 border-t-transparent border-b-transparent border-r-transparent',
            position === 'right' && 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-100 border-t-transparent border-b-transparent border-l-transparent'
          )}
        />
      </div>
    </div>
  );
};
