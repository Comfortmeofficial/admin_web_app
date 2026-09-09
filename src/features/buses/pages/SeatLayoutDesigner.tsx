import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { SeatBlock, SeatDefinition, SeatLayout, SeatType } from '@/types';

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

// px per grid unit — used both for cell sizing and for turning drag pixel
// deltas into whole grid-unit offsets, so sections always snap to a grid.
const CELL = 44;

function buildBlockSeats(rows: number, cols: number): SeatDefinition[] {
  const seats: SeatDefinition[] = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      // Placeholder — renumberAllBlocks (run on every change via `commit`)
      // overwrites this immediately, so it's never actually seen on screen.
      seats.push({ row: r, col: c, seat_number: '', seat_type: 'standard', is_seat: true });
    }
  }
  return seats;
}

function isRealSeat(seatType: SeatType): boolean {
  return seatType === 'standard' || seatType === 'premium' || seatType === 'disabled';
}

// 1 -> A, 2 -> B, ..., 26 -> Z, 27 -> AA, 28 -> AB, ... — base-26 so a bus
// with more than 26 seat rows still gets a distinct letter per row instead
// of running out.
function rowLetterFor(n: number): string {
  let s = '';
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

// Alphanumeric, row-based labels (A1, A2, A3 / B1, B2, B3, ...) computed
// fresh from every seat's *current* type and position across the whole
// canvas — not stored/incremented state — so it's inherently "dynamic":
// painting a walkway into a standard seat (or moving/resizing a section)
// changes what gets counted and re-shuffles every label after it, with no
// separate renumber step required. Letters are assigned per distinct global
// row that contains at least one real (standard/premium/disabled) seat, in
// top-to-bottom order; walkway/empty rows don't consume a letter. Within a
// lettered row, real seats are numbered left-to-right in reading order.
// Runs after every edit (see `commit` in SeatLayoutDesigner) and once more
// at save time, so there's never a stale label to look at.
function renumberAllBlocks(blocks: SeatBlock[]): SeatBlock[] {
  const ordered = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);

  interface Positioned { blockId: string; globalRow: number; globalCol: number; seat: SeatDefinition }
  const positioned: Positioned[] = [];
  for (const b of ordered) {
    for (const s of b.seats) {
      positioned.push({ blockId: b.id, globalRow: b.y - 1 + s.row, globalCol: b.x - 1 + s.col, seat: s });
    }
  }

  const realRows = Array.from(
    new Set(positioned.filter((p) => isRealSeat(p.seat.seat_type as SeatType)).map((p) => p.globalRow)),
  ).sort((a, b) => a - b);
  const rowLetter = new Map<number, string>(realRows.map((row, i) => [row, rowLetterFor(i + 1)]));

  const seatIndexInRow = new Map<number, number>();
  const labelFor = new Map<Positioned, string>();
  for (const p of [...positioned].sort((a, b) => a.globalRow - b.globalRow || a.globalCol - b.globalCol)) {
    const type = p.seat.seat_type as SeatType;
    if (type === 'driver') {
      labelFor.set(p, 'D');
    } else if (!isRealSeat(type)) {
      labelFor.set(p, '');
    } else {
      const letter = rowLetter.get(p.globalRow)!;
      const idx = (seatIndexInRow.get(p.globalRow) ?? 0) + 1;
      seatIndexInRow.set(p.globalRow, idx);
      labelFor.set(p, `${letter}${idx}`);
    }
  }

  const byBlock = new Map<string, SeatDefinition[]>();
  for (const p of positioned) {
    const list = byBlock.get(p.blockId) ?? [];
    list.push({ ...p.seat, seat_number: labelFor.get(p) ?? '' });
    byBlock.set(p.blockId, list);
  }
  return blocks.map((b) => ({ ...b, seats: byBlock.get(b.id) ?? b.seats }));
}

let blockCounter = 0;
function newBlock(x: number, y: number, rows = 4, cols = 4): SeatBlock {
  blockCounter += 1;
  return { id: `block-${Date.now()}-${blockCounter}`, label: `Section ${blockCounter}`, x, y, rows, cols, seats: buildBlockSeats(rows, cols) };
}

function legacyLayoutToBlocks(layout: SeatLayout): SeatBlock[] {
  if (layout.blocks && layout.blocks.length > 0) return layout.blocks;
  if (layout.seats && layout.seats.length > 0) {
    return [{ id: 'legacy', label: 'Main', x: 1, y: 1, rows: layout.rows, cols: layout.cols, seats: layout.seats }];
  }
  return [];
}

