import Link from "next/link";

export const STATUS_LABEL = { draft: "Draft", submitted: "Submitted", returned: "Returned", approved: "Approved", late: "Late", none: "Not started" } as const;
export type ChipStatus = keyof typeof STATUS_LABEL;

export function Chip({ status }: { status: ChipStatus }) {
  return <span className={`chip s-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function PageHeader({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[28px] font-bold tracking-tight">{title}</h1>
        {sub && <p className="m-0 text-[15px] text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Section({ title, sub, action, children, className = "" }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card flex flex-col ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-6 pb-2 pt-5">
        <div>
          <h2 className="m-0 text-lg font-bold">{title}</h2>
          {sub && <p className="m-0 mt-0.5 text-[13px] text-muted">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <span className="flex gap-4">
      {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span className="opacity-40">Previous</span>}
      {page < pages ? <Link href={href(page + 1)}>Next</Link> : <span className="opacity-40">Next</span>}
    </span>
  );
}

/** Builds "?a=1&b=2" from defined, non-empty values. */
export function qs(params: Record<string, string | number | undefined | null>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}
