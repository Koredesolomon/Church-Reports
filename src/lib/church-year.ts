import { YEAR_START_MONTH } from "./config";
import { addMonths, monthShort } from "./periods";

// A church year is identified by the calendar year it STARTS in: 2026 means Oct 2026 to Sep 2027.

const pad = (n: number) => String(n).padStart(2, "0");

/** The church year a reporting month ("YYYY-MM-01") belongs to. */
export function churchYearOf(period: string) {
  const [y, m] = period.split("-").map(Number);
  return m >= YEAR_START_MONTH ? y : y - 1;
}

/** The twelve months of a church year, first to last. */
export function churchYearPeriods(year: number) {
  const first = `${year}-${pad(YEAR_START_MONTH)}-01`;
  return Array.from({ length: 12 }, (_, i) => addMonths(first, i));
}

/** "Oct 2026 – Sep 2027" */
export function churchYearLabel(year: number) {
  const months = churchYearPeriods(year);
  const first = months[0], last = months[11];
  return `${monthShort(first)} ${first.slice(0, 4)} – ${monthShort(last)} ${last.slice(0, 4)}`;
}
