import Link from "next/link";
import { requireStaff } from "@/lib/dal";
import { sql } from "@/lib/db";
import { deptLabel } from "@/lib/config";
import { longDate, monthLabel, recentPeriods } from "@/lib/periods";
import { KIND_LABEL } from "@/lib/reports";
import { PAGE_SIZE, queryArchive, readFilters } from "@/lib/archive";
import { Chip, PageHeader, Pager, qs, type ChipStatus } from "@/components/ui";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

export default async function Archive({ searchParams }: PageProps<"/archive">) {
  const user = await requireStaff();
  const f = readFilters(await searchParams, user.role === "admin");
  const [{ total, rows }, depts] = await Promise.all([
    queryArchive(f),
    sql<{ id: string; name: string; full_name: string | null }[]>`SELECT id, name, full_name FROM departments ORDER BY sort_order, name`,
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const keep = { q: f.q, m: f.m, d: f.d, t: f.t, s: f.s === "all" ? "all" : undefined };
  const from = total === 0 ? 0 : (f.p - 1) * PAGE_SIZE + 1;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Archive"
        sub={user.role === "admin" ? "Every approved report, searchable. Leadership sees this screen and the dashboard only." : "Every approved report, searchable. You can view and download, not edit."}
      >
        <a className="btn ghost" href={`/archive/export${qs(keep)}`}>Export list (CSV)</a>
      </PageHeader>

      <form method="get" className="compact card flex flex-wrap items-end gap-4 p-5">
        <div className="field !flex-[2_1_240px]"><label htmlFor="q">Search</label><input id="q" name="q" type="search" defaultValue={f.q} placeholder="Department, report or keyword" /></div>
        <div className="field !flex-[1_1_170px]"><label htmlFor="m">Month</label>
          <select id="m" name="m" defaultValue={f.m}><option value="">All months</option>{recentPeriods(24).map((p) => <option key={p} value={p}>{monthLabel(p)}</option>)}</select>
        </div>
        <div className="field !flex-[1_1_170px]"><label htmlFor="d">Department</label>
          <select id="d" name="d" defaultValue={f.d}><option value="">All departments</option>{depts.map((d) => <option key={d.id} value={d.id}>{deptLabel(d)}</option>)}</select>
        </div>
        <div className="field !flex-[1_1_170px]"><label htmlFor="t">Report type</label>
          <select id="t" name="t" defaultValue={f.t}><option value="">All types</option>{Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
        {user.role === "admin" && (
          <div className="field !flex-[1_1_170px]"><label htmlFor="s">Status</label>
            <select id="s" name="s" defaultValue={f.s}><option value="approved">Approved</option><option value="all">All statuses</option></select>
          </div>
        )}
        <button className="btn">Search</button>
      </form>

      <section aria-labelledby="results" className="card flex flex-col">
        <h2 id="results" className="m-0 px-6 pb-2 pt-5 text-lg font-bold">{total} {f.s === "approved" ? "approved " : ""}{total === 1 ? "report" : "reports"}</h2>
        <div className="overflow-x-auto px-2.5 pb-2.5">
          <table className="tbl min-w-[640px]">
            <thead><tr><th>Month</th><th>Department</th><th>Report</th><th>Status</th><th>Approved on</th><th>Files</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{monthLabel(r.period)}</td><td className="font-semibold">{r.department}</td><td>{KIND_LABEL[r.kind]}</td>
                  <td><Chip status={r.status as ChipStatus} /></td>
                  <td>{r.reviewed_at && r.status === "approved" ? longDate(r.reviewed_at) : "—"}</td><td>{r.file_count}</td>
                  <td><Link href={`/reports/${r.id}`}>Open</Link></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted">No reports match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-6 py-3.5 text-sm text-muted">
          <span>{total === 0 ? "Nothing to show" : `Showing ${from} to ${Math.min(f.p * PAGE_SIZE, total)} of ${total}`}</span>
          <Pager page={f.p} pages={pages} href={(p) => `/archive${qs({ ...keep, p })}`} />
        </div>
      </section>
    </div>
  );
}
