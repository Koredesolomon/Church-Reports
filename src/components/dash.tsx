import type { ReactNode } from "react";

/** Small building blocks for the dashboard. */

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-line bg-white ${className}`}>{children}</section>
);

export function CardHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="m-0 text-base font-semibold">{title}</h2>
        {sub && <p className="m-0 mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function IconTile({ children, tone = "soft" }: { children: ReactNode; tone?: "soft" | "dark" }) {
  return (
    <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-xl [&>svg]:size-5 ${tone === "dark" ? "bg-white/15 text-white" : "bg-brand-soft text-brand"}`}>
      {children}
    </span>
  );
}

const ic = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
export const DashIcons = {
  check: <svg {...ic}><circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" /></svg>,
  hourglass: <svg {...ic}><path d="M6 3h12M6 21h12M7 3v3a5 5 0 0 0 2.5 4.3L12 12l2.5 1.7A5 5 0 0 1 17 18v3M17 3v3a5 5 0 0 1-2.5 4.3" /></svg>,
  alert: <svg {...ic}><path d="M12 3 2.5 20h19L12 3ZM12 10v4.5M12 17.5v.01" /></svg>,
  inbox: <svg {...ic}><path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6ZM3 13h5a4 4 0 0 0 8 0h5" /></svg>,
  clock: <svg {...ic}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  archive: <svg {...ic}><rect x="3" y="4" width="18" height="5" rx="1.5" /><path d="M5 9v10h14V9M10 13h4" /></svg>,
  users: <svg {...ic}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.5 2.6 3.5 5.5" /></svg>,
  arrow: <svg {...ic}><path d="M7 17 17 7M8 7h9v9" /></svg>,
};

/** "▲ 2 vs Sep" style change badge. `goodWhenUp` says whether an increase is good news. */
export function Delta({ now, before, label, goodWhenUp = true }: { now: number; before: number; label: string; goodWhenUp?: boolean }) {
  const d = now - before;
  if (d === 0) return <span className="inline-flex h-[22px] items-center rounded-md bg-[#eef0f5] px-2 text-xs font-semibold text-[#444b63]">No change vs {label}</span>;
  const good = goodWhenUp ? d > 0 : d < 0;
  return (
    <span className={`inline-flex h-[22px] items-center gap-1 rounded-md px-2 text-xs font-semibold ${good ? "bg-[#dff3e6] text-[#16603a]" : "bg-[#fde4e4] text-[#a5121a]"}`}>
      <span aria-hidden>{d > 0 ? "▲" : "▼"}</span>{d > 0 ? "+" : ""}{d} vs {label}
    </span>
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
