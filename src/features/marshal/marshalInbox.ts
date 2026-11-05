import type { Ride } from '@/types';

export const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const isOpen = (r: Ride) => r.status !== 'completed' && r.status !== 'cancelled';
