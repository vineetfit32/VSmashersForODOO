const BUSINESS_TIME_ZONE = "Asia/Kolkata";

export function utcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function businessToday(now = new Date()): Date {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = formatted.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function isoDate(date: Date): string {
  return utcDateOnly(date).toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number): Date {
  const next = utcDateOnly(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addUtcMonths(date: Date, months: number): Date {
  const source = utcDateOnly(date);
  const year = source.getUTCFullYear();
  const month = source.getUTCMonth() + months;
  const day = source.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

export function isAfterDate(left: Date, right: Date): boolean {
  return utcDateOnly(left).getTime() > utcDateOnly(right).getTime();
}

export function isBeforeDate(left: Date, right: Date): boolean {
  return utcDateOnly(left).getTime() < utcDateOnly(right).getTime();
}
