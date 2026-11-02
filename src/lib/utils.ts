import { format, parseISO } from 'date-fns';
import type { RouteStop } from '@/types';

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Resolves a booking's pickup_stop_id/dropoff_stop_id (a plain number) back
// to a human-readable stop name, against a ride's route.stops (whose own
// ids come back as strings) — null for "not set" (the route's default
// pickup location, or riding to the final destination) as much as for
// "stop not found".
export function stopName(stops: RouteStop[] | undefined, stopId: number | string | null | undefined): string | null {
  if (stopId == null) return null;
  const stop = stops?.find((s) => String(s.stop.id) === String(stopId));
  return stop?.stop.name ?? null;
}

export function formatDate(dateStr: string, fmt = 'MMM d, yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  return formatDate(dateStr, 'MMM d, yyyy HH:mm');
}

export function formatTime(dateStr: string): string {
  return formatDate(dateStr, 'HH:mm');
}

export function formatCurrency(amount: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-NG').format(n);
}

// Reads a File into a base64 data URI — used for bus pictures/insurance/
// document uploads, which this app has no object storage for and instead
// stores directly as a data URI string.
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function slugToLabel(slug: string | null | undefined): string {
  if (!slug) return '—';
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCsv<T extends object>(
  data: T[],
  filename: string
): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify((row as Record<string, unknown>)[h] ?? '')).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `${filename}.csv`);
}

export function buildQueryString(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  }
  return qs.toString();
}

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { detail?: unknown; message?: string } } };
    const detail = axiosError.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    // FastAPI 422 returns detail as an array of validation error objects
    if (Array.isArray(detail)) {
      return detail.map((e) => (e as { msg?: string }).msg ?? 'Validation error').join(', ');
    }
    return axiosError.response?.data?.message ?? 'An error occurred';
  }
  if (error instanceof Error) return error.message;
  return 'An error occurred';
}
