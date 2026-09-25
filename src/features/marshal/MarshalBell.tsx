import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { ridesApi } from '@/features/rides/api/ridesApi';
import { pickDefaultRide, useChatInbox } from './marshalInbox';

// A marshal's notifications are their riders' messages on the trip they're
// conducting — not the ops tool for texting passengers that the general
// admin bell opens.
export function MarshalBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: rides = [] } = useQuery({
    queryKey: ['rides', 'mine'],
    queryFn: () => ridesApi.mine(),
    refetchInterval: 30_000,
  });
  const ride = pickDefaultRide(rides);

  const { data: passengers = [] } = useQuery({
    queryKey: ['ride-passengers', ride?.id],
    queryFn: () => ridesApi.getPassengers(ride!.id),
    enabled: !!ride,
    refetchInterval: 15_000,
  });
  const { threads, unreadByUser, unreadTotal } = useChatInbox(ride?.id ?? null);

  const items = threads
    .filter((t) => unreadByUser[t.user_id])
    .sort((a, b) => b.last_at.localeCompare(a.last_at));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors relative"
        aria-label={unreadTotal ? `${unreadTotal} new messages` : 'Notifications'}
      >
        <Bell className="w-5 h-5" />
        {unreadTotal > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[11px] font-semibold leading-[18px] text-center px-1">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500">New messages from your passengers</p>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-500 text-center">You're all caught up.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {items.map((t) => {
                  const who = passengers.find((p) => p.user_id === t.user_id);
                  return (
                    <button
                      key={t.user_id}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50"
                      onClick={() => {
                        setOpen(false);
                        navigate('/my-trip', { state: { rideId: ride?.id, openChatUserId: t.user_id } });
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {who ? `${who.first_name} ${who.last_name}` : 'Passenger'}
                          {who && <span className="text-gray-400 font-normal"> · Seat {who.seat_number}</span>}
                        </p>
                        <span className="shrink-0 rounded-full bg-red-600 text-white text-xs px-1.5 py-0.5 leading-none">
                          {unreadByUser[t.user_id]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-0.5">{t.last_message}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
