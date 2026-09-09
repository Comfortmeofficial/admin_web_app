import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { routesApi } from '../api/routesApi';
import type { CreateRoutePayload, Location } from '@/types';

interface RouteFieldsProps {
  value: CreateRoutePayload;
  onChange: (value: CreateRoutePayload) => void;
  locations: Location[];
}

// A single searchable picker, reused for pickup, destination, and each
// stop — the admin dashboard manages exactly one place list (Locations)
// now, so every role in a route is just "search and pick from that list."
function LocationSearch({
  locations,
  excludeIds = [],
  onSelect,
  placeholder,
}: {
  locations: Location[];
  excludeIds?: number[];
  onSelect: (location: Location) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = locations
    .filter((l) => !excludeIds.includes(Number(l.id)))
    .filter((l) => l.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">No locations match</p>
          ) : (
            filtered.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => { onSelect(l); setQuery(''); setOpen(false); }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              >
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-900">{l.name}</span>
                {l.state && <span className="text-gray-400 text-xs">— {l.state}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SelectedLocationChip({ location, onClear }: { location: Location; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-900 truncate">{location.name}</span>
      </div>
      <button type="button" onClick={onClear} className="text-gray-400 hover:text-red-600 shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Pickup/destination/name-suggestion/distance-fetch/stop-list, lifted out
// of RoutesPage's old RouteForm so both ride creation and recurring
// schedules can compose the exact same fields instead of drifting apart.
// Fully controlled — the parent owns the route draft and passes it down,
// since it's just one part of a larger ride/schedule payload.
export function RouteFields({ value, onChange, locations }: RouteFieldsProps) {
  const [nameTouched, setNameTouched] = useState(false);
  const [distanceTouched, setDistanceTouched] = useState(false);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [distanceFailed, setDistanceFailed] = useState(false);
  const [stopFares, setStopFares] = useState<Record<number, string>>(() =>
    Object.fromEntries((value.stops ?? []).map((s) => [s.stop_id, s.fare != null ? String(s.fare) : '']))
  );

  const locationId = value.location_id;
  const destinationId = value.destination_id;
  const selectedLocation = locations.find((l) => Number(l.id) === locationId);
  const selectedDestination = locations.find((l) => Number(l.id) === destinationId);

  // Suggests "Pickup — Destination" once both are picked, saving the admin
  // from retyping what the two pickers already say — but only until they
  // type a name themselves, so we never clobber a manual entry.
  useEffect(() => {
    if (nameTouched || !locationId || !destinationId) return;
    const pickup = locations.find((l) => Number(l.id) === locationId);
    const destination = locations.find((l) => Number(l.id) === destinationId);
    if (pickup && destination) {
      onChange({ ...value, name: `${pickup.name} — ${destination.name}` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, destinationId, nameTouched, locations]);

  // Same idea, via Google Directions on the backend instead of a
  // client-side string join — silently leaves the field for manual entry
  // if the lookup fails (e.g. no Google Maps API key configured), since
  // this is a convenience, not a requirement.
  useEffect(() => {
    if (distanceTouched || !locationId || !destinationId) return;
    let cancelled = false;
    setDistanceLoading(true);
    setDistanceFailed(false);
    routesApi.getDistance(String(locationId), String(destinationId))
      .then((result) => {
        if (!cancelled) onChange({ ...value, distance_km: Math.round(result.distance_km * 10) / 10 });
      })
      .catch(() => { if (!cancelled) setDistanceFailed(true); })
      .finally(() => { if (!cancelled) setDistanceLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, destinationId, distanceTouched]);

  const selectedStopIds = (value.stops ?? []).map((s) => s.stop_id);
  const selectedStops = selectedStopIds
    .map((id) => locations.find((l) => Number(l.id) === id))
    .filter((l): l is Location => !!l);

  const addStop = (location: Location) => {
    const id = Number(location.id);
    if (selectedStopIds.includes(id)) return;
    onChange({ ...value, stops: [...(value.stops ?? []), { stop_id: id, fare: undefined }] });
  };

  const removeStop = (id: number) => {
    onChange({ ...value, stops: (value.stops ?? []).filter((s) => s.stop_id !== id) });
    setStopFares((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Pickup Location</label>
        {selectedLocation ? (
          <SelectedLocationChip location={selectedLocation} onClear={() => onChange({ ...value, location_id: 0 })} />
        ) : (
          <LocationSearch
            locations={locations}
            placeholder="Search locations…"
            onSelect={(l) => onChange({ ...value, location_id: Number(l.id) })}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Destination</label>
        {selectedDestination ? (
          <SelectedLocationChip location={selectedDestination} onClear={() => onChange({ ...value, destination_id: 0 })} />
        ) : (
          <LocationSearch
            locations={locations}
            placeholder="Search locations…"
            onSelect={(l) => onChange({ ...value, destination_id: Number(l.id) })}
          />
        )}
      </div>

      <Input
        label="Distance (km)"
        type="number"
        hint={
          distanceLoading
            ? 'Calculating via Google Maps…'
            : distanceFailed
              ? 'Could not calculate automatically — enter the distance manually.'
              : undefined
        }
        value={value.distance_km ?? ''}
        onChange={(e) => { setDistanceTouched(true); onChange({ ...value, distance_km: Number(e.target.value) }); }}
      />

      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">Pickup Stops <span className="text-gray-400 font-normal">(optional)</span></p>
        <p className="text-xs text-gray-400 mb-2">
          Riders can choose one of these as their pickup point instead of the main location. Set a
          fare for a stop to charge a different price for boarding there — leave it blank to use the
          ride's base fare.
        </p>
        <LocationSearch
          locations={locations}
          excludeIds={selectedStopIds}
          placeholder="Search locations to add as a stop…"
          onSelect={addStop}
        />
        {selectedStops.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
            {selectedStops.map((s) => {
              const id = Number(s.id);
              return (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-900 truncate">{s.name}</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    placeholder="Fare (₦)"
                    value={stopFares[id] ?? ''}
                    onChange={(e) => setStopFare(id, e.target.value)}
                    className="w-28 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={() => removeStop(id)} className="text-gray-400 hover:text-red-600 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export function emptyRouteDraft(): CreateRoutePayload {
  return { name: '', location_id: 0, destination_id: 0, distance_km: undefined, stops: [] };
}
