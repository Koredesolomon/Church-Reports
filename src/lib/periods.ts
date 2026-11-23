import { APP_TIMEZONE, DUE_DAY } from "./config";

// Periods are the first day of a month as "YYYY-MM-01". All date maths here is on plain strings,
// so it never shifts by timezone.

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const ymdFormat = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** The calendar date ("YYYY-MM-DD") of a moment, in the app's timezone. */
export function todayStr(now = new Date()) {
  return ymdFormat.format(now);
}

export function yesterdayStr(now = new Date()) {
  return todayStr(new Date(now.getTime() - 24 * 60 * 60 * 1000));
}

/** "14:05" in the app's timezone. */
export function timeOfDay(d: Date | string) {
  return new Date(d).toLocaleTimeString("en-GB", { timeZone: APP_TIMEZONE, hour: "2-digit", minute: "2-digit" });
}

export function addMonths(period: string, n: number) {
  const [y, m] = period.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}-01`;
}

/** The month currently being reported on: last calendar month (October's report is filed in early November). */
export function currentPeriod(now = new Date()) {
  return addMonths(`${todayStr(now).slice(0, 7)}-01`, -1);
}

/** Latest first. */
export function recentPeriods(count = 6, now = new Date()) {
  const cur = currentPeriod(now);
  return Array.from({ length: count }, (_, i) => addMonths(cur, -i));
}

export function isPeriod(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])-01$/.test(v);
}

/** The report for `period` is due on the DUE_DAY of the following month. */
export function dueDate(period: string) {
  return addMonths(period, 1).slice(0, 8) + pad(DUE_DAY);
}

export function isOverdue(period: string, now = new Date()) {
  return todayStr(now) > dueDate(period);
}

export function monthLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
export function monthShort(period: string) {
  return MONTHS[Number(period.split("-")[1]) - 1].slice(0, 3);
}
export function monthName(period: string) {
  return MONTHS[Number(period.split("-")[1]) - 1];
}

/** "2026-11-05" -> "5 November 2026" */
export function longDate(d: string) {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return `${day} ${MONTHS[m - 1]} ${y}`;
}
/** "2026-11-05" -> "5 Nov" (or "5 Nov 2026" with year) */
export function shortDate(d: string, withYear = false) {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return `${day} ${MONTHS[m - 1].slice(0, 3)}${withYear ? ` ${y}` : ""}`;
}

/** "36 mins ago", "2 hours ago", "1 day ago", then a short date. */
export function timeAgo(then: Date, now = new Date()) {
  const mins = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} ${mins === 1 ? "min" : "mins"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return shortDate(todayStr(then), todayStr(then).slice(0, 4) !== todayStr(now).slice(0, 4));
}
