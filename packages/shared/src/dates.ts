/** Calendar YYYY-MM-DD (UTC). Rejects non-dates such as 2026-02-31. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) return false;
  return new Date(parsed).toISOString().slice(0, 10) === value;
}

export function daysUntil(isoDate: string, now = new Date()): number | null {
  const target = Date.parse(isoDate);
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.ceil((target - now.getTime()) / 86_400_000));
}

export function weeksUntil(isoDate: string, now = new Date()): number | null {
  const days = daysUntil(isoDate, now);
  if (days == null) return null;
  return Math.ceil(days / 7);
}

export function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
