import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { dueDate, longDate, monthLabel } from "@/lib/periods";
import { chipFor, getAttachments, getReport, KIND_TITLE, fmtSize } from "@/lib/reports";
import { UUID } from "@/lib/action-utils";
import ActionForm from "@/components/action-form";
import FileInput from "@/components/file-input";
import PeopleEditor from "@/components/people-editor";
import { MAX_UPLOAD_LABEL } from "@/lib/limits";
import ReportView from "@/components/report-view";
import { Chip } from "@/components/ui";
import { removeAttachment, saveReport } from "../actions";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

export default async function ReportPage({ params }: PageProps<"/reports/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const report = await getReport(id);
  if (!report) notFound();
  // Access: heads see their own department's reports; leadership sees approved ones; admins see all.
  if (user.role === "head" && report.department_id !== user.department_id) notFound();
  if (user.role === "leadership" && report.status !== "approved") notFound();

  const attachments = await getAttachments(id);
  const editable = user.role === "head" && (report.status === "draft" || report.status === "returned");
  const d = report.data;
  const back = user.role === "head" ? { href: "/reports", label: "Back to my reports" } : { href: "/archive", label: "Back to the archive" };

  return (
    <div className="flex flex-col gap-6">
      <Link href={back.href} className="text-sm font-medium">{back.label}</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[28px] font-bold tracking-tight">{KIND_TITLE[report.kind]}</h1>
          <p className="m-0 text-[15px] text-muted">{report.department} · {monthLabel(report.period)} · due {longDate(dueDate(report.period))}</p>
        </div>
        <Chip status={chipFor(report.status, report.period)} />
      </div>

      {report.status === "returned" && report.review_comment && (
        <div className="flex max-w-3xl flex-col gap-1 rounded-lg border border-warn-line bg-warn-bg px-4 py-3.5">
          <span className="text-[13px] font-semibold text-warn-ink">Comment from the admin</span>
          <span className="text-[15px] leading-relaxed">{report.review_comment}</span>
        </div>
      )}

      {!editable ? (
        <div className="card flex max-w-3xl flex-col gap-5 p-6 sm:p-8">
          <ReportView report={report} attachments={attachments} />
          {report.status === "submitted" && user.role === "head" && <p className="hint m-0">This report is waiting for review, so it can&apos;t be edited.</p>}
          {report.status === "approved" && <p className="hint m-0">Approved and archived{report.reviewed_at ? ` on ${longDate(report.reviewed_at)}` : ""}.</p>}
        </div>
      ) : (
        <>
          <ActionForm action={saveReport} className="card flex max-w-3xl flex-col gap-7 p-6 sm:p-8">
            <input type="hidden" name="id" value={report.id} />
            <div className="flex flex-wrap gap-5">
              <div className="field"><label htmlFor="dept">Department</label><input id="dept" value={report.department} readOnly /></div>
              <div className="field"><label htmlFor="month">Month</label><input id="month" value={monthLabel(report.period)} readOnly /></div>
              <div className="field"><label htmlFor="by">Submitted by</label><input id="by" value={user.name} readOnly /></div>
            </div>

            {report.kind === "financial" && (
              <>
                <div className="flex flex-wrap gap-5">
                  {([["income", "Total income (₦)"], ["expenses", "Total expenses (₦)"], ["closing", "Closing balance (₦)"]] as const).map(([k, label]) => (
                    <div className="field" key={k}><label htmlFor={k}>{label}</label>
                      <input id={k} name={k} inputMode="decimal" defaultValue={d[k] ?? ""} placeholder="0" />
                    </div>
                  ))}
                </div>
                <div className="field"><label htmlFor="notes">Notes</label>
                  <textarea id="notes" name="notes" defaultValue={d.notes ?? ""} />
                  <span className="hint">Anything the admin should know about this month&apos;s figures.</span>
                </div>
              </>
            )}

            {report.kind === "department" && (
              <>
                {([["summary", "Summary of the month", "What did the department do this month?"], ["achievements", "Key achievements", "What went well?"], ["challenges", "Challenges", "What held you back?"], ["plans", "Plans for next month", "What will the department do next month?"]] as const).map(([k, label, ph]) => (
                  <div className="field" key={k}><label htmlFor={k}>{label}</label><textarea id={k} name={k} defaultValue={d[k] ?? ""} placeholder={ph} /></div>
                ))}
                <div className="field sm:max-w-xs"><label htmlFor="headcount">Headcount (optional)</label>
                  <input id="headcount" name="headcount" inputMode="numeric" defaultValue={d.headcount ?? ""} placeholder="Number of members who took part" />
                </div>
              </>
            )}

            {report.kind === "new_members" && (
              <>
                <PeopleEditor initial={d.people ?? []} />
                <div className="field"><label htmlFor="followup">Follow-up notes</label>
                  <textarea id="followup" name="followup" defaultValue={d.followup ?? ""} placeholder="Who is following up with these members, and how?" />
                </div>
              </>
            )}

            <div className="flex flex-col gap-2.5">
              <label htmlFor="files" className="lbl">{report.kind === "financial" ? "Bank statement or ledger" : "Attachments (optional)"}</label>
              <div className="rounded-[10px] border-[1.5px] border-dashed border-[#9aa0bc] bg-[#fafafd] p-5">
                <FileInput id="files" name="files" />
              </div>
              <span className="hint">PDF, Excel or images, up to {MAX_UPLOAD_LABEL} at a time. Files are attached when you save or submit. To add more, save and attach again.</span>
              {attachments.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3.5 py-2.5 text-sm">
                  <span className="font-medium"><a href={`/files/${a.id}`}>{a.filename}</a> <span className="font-normal text-muted">· {fmtSize(a.size)}</span></span>
                  <button type="submit" form={`rm-${a.id}`} className="linkbtn">Remove</button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-line-soft pt-5">
              <button name="intent" value="draft" className="btn ghost">Save draft</button>
              <button name="intent" value="submit" className="btn">Submit report</button>
            </div>
          </ActionForm>
          {attachments.map((a) => (
            <ActionForm key={a.id} id={`rm-${a.id}`} action={removeAttachment}>
              <input type="hidden" name="attachment" value={a.id} />
            </ActionForm>
          ))}
        </>
      )}
    </div>
  );
}