function flattenBlocks(blocks: SeatBlock[]): SeatLayout {
  const seats: SeatDefinition[] = [];
  let maxRow = 0;
  let maxCol = 0;
  for (const b of blocks) {
    for (const s of b.seats) {
      const row = b.y - 1 + s.row;
      const col = b.x - 1 + s.col;
      seats.push({ ...s, row, col });
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);
    }
  }
  return { rows: maxRow, cols: maxCol, seats, blocks };
}

function BlockEditor({
  block,
  activeTool,
  isFront,
  onMove,
  onPaint,
  onResize,
  onRemove,
  onFocus,
}: {
  block: SeatBlock;
  activeTool: SeatType;
  isFront: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onPaint: (id: string, row: number, col: number) => void;
  onResize: (id: string, rows: number, cols: number) => void;
  onRemove: (id: string) => void;
  onFocus: (id: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    onFocus(block.id);
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: block.x, origY: block.y };
    setDragging(true);

    const handleMove = (ev: PointerEvent) => {
      if (!dragState.current) return;
      const dx = Math.round((ev.clientX - dragState.current.startX) / CELL);
      const dy = Math.round((ev.clientY - dragState.current.startY) / CELL);
      onMove(block.id, Math.max(1, dragState.current.origX + dx), Math.max(1, dragState.current.origY + dy));
    };
    const handleUp = () => {
      dragState.current = null;
      setDragging(false);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const getSeat = (row: number, col: number) => block.seats.find((s) => s.row === row && s.col === col);

  return (
    <div
      onPointerDownCapture={() => onFocus(block.id)}
      className={cn(
        'absolute bg-white border-2 rounded-lg shadow-sm select-none',
        dragging ? 'border-primary-500 shadow-lg z-30' : isFront ? 'border-gray-300 shadow-md z-20' : 'border-gray-200 z-10'
      )}
      style={{ left: (block.x - 1) * CELL, top: (block.y - 1) * CELL }}
    >
      <div
        onPointerDown={handlePointerDown}
        className="flex items-center justify-between gap-2 px-2 py-1 bg-gray-50 border-b border-gray-200 rounded-t-lg cursor-move touch-none"
      >
        <span className="text-xs font-medium text-gray-500 truncate">{block.label ?? 'Section'}</span>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => onRemove(block.id)} title="Remove section" className="text-gray-400 hover:text-red-600 text-xs px-1">
            ✕
          </button>
        </div>
      </div>

      <div className="p-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${block.cols}, ${CELL - 6}px)` }}>
        {Array.from({ length: block.rows }, (_, ri) =>
          Array.from({ length: block.cols }, (_, ci) => {
            const row = ri + 1;
            const col = ci + 1;
            const seat = getSeat(row, col);
            if (!seat) return <div key={`${row}-${col}`} />;
            return (
              <button
                key={`${row}-${col}`}
                type="button"
                onClick={() => onPaint(block.id, row, col)}
                title={`Row ${row}, Col ${col} — ${seat.seat_type}`}
                className={cn(
                  'rounded-md border text-[10px] font-semibold flex items-center justify-center transition-all',
                  seatColors[seat.seat_type as SeatType]
                )}
                style={{ width: CELL - 6, height: CELL - 6 }}
              >
                {seat.seat_number}
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-2 px-2 pb-2">
        <label className="text-[10px] text-gray-400">Rows</label>
        <input
          type="number"
          min={1}
          max={20}
          value={block.rows}
          onChange={(e) => onResize(block.id, Math.max(1, Number(e.target.value)), block.cols)}
          className="w-12 text-xs border border-gray-200 rounded px-1 py-0.5"
        />
        <label className="text-[10px] text-gray-400">Cols</label>
        <input
          type="number"
          min={1}
          max={10}
          value={block.cols}
          onChange={(e) => onResize(block.id, block.rows, Math.max(1, Number(e.target.value)))}
          className="w-12 text-xs border border-gray-200 rounded px-1 py-0.5"
        />
      </div>
    </div>
  );
}

interface SeatLayoutDesignerProps {
  blocks: SeatBlock[];
  onChange: (blocks: SeatBlock[]) => void;
}

export function SeatLayoutDesigner({ blocks, onChange }: SeatLayoutDesignerProps) {
  const [activeTool, setActiveTool] = useState<SeatType>('standard');
  const [frontId, setFrontId] = useState<string | null>(null);

  // Every mutation goes through here so labels never go stale — see
  // renumberAllBlocks's own comment for why this makes them "dynamic"
  // rather than needing an explicit renumber step.
  const commit = (next: SeatBlock[]) => onChange(renumberAllBlocks(next));

  const updateBlock = (id: string, updater: (b: SeatBlock) => SeatBlock) => {
    commit(blocks.map((b) => (b.id === id ? updater(b) : b)));
  };

  const handleMove = (id: string, x: number, y: number) => updateBlock(id, (b) => ({ ...b, x, y }));

  const handlePaint = (id: string, row: number, col: number) =>
    updateBlock(id, (b) => ({
      ...b,
      seats: b.seats.map((s) => (s.row === row && s.col === col ? { ...s, seat_type: activeTool } : s)),
    }));

  const handleResize = (id: string, rows: number, cols: number) =>
    updateBlock(id, (b) => {
      const fresh = buildBlockSeats(rows, cols);
      const seats = fresh.map((f) => {
        const existing = b.seats.find((s) => s.row === f.row && s.col === f.col);
        return existing ?? f;
      });
      return { ...b, rows, cols, seats };
    });

  const handleRemove = (id: string) => commit(blocks.filter((b) => b.id !== id));

  const handleAddBlock = () => {
    const nextX = blocks.length > 0 ? Math.max(...blocks.map((b) => b.x + b.cols)) + 1 : 1;
    commit([...blocks, newBlock(nextX, 1)]);
  };

  const canvasWidth = Math.max(420, ...blocks.map((b) => (b.x - 1 + b.cols) * CELL + 60), 0);
  const canvasHeight = Math.max(320, ...blocks.map((b) => (b.y - 1 + b.rows) * CELL + 90), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Paint tool:</span>
        <div className="flex flex-wrap gap-2">
          {SEAT_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
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
        <Button variant="outline" size="sm" onClick={handleAddBlock}>+ Add Section</Button>
      </div>

      <p className="text-xs text-gray-500">
        Drag a section by its header to position it on the canvas — arrange sections to match the bus's real
        layout (e.g. leave a gap for the aisle or door), then paint seat types inside each one. If two sections
        overlap, click one to bring it to the front. Seat labels (A1, A2, B1, B2, …) are assigned by row and
        recompute live as you paint, move, or resize — converting a walkway into a seat re-numbers everything
        after it automatically.
      </p>

      <div className="relative overflow-auto border border-gray-200 rounded-lg bg-gray-50" style={{ minHeight: 320 }}>
        <div style={{ position: 'relative', width: canvasWidth, height: canvasHeight }}>
          {blocks.map((b) => (
            <BlockEditor
              key={b.id}
              block={b}
              activeTool={activeTool}
              isFront={frontId === b.id}
              onMove={handleMove}
              onPaint={handlePaint}
              onResize={handleResize}
              onRemove={handleRemove}
              onFocus={setFrontId}
            />
          ))}
          {blocks.length === 0 && (
            <p className="p-4 text-sm text-gray-400">No sections yet — click "+ Add Section" to start.</p>
          )}
        </div>
      </div>

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
  const hasExisting = !!initialLayout && initialLayout.seats.length > 0;
  // Relabel immediately on load, not just on the next edit — otherwise a
  // bus saved before this alphanumeric scheme existed keeps showing its old
  // plain numbers until an admin happens to paint/move/resize something.
  const [blocks, setBlocks] = useState<SeatBlock[]>(() =>
    initialLayout ? renumberAllBlocks(legacyLayoutToBlocks(initialLayout)) : [],
  );
  const [started, setStarted] = useState(hasExisting);

  const start = () => {
    setBlocks([newBlock(1, 1)]);
    setStarted(true);
  };

  return (
    <div className="space-y-4">
      {!started ? (
        <Button variant="outline" onClick={start}>Start Layout</Button>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Drag sections to arrange them, click seats to change their type using the active paint tool.
          </p>
          <SeatLayoutDesigner blocks={blocks} onChange={setBlocks} />
          <div className="flex justify-end">
            <Button
              onClick={() => onSave(flattenBlocks(renumberAllBlocks(blocks)))}
              loading={loading}
              disabled={blocks.length === 0}
            >
              Save Layout
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
