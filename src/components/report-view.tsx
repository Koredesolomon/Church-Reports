import { fmtSize, naira, type Attachment, type ReportRow } from "@/lib/reports";
import { shortDate } from "@/lib/periods";

function Block({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <span className="whitespace-pre-wrap text-[15px] leading-relaxed">{value?.trim() || "—"}</span>
    </div>
  );
}

/** Read-only view of a report's contents and files. */
export default function ReportView({ report, attachments }: { report: ReportRow; attachments: Attachment[] }) {
  const d = report.data;
  return (
    <div className="flex flex-col gap-5">
      {report.kind === "financial" && (
        <>
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-1"><span className="text-[13px] font-semibold text-muted">Total income</span><span className="text-xl font-bold">{naira(d.income)}</span></div>
            <div className="flex flex-col gap-1"><span className="text-[13px] font-semibold text-muted">Total expenses</span><span className="text-xl font-bold">{naira(d.expenses)}</span></div>
            <div className="flex flex-col gap-1"><span className="text-[13px] font-semibold text-muted">Closing balance</span><span className="text-xl font-bold">{naira(d.closing)}</span></div>
          </div>
          <Block label="Notes" value={d.notes} />
        </>
      )}
      {report.kind === "department" && (
        <>
          <Block label="Summary of the month" value={d.summary} />
          <Block label="Key achievements" value={d.achievements} />
          <Block label="Challenges" value={d.challenges} />
          <Block label="Plans for next month" value={d.plans} />
          {d.headcount && <Block label="Headcount" value={d.headcount} />}
        </>
      )}
      {report.kind === "new_members" && (
        <>
          <div className="flex flex-col gap-1"><span className="text-[13px] font-semibold text-muted">Number of new members</span><span className="text-2xl font-bold">{d.people?.length ?? 0}</span></div>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Phone</th><th>Date joined</th></tr></thead>
              <tbody>
                {(d.people ?? []).map((p, i) => (
                  <tr key={i}><td className="font-medium">{p.first} {p.last}</td><td>{p.phone}</td><td>{p.joined ? shortDate(p.joined, true) : "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <Block label="Follow-up notes" value={d.followup} />
        </>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-muted">Files</span>
        {attachments.length === 0 && <span className="text-[15px]">No files attached.</span>}
        {attachments.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3.5 py-2.5 text-sm">
            <span className="font-medium">{a.filename} <span className="font-normal text-muted">· {fmtSize(a.size)}</span></span>
            <a href={`/files/${a.id}`}>Download</a>
          </div>
        ))}
      </div>
    </div>
  );
}
