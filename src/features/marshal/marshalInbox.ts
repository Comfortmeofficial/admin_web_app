import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ridesApi } from '@/features/rides/api/ridesApi';
import type { Ride } from '@/types';

export const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const isOpen = (r: Ride) => r.status !== 'completed' && r.status !== 'cancelled';

// Ride status is never auto-advanced after departure, so an old ride can sit
// in "boarding"/"active" forever — only treat it as live if it's recent.
const isLive = (r: Ride) =>
  (r.status === 'active' || r.status === 'boarding') && new Date(r.departure_time).getTime() >= Date.now() - DAY_MS;

// The trip the marshal most likely means: one already under way, else today's,
// else the next one coming up, else the most recent. `rides` arrive oldest-first,
// so defaulting to rides[0] used to land on the oldest trip ever assigned.
export function pickDefaultRide(rides: Ride[]): Ride | null {
  const live = rides.find(isLive);
  if (live) return live;
  const todayStart = startOfToday();
  const today = rides.find((r) => {
    const t = new Date(r.departure_time).getTime();
    return isOpen(r) && t >= todayStart && t < todayStart + DAY_MS;
  });
  if (today) return today;
  const upcoming = rides.find((r) => isOpen(r) && new Date(r.departure_time).getTime() > Date.now());
  if (upcoming) return upcoming;
  return rides[rides.length - 1] ?? null;
}

// Which customer messages the marshal has already looked at, per rider, kept in
// the browser (the server has no read state): unread = a thread's customer-
// message count minus the count last seen. A tiny external store so the header
// bell and the My Trip page always agree.
const seenCache = new Map<string, Record<number, number>>();
const listeners = new Set<() => void>();
const EMPTY: Record<number, number> = {};
const storageKey = (rideId: string) => `marshal-chat-seen:${rideId}`;

function readSeen(rideId: string): Record<number, number> {
  let map = seenCache.get(rideId);
  if (!map) {
    try {
      map = JSON.parse(localStorage.getItem(storageKey(rideId)) ?? '{}') as Record<number, number>;
    } catch {
      map = {};
    }
    seenCache.set(rideId, map);
  }
  return map;
}

export function markChatSeen(rideId: string, userId: number, count: number) {
  const current = readSeen(rideId);
  if ((current[userId] ?? 0) >= count) return;
  const next = { ...current, [userId]: count };
  seenCache.set(rideId, next);
  try {
    localStorage.setItem(storageKey(rideId), JSON.stringify(next));
  } catch {
    // storage unavailable (private mode) — unread badges just reset on reload
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export function useChatInbox(rideId: string | null) {
  const seen = useSyncExternalStore(subscribe, () => (rideId ? readSeen(rideId) : EMPTY));
  const { data, isSuccess } = useQuery({
    queryKey: ['ride-chat-threads', rideId],
    queryFn: () => ridesApi.getChatThreads(rideId!),
    enabled: !!rideId,
    refetchInterval: 8_000,
  });
  const threads = data ?? [];

  const unreadByUser: Record<number, number> = {};
  let unreadTotal = 0;
  for (const t of threads) {
    const n = t.customer_message_count - (seen[t.user_id] ?? 0);
    if (n > 0) {
      unreadByUser[t.user_id] = n;
      unreadTotal += n;
    }
  }

  return {
    threads,
    loaded: isSuccess,
    unreadByUser,
    unreadTotal,
    markSeen: (userId: number, count: number) => {
      if (rideId) markChatSeen(rideId, userId, count);
    },
  };
}
