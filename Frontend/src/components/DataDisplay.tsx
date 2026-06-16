import React from 'react';
import { cn } from '@/utils/helpers';

interface TableProps {
  columns: Array<{ key: string; label: string; render?: (value: any, row: any) => React.ReactNode }>;
  data: any[];
  loading?: boolean;
  emptyState?: string;
  className?: string;
}

export const Table: React.FC<TableProps> = ({
  columns,
  data,
  loading = false,
  emptyState = 'No data available',
  className,
}) => {
  if (loading) {
    return (
      <div className="flex-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-md"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex-center h-64">
        <p className="text-gray-500 dark:text-gray-400">{emptyState}</p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-lg py-md font-semibold text-gray-900 dark:text-gray-50"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-lg py-md text-gray-700 dark:text-gray-300">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface TabsProps {
  tabs: Array<{ label: string; content: React.ReactNode; id?: string }>;
  defaultTab?: number;
  onChange?: (index: number) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, defaultTab = 0, onChange }) => {
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  const handleTabChange = (index: number) => {
    setActiveTab(index);
    onChange?.(index);
  };

  return (
    <div>
      <div className="flex gap-md border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => handleTabChange(index)}
            className={cn(
              'px-md py-md font-medium text-sm transition-all duration-200 border-b-2 -mb-px',
              activeTab === index
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-lg animate-fade-in">{tabs[activeTab].content}</div>
    </div>
  );
};

interface AccordionProps {
  items: Array<{ title: string; content: React.ReactNode; id?: string }>;
  allowMultiple?: boolean;
}

export const Accordion: React.FC<AccordionProps> = ({ items, allowMultiple = false }) => {
  const [expanded, setExpanded] = React.useState<string[]>([]);

  const toggle = (id: string) => {
    if (allowMultiple) {
      setExpanded((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setExpanded((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className="space-y-md">
      {items.map((item, idx) => {
        const id = item.id || `accordion-${idx}`;
        const isExpanded = expanded.includes(id);

        return (
          <div key={id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggle(id)}
              className="w-full px-lg py-md flex-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-gray-50">{item.title}</span>
              <span className={cn('transition-transform', isExpanded && 'rotate-180')}>▼</span>
            </button>
            {isExpanded && (
              <div className="px-lg py-md border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 animate-slide-in">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPages?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showPages = 5,
}) => {
  const pages: (number | string)[] = [];
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const visiblePages = Math.max(3, showPages);

  if (totalPages <= visiblePages) {
    for (let i = 1; i <= totalPages; i += 1) {
      pages.push(i);
    }
  } else {
    const siblingCount = Math.max(1, Math.floor((visiblePages - 3) / 2));
    const leftBoundary = Math.max(2, safeCurrentPage - siblingCount);
    const rightBoundary = Math.min(totalPages - 1, safeCurrentPage + siblingCount);

    pages.push(1);

    if (leftBoundary > 2) {
      pages.push('...');
    }

    for (let page = leftBoundary; page <= rightBoundary; page += 1) {
      pages.push(page);
    }

    if (rightBoundary < totalPages - 1) {
      pages.push('...');
    }

    pages.push(totalPages);
  }

  return (
    <div className="flex-center gap-md my-lg">
      <button
        onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
        disabled={safeCurrentPage === 1}
        className="px-md py-sm rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>

      {pages.map((page, idx) => (
        <button
          key={idx}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === '...'}
          className={cn(
            'w-10 h-10 rounded-md font-medium transition-all duration-200',
            page === safeCurrentPage
              ? 'bg-primary-500 text-white'
              : page === '...'
              ? 'cursor-default'
              : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
        disabled={safeCurrentPage === totalPages}
        className="px-md py-sm rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  change?: { value: number; type: 'increase' | 'decrease' };
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  className,
}) => {
  return (
    <div className={cn('card', className)}>
      <div className="flex-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
          {change && (
            <p
              className={cn(
                'text-sm mt-md',
                change.type === 'increase'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {change.type === 'increase' ? '↑' : '↓'} {Math.abs(change.value)}% from last month
            </p>
          )}
        </div>
        {icon && <div className="text-4xl opacity-20">{icon}</div>}
      </div>
    </div>
  );
};
