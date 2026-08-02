import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  message?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  message = 'No records found',
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-400 mb-4">
        {icon ?? <Inbox className="w-6 h-6" />}
      </div>
      <p className="text-sm font-medium text-gray-700">{message}</p>
      {description && <p className="text-xs text-gray-500 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-500 mb-4">
        <span className="text-xl font-bold">!</span>
      </div>
      <p className="text-sm font-medium text-gray-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Try again
        </button>
      )}
    </div>
  );
}
