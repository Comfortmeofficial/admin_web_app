import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 border-b border-gray-200', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
            active === tab.key
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'ml-2 px-1.5 py-0.5 text-xs rounded-full',
                active === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm', padding && 'p-6', className)}>
      {children}
    </div>
  );
}

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  iconBg?: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  sub?: string;
}

export function StatsCard({ label, value, icon, iconBg = 'bg-primary-100', change, changeType, sub }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
      <div className={cn('flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-lg', iconBg)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {(change || sub) && (
          <p className={cn(
            'text-xs mt-1',
            changeType === 'up' ? 'text-green-600' : changeType === 'down' ? 'text-red-600' : 'text-gray-500'
          )}>
            {change || sub}
          </p>
        )}
      </div>
    </div>
  );
}
