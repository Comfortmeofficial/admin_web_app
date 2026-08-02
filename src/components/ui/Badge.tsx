import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'purple'
  | 'gray';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  danger: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-slate-100 text-slate-600',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  success: 'bg-green-500',
  danger: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
  gray: 'bg-slate-400',
};

export function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

export function statusBadge(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    active: 'success',
    approved: 'success',
    completed: 'success',
    confirmed: 'success',
    published: 'success',
    sent: 'success',
    success: 'success',
    available: 'success',
    open: 'info',
    pending: 'warning',
    awaiting_payment: 'info',
    pending_verification: 'warning',
    under_review: 'warning',
    boarding: 'warning',
    scheduled: 'info',
    pending_pickup: 'warning',
    in_transit: 'info',
    delivered: 'success',
    assigned: 'info',
    on_trip: 'purple',
    draft: 'gray',
    offline: 'gray',
    on_leave: 'gray',
    inactive: 'gray',
    retired: 'gray',
    maintenance: 'warning',
    in_service: 'info',
    cancelled: 'danger',
    rejected: 'danger',
    suspended: 'danger',
    failed: 'danger',
    refunded: 'purple',
    resolved: 'success',
    closed: 'gray',
  };
  return map[status.toLowerCase()] ?? 'default';
}
