import Link from "next/link";
import { requireHead } from "@/lib/dal";
import { sql } from "@/lib/db";
import { currentPeriod, dueDate, longDate, monthLabel, recentPeriods, shortDate } from "@/lib/periods";
import { chipFor, KIND_LABEL, KIND_TITLE, type Kind, type Status } from "@/lib/reports";
import { Chip, PageHeader, Section } from "@/components/ui";
import { markAllRead, startReport } from "./actions";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

type Note = { id: string; title: string; body: string | null; created_at: string; unread: boolean };

export default async function MyReports() {
  const user = await requireHead();
  const period = currentPeriod();
  const [[dept], [current], past, notes] = await Promise.all([
    sql<{ name: string; report_kind: Kind }[]>`SELECT name, report_kind FROM departments WHERE id = ${user.department_id}`,
    sql<{ id: string; status: Status; review_comment: string | null; updated_at: string }[]>`
      SELECT id, status, review_comment, to_char(updated_at, 'FMDD FMMonth, FMHH12:MI am') AS updated_at
      FROM reports WHERE department_id = ${user.department_id} AND period = ${period}`,
    sql<{ id: string; period: string; kind: Kind; status: Status; submitted_at: string | null }[]>`
      SELECT id, period, kind, status, to_char(submitted_at, 'YYYY-MM-DD') AS submitted_at
      FROM reports WHERE department_id = ${user.department_id} AND period <> ${period} ORDER BY period DESC LIMIT 24`,
    sql<Note[]>`
      SELECT id, title, body, to_char(created_at, 'YYYY-MM-DD') AS created_at, read_at IS NULL AS unread
      FROM notifications WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 5`,
  ]);
  // Months a new report can still be started for: this reporting month and the previous eleven, minus ones already started.
  const started = new Set([...(current ? [period] : []), ...past.map((r) => r.period)]);
  const startable = recentPeriods(12).filter((p) => !started.has(p));
  const status = current?.status;
  const chip = chipFor(status, period);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="My reports" sub={`${dept.name} · ${KIND_LABEL[dept.report_kind] === "Department report" ? "monthly department report" : KIND_LABEL[dept.report_kind].toLowerCase() + " report"}`}>
        {startable.length > 0 ? (
          <form action={startReport} className="compact flex flex-wrap items-end gap-2">
            <div className="field !flex-none"><label htmlFor="new-month">Month</label>
              <select id="new-month" name="period" defaultValue={startable[0]}>
                {startable.map((p) => <option key={p} value={p}>{monthLabel(p)}</option>)}
              </select>
            </div>
            <button className="btn !h-11">New report</button>
          </form>
        ) : (
          <span className="text-sm text-muted">Every recent month already has a report.</span>
        )}
      </PageHeader>

      <Section title="Notifications" action={<form action={markAllRead}><button className="linkbtn">Mark all as read</button></form>}>
        <div className="flex flex-col px-6 pb-2">
          {notes.length === 0 && <p className="m-0 pb-4 text-[15px] text-muted">Nothing new.</p>}
          {notes.map((n) => (
            <div key={n.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-line-soft py-3.5 last:border-0">
              <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1">
                <span className={`text-[15px] ${n.unread ? "font-semibold" : "font-medium"}`}>{n.title}</span>
                {n.body && <span className="text-sm leading-relaxed text-ink-2">{n.body}</span>}
              </div>
              <span className="flex items-center gap-2.5">
                {n.unread && <span className="chip s-submitted">New</span>}
                <span className="text-[13px] text-muted">{shortDate(n.created_at)}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <section className="card flex flex-col gap-5 p-6" aria-labelledby="this-month">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="this-month" className="m-0 text-lg font-bold">{monthLabel(period)} report</h2>
            <span className="text-sm text-muted">{KIND_TITLE[dept.report_kind]} · due {longDate(dueDate(period))}</span>
          </div>
          <Chip status={chip} />
        </div>
        {status === "returned" && current?.review_comment && (
          <div className="flex flex-col gap-1 rounded-lg border border-warn-line bg-warn-bg px-4 py-3.5">
            <span className="text-[13px] font-semibold text-warn-ink">Comment from the admin</span>
            <span className="text-[15px] leading-relaxed">{current.review_comment}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4">
          {!current && <form action={startReport}><input type="hidden" name="period" value={period} /><button className="btn">Start the {monthLabel(period)} report</button></form>}
          {current && (status === "draft" || status === "returned") && (
            <Link className="btn" href={`/reports/${current.id}`}>{status === "returned" ? "Edit and resubmit" : "Continue the draft"}</Link>
          )}
          {current && (status === "submitted" || status === "approved") && <Link className="btn ghost" href={`/reports/${current.id}`}>View report</Link>}
          {current && <span className="text-sm text-muted">Last saved {current.updated_at}</span>}
          {status === "submitted" && <span className="text-sm text-muted">Waiting for the admin to review it.</span>}
        </div>
      </section>

      <Section title="Past reports">
        <div className="overflow-x-auto px-2 pb-2">
          <table className="tbl min-w-[560px]">
            <thead><tr><th>Month</th><th>Report</th><th>Status</th><th>Submitted</th><th /></tr></thead>
            <tbody>
              {past.map((r) => (
                <tr key={r.id}>
                  <td>{monthLabel(r.period)}</td><td>{KIND_LABEL[r.kind]}</td>
                  <td><Chip status={chipFor(r.status, r.period)} /></td>
                  <td>{r.submitted_at ? longDate(r.submitted_at) : "—"}</td>
                  <td><Link href={`/reports/${r.id}`}>View</Link></td>
                </tr>
              ))}
              {past.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted">No past reports yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
