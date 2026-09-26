import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, ShieldAlert, Users } from 'lucide-react';
import { ridesApi } from '@/features/rides/api/ridesApi';
import { Header } from '@/components/layout/Header';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatTime, slugToLabel } from '@/lib/utils';
import { DAY_MS, startOfToday } from '../marshalInbox';
import type { Ride } from '@/types';

// Local calendar date, not UTC — toISOString() rolls back to the previous
// day for anyone east of UTC (e.g. WAT, UTC+1), which made the date field
// permanently show yesterday and made picking a new date look like it did
// nothing.
function dateKey(ms: number) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayLabel(dayStart: number) {
  const diff = Math.round((dayStart - startOfToday()) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return new Date(dayStart).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function routeLabel(ride: Ride) {
  return ride.route?.location?.name && ride.route?.destination?.name
    ? `${ride.route.location.name} → ${ride.route.destination.name}`
    : (ride.route?.name ?? 'Trip');
}

export function MySchedulePage() {
  const navigate = useNavigate();
  const [dayStart, setDayStart] = useState(startOfToday);

  const { data: rides = [], isLoading } = useQuery({
    queryKey: ['rides', 'mine'],
    queryFn: () => ridesApi.mine(),
    refetchInterval: 30_000,
  });

  // Which days actually have a trip — lets the strip skip empty days instead
  // of the marshal tapping through them one at a time.
  const assignedDays = useMemo(() => {
    const days = new Set(rides.map((r) => dateKey(new Date(r.departure_time).setHours(0, 0, 0, 0))));
    return days;
  }, [rides]);

  const dayRides = useMemo(
    () =>
      rides
        .filter((r) => new Date(r.departure_time).setHours(0, 0, 0, 0) === dayStart)
        .sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime()),
    [rides, dayStart],
  );

  const shiftDay = (deltaDays: number) => setDayStart((d) => d + deltaDays * DAY_MS);

  return (
    <div className="flex flex-col h-full">
      <Header title="My Schedule" subtitle="Your assigned trips" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Date navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDay(-1)}
            className="p-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
            <p className="text-sm font-semibold text-gray-900 truncate">{dayLabel(dayStart)}</p>
            <input
              type="date"
              value={dateKey(dayStart)}
              onChange={(e) => {
                if (!e.target.value) return;
                const [y, m, d] = e.target.value.split('-').map(Number);
                setDayStart(new Date(y, m - 1, d).setHours(0, 0, 0, 0));
              }}
              className="text-sm text-gray-500 border-none p-0 bg-transparent focus:outline-none"
              aria-label="Jump to date"
            />
          </div>
          <button
            onClick={() => shiftDay(1)}
            className="p-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            aria-label="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {dayStart !== startOfToday() && (
          <button onClick={() => setDayStart(startOfToday())} className="text-sm text-primary-600 font-medium -mt-2">
            Jump to today
          </button>
        )}

        {/* Trip list */}
        {isLoading ? (
          <PageSpinner />
        ) : dayRides.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center max-w-sm mx-auto">
              <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-900 font-medium">No trips on this day</p>
              <p className="text-sm text-gray-500 mt-1">
                {assignedDays.size === 0
                  ? "You haven't been assigned any trips yet."
                  : 'Use the arrows or the date field to find one of your other trips.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {dayRides.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/my-trip/${r.id}`)}
                className="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-primary-300 hover:shadow-sm transition"
              >
                <div className="w-14 shrink-0 text-center">
                  <Clock className="w-4 h-4 text-gray-400 mx-auto mb-0.5" />
                  <p className="text-sm font-semibold text-gray-900">{formatTime(r.departure_time)}</p>
                </div>
                <div className="w-px self-stretch bg-gray-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{routeLabel(r)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.bus_plate ?? 'Bus TBD'} · {r.driver_name ?? 'Driver TBD'}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <Badge variant={statusBadge(r.status)} dot>{slugToLabel(r.status)}</Badge>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="w-3.5 h-3.5" /> {r.booked_seats}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
