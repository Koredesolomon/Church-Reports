import { monthLabel } from "@/lib/periods";

/**
 * <option>s for a month dropdown, in calendar order (January first), grouped by year.
 * `periods` are "YYYY-MM-01" strings in any order.
 */
export default function MonthOptions({ periods }: { periods: string[] }) {
  const sorted = [...periods].sort();
  const years = [...new Set(sorted.map((p) => p.slice(0, 4)))];
  return (
    <>
      {years.map((year) => (
        <optgroup key={year} label={year}>
          {sorted.filter((p) => p.startsWith(year)).map((p) => <option key={p} value={p}>{monthLabel(p)}</option>)}
        </optgroup>
      ))}
    </>
  );
}
