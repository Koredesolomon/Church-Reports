import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { sql } from "@/lib/db";
import { currentPeriod, isPeriod, longDate, monthLabel, recentPeriods, shortDate } from "@/lib/periods";
import { getAttachments, getReport, KIND_LABEL, KIND_TITLE, type Kind, type Status } from "@/lib/reports";
import { UUID } from "@/lib/action-utils";
import ActionForm from "@/components/action-form";
import ReportView from "@/components/report-view";
import MonthPicker from "@/components/month-picker";
import { Chip, PageHeader, qs } from "@/components/ui";
import { addNewMembers, reviewReport } from "./actions";
import HeaderBell from "@/components/header-bell";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

export default async function ReviewQueue({ searchParams }: PageProps<"/reviews">) {
  await requireAdmin();
  const sp = await searchParams;
  const m = typeof sp.m === "string" && isPeriod(sp.m) ? sp.m : currentPeriod();
  const rows = await sql<{ id: string; department: string; kind: Kind; status: Status; submitted_at: string | null }[]>`
    SELECT r.id, d.name AS department, r.kind, r.status, to_char(lagos(r.submitted_at), 'YYYY-MM-DD') AS submitted_at
    FROM reports r JOIN departments d ON d.id = r.department_id
    WHERE r.period = ${m} AND r.status <> 'draft'
    ORDER BY CASE r.status WHEN 'submitted' THEN 0 WHEN 'returned' THEN 1 ELSE 2 END, r.submitted_at, d.sort_order`;
  const waiting = rows.filter((r) => r.status === "submitted").length;
  const selId = typeof sp.id === "string" && UUID.test(sp.id) ? sp.id : rows.find((r) => r.status === "submitted")?.id ?? rows[0]?.id;
  const sel = selId && rows.some((r) => r.id === selId) ? await getReport(selId) : null;
  const files = sel ? await getAttachments(sel.id) : [];
  const periods = recentPeriods(12);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader title="Review queue" sub={`${monthLabel(m)} · ${waiting} ${waiting === 1 ? "report" : "reports"} waiting for review`}>
        <div className="relative z-20 flex w-full items-end justify-between gap-3 sm:w-auto">
          <MonthPicker label="Month" value={m} periods={periods} />
          <HeaderBell />
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="queue" className="card flex min-w-0 flex-[1_1_520px] flex-col">
          <h2 id="queue" className="m-0 px-6 pb-2 pt-5 text-lg font-bold">Reports this month</h2>
          <div className="overflow-x-auto px-2.5 pb-2.5">
            <table className="tbl min-w-[480px]">
              <thead><tr><th>Department</th><th>Report</th><th>Submitted</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.id === sel?.id ? "sel" : ""}>
                    <td><Link href={`/reviews${qs({ m, id: r.id })}`} className="font-semibold">{r.department}</Link></td>
                    <td>{KIND_LABEL[r.kind]}</td>
                    <td>{r.submitted_at ? shortDate(r.submitted_at) : "—"}</td>
                    <td><Chip status={r.status} /></td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted">No reports have been submitted for {monthLabel(m)} yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {sel && (
          <section aria-labelledby="detail" className="card flex min-w-0 flex-[1_1_380px] flex-col gap-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <h2 id="detail" className="m-0 text-lg font-bold">{KIND_TITLE[sel.kind]}</h2>
                <span className="text-sm text-muted">{sel.department} · {sel.submitted_at ? `submitted ${longDate(sel.submitted_at)}` : "not submitted"}{sel.submitted_by_name ? ` by ${sel.submitted_by_name}` : ""}</span>
              </div>
              <Chip status={sel.status} />
            </div>
            <ReportView report={sel} attachments={files} />

            {sel.status === "submitted" && (
              <ActionForm action={reviewReport} className="flex flex-col gap-4">
                <input type="hidden" name="id" value={sel.id} />
                <div className="field"><label htmlFor="comment">Comment (required when returning)</label>
                  <textarea id="comment" name="comment" className="!min-h-[84px]" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button name="intent" value="approve" className="btn">Approve</button>
                  <button name="intent" value="return" className="btn ghost">Return with comment</button>
                </div>
              </ActionForm>
            )}
            {sel.status === "returned" && sel.review_comment && (
              <div className="rounded-lg border border-warn-line bg-warn-bg px-4 py-3 text-sm"><strong className="text-warn-ink">Returned with comment: </strong>{sel.review_comment}</div>
            )}
            {sel.status === "approved" && sel.kind === "new_members" && (
              sel.data.imported_at ? (
                <p className="hint m-0">These people were added to the member database.</p>
              ) : (
                <ActionForm action={addNewMembers} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={sel.id} />
                  <button className="btn self-start">Add these {sel.data.people?.length ?? 0} people to the member database</button>
                </ActionForm>
              )
            )}
            {sel.status === "submitted" && sel.kind === "new_members" && (
              <p className="hint m-0">After approving, you can add the people listed here to the member database in one click.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
