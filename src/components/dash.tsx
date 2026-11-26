import type { ReactNode } from "react";

/** Small building blocks for the dashboard. */

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-line bg-white ${className}`}>{children}</section>
);

export function CardHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="m-0 text-base font-semibold">{title}</h2>
        {sub && <p className="m-0 mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** A donut made of stroked circle segments. Pair it with a text legend: colour is never the only signal. */
export function Donut({ segments, total, label }: { segments: { value: number; color: string }[]; total: number; label: string }) {
  const R = 72, C = 2 * Math.PI * R;
  const sum = segments.reduce((a, s) => a + s.value, 0);
  let offset = 0;
  return (
    <div className="relative mx-auto size-[200px]">
      <svg viewBox="0 0 200 200" className="size-full -rotate-90" role="img" aria-label={`${label}: ${segments.map((s) => s.value).join(", ")}`}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="#edeff5" strokeWidth="26" />
        {sum > 0 && segments.filter((s) => s.value > 0).map((s, i) => {
          const len = (s.value / sum) * C;
          const el = <circle key={i} cx="100" cy="100" r={R} fill="none" stroke={s.color} strokeWidth="26" strokeDasharray={`${Math.max(len - 3, 0)} ${C - Math.max(len - 3, 0)}`} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-[28px] font-bold leading-tight tracking-tight">{total}</span>
      </div>
    </div>
  );
}
