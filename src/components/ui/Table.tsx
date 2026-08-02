import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { PageSpinner } from './Spinner';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  loading,
  emptyMessage = 'No records found',
  emptyIcon,
  sortKey,
  sortDir,
  onSort,
  rowKey,
  onRowClick,
  className,
}: TableProps<T>) {
  if (loading) return <PageSpinner />;

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                onClick={() => col.sortable && onSort?.(col.key)}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap',
                  col.sortable && 'cursor-pointer select-none hover:text-gray-700',
                  col.headerClassName
                )}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className="flex flex-col">
                      <ChevronUp
                        className={cn(
                          'w-3 h-3',
                          sortKey === col.key && sortDir === 'asc'
                            ? 'text-primary-600'
                            : 'text-gray-300'
                        )}
                      />
                      <ChevronDown
                        className={cn(
                          'w-3 h-3 -mt-1',
                          sortKey === col.key && sortDir === 'desc'
                            ? 'text-primary-600'
                            : 'text-gray-300'
                        )}
                      />
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12">
                <EmptyState message={emptyMessage} icon={emptyIcon} />
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'hover:bg-gray-50 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-sm text-gray-700 whitespace-nowrap',
                      col.className
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
