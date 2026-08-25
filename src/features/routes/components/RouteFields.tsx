import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { routesApi } from '../api/routesApi';
import type { CreateRoutePayload, Location, Destination, Stop } from '@/types';

interface RouteFieldsProps {
  value: CreateRoutePayload;
  onChange: (value: CreateRoutePayload) => void;
  locations: Location[];
  destinations: Destination[];
  stops: Stop[];
}

// Pickup/destination/name-suggestion/distance-fetch/stop-checklist, lifted
// out of RoutesPage's old RouteForm so both ride creation and recurring
// schedules can compose the exact same fields instead of drifting apart.
// Fully controlled — the parent owns the route draft and passes it down,
// since it's just one part of a larger ride/schedule payload.
export function RouteFields({ value, onChange, locations, destinations, stops }: RouteFieldsProps) {
  const [nameTouched, setNameTouched] = useState(false);
  const [distanceTouched, setDistanceTouched] = useState(false);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [stopFares, setStopFares] = useState<Record<number, string>>(() =>
    Object.fromEntries((value.stops ?? []).map((s) => [s.stop_id, s.fare != null ? String(s.fare) : '']))
  );

  const locationId = value.location_id;
  const destinationId = value.destination_id;

  // Suggests "Pickup — Destination" once both are picked, saving the admin
  // from retyping what the two selects already say — but only until they
  // type a name themselves, so we never clobber a manual entry.
  useEffect(() => {
    if (nameTouched || !locationId || !destinationId) return;
    const pickup = locations.find((l) => l.id === String(locationId));
    const destination = destinations.find((d) => d.id === String(destinationId));
    if (pickup && destination) {
      onChange({ ...value, name: `${pickup.name} — ${destination.name}` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, destinationId, nameTouched, locations, destinations]);

  // Same idea, via Google Directions on the backend instead of a
  // client-side string join — silently leaves the field for manual entry
  // if the lookup fails (e.g. no Google Maps API key configured), since
  // this is a convenience, not a requirement.
  useEffect(() => {
    if (distanceTouched || !locationId || !destinationId) return;
    let cancelled = false;
    setDistanceLoading(true);
    routesApi.getDistance(String(locationId), String(destinationId))
      .then((result) => {
        if (!cancelled) onChange({ ...value, distance_km: Math.round(result.distance_km * 10) / 10 });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDistanceLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, destinationId, distanceTouched]);

  const selectedStopIds = (value.stops ?? []).map((s) => s.stop_id);

  const toggleStop = (id: number) => {
    const isSelected = selectedStopIds.includes(id);
    const nextStops = isSelected
      ? (value.stops ?? []).filter((s) => s.stop_id !== id)
      : [...(value.stops ?? []), { stop_id: id, fare: stopFares[id] ? Number(stopFares[id]) : undefined }];
    onChange({ ...value, stops: nextStops });
  };

  const setStopFare = (id: number, fareText: string) => {
    setStopFares((prev) => ({ ...prev, [id]: fareText }));
    const nextStops = (value.stops ?? []).map((s) =>
      s.stop_id === id ? { ...s, fare: fareText ? Number(fareText) : undefined } : s
    );
    onChange({ ...value, stops: nextStops });
  };

  return (
    <>
      <Input
        label="Route Name"
        required
        placeholder="Lagos — Abuja Express"
        value={value.name ?? ''}
        onChange={(e) => { setNameTouched(true); onChange({ ...value, name: e.target.value }); }}
      />
      <Select
        label="Pickup Location"
        required
        options={locations.map((l) => ({ value: l.id, label: l.name }))}
        placeholder="Select location"
        value={locationId ?? ''}
        onChange={(e) => onChange({ ...value, location_id: Number(e.target.value) })}
      />
      <Select
        label="Destination"
        required
        options={destinations.map((d) => ({ value: d.id, label: d.name }))}
        placeholder="Select destination"
        value={destinationId ?? ''}
        onChange={(e) => onChange({ ...value, destination_id: Number(e.target.value) })}
      />
      <Input
        label="Distance (km)"
        type="number"
        hint={distanceLoading ? 'Calculating via Google Maps…' : undefined}
        value={value.distance_km ?? ''}
        onChange={(e) => { setDistanceTouched(true); onChange({ ...value, distance_km: Number(e.target.value) }); }}
      />
      {stops.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Pickup Stops <span className="text-gray-400 font-normal">(optional)</span></p>
          <p className="text-xs text-gray-400 mb-2">
            Riders can choose one of these as their pickup point instead of the main location. Set a
            fare for a stop to charge a different price for boarding there — leave it blank to use the
            ride's base fare.
          </p>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
            {stops.map((s) => {
              const id = Number(s.id);
              const checked = selectedStopIds.includes(id);
              return (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
                  <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStop(id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-900 truncate">{s.name}</span>
                    </div>
                  </label>
                  {checked && (
                    <input
                      type="number"
                      min={0}
                      placeholder="Fare (₦)"
                      value={stopFares[id] ?? ''}
                      onChange={(e) => setStopFare(id, e.target.value)}
                      className="w-28 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

export function emptyRouteDraft(): CreateRoutePayload {
  return { name: '', location_id: 0, destination_id: 0, distance_km: undefined, stops: [] };
}
