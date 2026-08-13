const APP_TIMEZONE = 'Asia/Kolkata';

const istTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const istDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const istMonthYearFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  month: 'short',
  year: 'numeric',
});

const istWeekdayMonthFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const istInputTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const istDatePartFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function istYMD(d: Date): { year: string; month: string; day: string } {
  const parts = istDatePartFormatter.formatToParts(d);
  return {
    year: parts.find((p) => p.type === 'year')?.value ?? '',
    month: parts.find((p) => p.type === 'month')?.value ?? '',
    day: parts.find((p) => p.type === 'day')?.value ?? '',
  };
}

function isSameISTDay(a: Date, b: Date): boolean {
  return istDatePartFormatter.format(a) === istDatePartFormatter.format(b);
}

function formatISTTime(d: Date): string {
  return istTimeFormatter.format(d);
}

function formatISTDate(d: Date): string {
  return istDateFormatter.format(d);
}

function formatISTMonthYear(d: Date): string {
  return istMonthYearFormatter.format(d);
}

function formatISTInputTime(d: Date): string {
  return istInputTimeFormatter.format(d);
}

function formatISTDateInput(d: Date): string {
  const ymd = istYMD(d);
  return `${ymd.year}-${ymd.month}-${ymd.day}`;
}

/**
 * Parse a backend timestamp into a Date.
 *
 * The backend stores all creation timestamps as UTC. Naive ISO strings (no
 * trailing Z / offset) are therefore interpreted as UTC so they are never
 * mistaken for browser-local wall-clock time.
 */
export function parseTimestamp(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const str = String(value).trim();
  if (!str) return null;
  const hasTimezone = /z$/i.test(str) || /[+-]\d{2}:\d{2}$/.test(str) || /[+-]\d{4}$/.test(str);
  const d = hasTimezone ? new Date(str) : new Date(`${str}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Exact creation time (Asia/Kolkata) instead of a relative "x hours ago".
 * Same-day content shows the time only; older content includes the date.
 */
export function timeAgo(date: string | Date): string {
  const d = parseTimestamp(date);
  if (!d) return '';
  if (isSameISTDay(d, new Date())) return formatISTTime(d);
  return `${formatISTDate(d)} at ${formatISTTime(d)}`;
}

export function formatDate(date: string | Date): string {
  const d = parseTimestamp(date);
  if (!d) return '';
  const now = new Date();
  if (isSameISTDay(d, now)) return `Today at ${formatISTTime(d)}`;
  const yesterday = new Date(now.getTime() - 86400000);
  if (isSameISTDay(d, yesterday)) return `Yesterday at ${formatISTTime(d)}`;
  return `${formatISTDate(d)} at ${formatISTTime(d)}`;
}

export function formatDateTime(date: string | Date | null | undefined): string {
  const d = parseTimestamp(date);
  if (!d) return '';
  return `${formatISTDate(d)} at ${formatISTTime(d)}`;
}

export function formatEventDate(date: string | Date | null | undefined): string {
  return formatDateTime(date);
}

export function formatEventTime(date: string | Date | null): string {
  if (!date) return '';
  const d = parseTimestamp(date);
  if (!d) return '';
  return formatISTTime(d);
}

export function eventMonth(date: string | Date): string {
  const d = parseTimestamp(date);
  if (!d) return '';
  const monthNum = parseInt(istYMD(d).month, 10);
  return new Date(2020, monthNum - 1, 1).toLocaleString('en-US', { month: 'short' }).toUpperCase();
}

export function eventDay(date: string | Date): string {
  const d = parseTimestamp(date);
  if (!d) return '';
  return parseInt(istYMD(d).day, 10).toString();
}

export function eventYear(date: string | Date): string {
  const d = parseTimestamp(date);
  if (!d) return '';
  return istYMD(d).year;
}

export function isPastEvent(date: string | Date): boolean {
  const d = parseTimestamp(date);
  if (!d) return true;
  return d.getTime() < Date.now();
}

export function formatEventCardDate(date: string | Date): string {
  const d = parseTimestamp(date);
  if (!d) return '';
  return `${istWeekdayMonthFormatter.format(d)} · ${formatISTTime(d)}`;
}

export function formatMonthYear(date: string | Date): string {
  const d = parseTimestamp(date);
  if (!d) return '';
  return formatISTMonthYear(d);
}

export function formatDateOnly(date: string | Date | null | undefined): string {
  const d = parseTimestamp(date);
  if (!d) return '';
  return formatISTDate(d);
}

/**
 * Build a UTC ISO string from a date + time entered by the user.
 * The wall-clock values are interpreted in Asia/Kolkata (UTC+05:30).
 */
export function combineIST(date: string, time: string): string | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Convert a datetime-local input value ("YYYY-MM-DDTHH:mm") into a UTC ISO
 * string, interpreting the wall-clock value in Asia/Kolkata.
 */
export function localISTToISO(datetimeLocal: string): string | null {
  if (!datetimeLocal) return null;
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(datetimeLocal.trim());
  if (!m) return null;
  return combineIST(m[1], m[2]);
}

/** UTC Date for IST midnight of the current IST day (for date comparisons). */
export function istToday(): Date {
  const ymd = istYMD(new Date());
  const d = new Date(`${ymd.year}-${ymd.month}-${ymd.day}T00:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Date part (YYYY-MM-DD) of a timestamp rendered in Asia/Kolkata. */
export function istDateInput(date: string | Date): string {
  const d = parseTimestamp(date);
  if (!d) return '';
  return formatISTDateInput(d);
}

/** Time part (HH:mm, 24h) of a timestamp rendered in Asia/Kolkata. */
export function istTimeInput(date: string | Date): string {
  const d = parseTimestamp(date);
  if (!d) return '';
  return formatISTInputTime(d);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
