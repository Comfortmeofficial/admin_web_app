import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { SeatDefinition, SeatLayout, SeatType } from '@/types';

interface SeatLayoutDesignerProps {
  layout: SeatLayout;
  onChange: (layout: SeatLayout) => void;
}

const SEAT_TYPES: { type: SeatType; label: string; color: string }[] = [
  { type: 'standard', label: 'Standard', color: 'bg-blue-500' },
  { type: 'premium', label: 'Premium', color: 'bg-purple-500' },
  { type: 'disabled', label: 'Disabled', color: 'bg-green-500' },
  { type: 'driver', label: 'Driver', color: 'bg-gray-700' },
  { type: 'walkway', label: 'Walkway', color: 'bg-gray-200' },
  { type: 'empty', label: 'Empty', color: 'bg-white border-dashed' },
];

const seatColors: Record<SeatType, string> = {
  standard: 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200',
  premium: 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200',
  disabled: 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200',
  driver: 'bg-gray-200 border-gray-400 text-gray-800',
  walkway: 'bg-gray-100 border-gray-200 text-gray-400',
  empty: 'bg-white border-dashed border-gray-200',
};

function buildDefaultLayout(rows: number, cols: number): SeatLayout {
  const seats: SeatDefinition[] = [];
  let seatNum = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      seats.push({
        row: r,
        col: c,
        label: `${seatNum++}`,
        seat_type: 'standard',
        is_available: true,
      });
    }
  }
  return { rows, cols, seats };
}

export function SeatLayoutDesigner({ layout, onChange }: SeatLayoutDesignerProps) {
  const [activeTool, setActiveTool] = useState<SeatType>('standard');

  const handleSeatClick = useCallback(
    (row: number, col: number) => {
      const newSeats = layout.seats.map((s) =>
        s.row === row && s.col === col ? { ...s, seat_type: activeTool } : s
      );
      onChange({ ...layout, seats: newSeats });
    },
    [layout, activeTool, onChange]
  );

  const getSeat = (row: number, col: number) =>
    layout.seats.find((s) => s.row === row && s.col === col);

  const renumberSeats = (seats: SeatDefinition[]): SeatDefinition[] => {
    let n = 1;
    return seats.map((s) => ({
      ...s,
      label: s.seat_type === 'walkway' || s.seat_type === 'empty' || s.seat_type === 'driver'
        ? s.seat_type === 'driver' ? 'D' : ''
        : String(n++),
    }));
  };

  const handleRegenerate = () => {
    const fresh = buildDefaultLayout(layout.rows, layout.cols);
    onChange({ ...fresh, seats: renumberSeats(fresh.seats) });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Paint tool:</span>
        <div className="flex flex-wrap gap-2">
          {SEAT_TYPES.map((t) => (
            <button
              key={t.type}
              onClick={() => setActiveTool(t.type)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                activeTool === t.type
                  ? 'ring-2 ring-primary-500 border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              )}
            >
              <span className={cn('w-3 h-3 rounded-sm border', t.color)} />
              {t.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleRegenerate}>Reset & Renumber</Button>
      </div>

      {/* Grid */}
      <div className="overflow-auto border border-gray-200 rounded-lg bg-gray-50 p-4">
        <div
          className="inline-grid gap-1"
          style={{ gridTemplateColumns: `repeat(${layout.cols}, 2.5rem)` }}
        >
          {Array.from({ length: layout.rows }).map((_, r) =>
            Array.from({ length: layout.cols }).map((_, c) => {
              const seat = getSeat(r, c);
              if (!seat) return null;
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleSeatClick(r, c)}
                  title={`Row ${r + 1}, Col ${c + 1} — ${seat.seat_type}`}
                  className={cn(
                    'w-10 h-10 rounded-md border text-xs font-semibold flex items-center justify-center transition-all',
                    seatColors[seat.seat_type]
                  )}
                >
                  {seat.label}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {SEAT_TYPES.map((t) => (
          <div key={t.type} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className={cn('w-4 h-4 rounded border', t.color)} />
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SeatLayoutConfigProps {
  onSave: (layout: SeatLayout) => void;
  initialLayout?: SeatLayout;
  loading?: boolean;
}

export function SeatLayoutConfig({ onSave, initialLayout, loading }: SeatLayoutConfigProps) {
  const [rows, setRows] = useState(initialLayout?.rows ?? 8);
  const [cols, setCols] = useState(initialLayout?.cols ?? 4);
  const [layout, setLayout] = useState<SeatLayout>(
    initialLayout ?? buildDefaultLayout(rows, cols)
  );
  const [generated, setGenerated] = useState(!!initialLayout);

  const generate = () => {
    setLayout(buildDefaultLayout(rows, cols));
    setGenerated(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Rows</label>
          <input
            type="number"
            min={1}
            max={20}
            value={rows}
            onChange={(e) => setRows(Number(e.target.value))}
            className="mt-1 w-20 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Columns</label>
          <input
            type="number"
            min={1}
            max={10}
            value={cols}
            onChange={(e) => setCols(Number(e.target.value))}
            className="mt-1 w-20 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <Button variant="outline" onClick={generate}>Generate Layout</Button>
      </div>

      {generated && (
        <>
          <p className="text-sm text-gray-600">
            Click seats to change their type using the active paint tool.
          </p>
          <SeatLayoutDesigner layout={layout} onChange={setLayout} />
          <div className="flex justify-end">
            <Button onClick={() => onSave(layout)} loading={loading}>Save Layout</Button>
          </div>
        </>
      )}
    </div>
  );
}
