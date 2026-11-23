import { requireAdmin } from "@/lib/dal";
import { sql } from "@/lib/db";
import { addMonths, currentPeriod, isPeriod, monthLabel, monthName, recentPeriods } from "@/lib/periods";
import { chipFor, trackingStart, type Status } from "@/lib/reports";
import ActionForm from "@/components/action-form";
import { Chip, PageHeader, Section } from "@/components/ui";
import { sendReminder } from "./actions";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

export default async function Tracker({ searchParams }: PageProps<"/tracker">) {
  await requireAdmin();
  const sp = await searchParams;
  const m = typeof sp.m === "string" && isPeriod(sp.m) ? sp.m : currentPeriod();
  const cols = [3, 2, 1, 0].map((i) => addMonths(m, -i)); // oldest to newest
  const start = await trackingStart();
  const [depts, reports] = await Promise.all([
    sql<{ id: string; name: string }[]>`SELECT id, name FROM departments WHERE active ORDER BY sort_order, name`,
    sql<{ department_id: string; period: string; status: Status }[]>`SELECT department_id, period, status FROM reports WHERE period = ANY(${cols})`,
  ]);
  const at = new Map(reports.map((r) => [`${r.department_id}|${r.period}`, r.status]));
  const counts = { approved: 0, submitted: 0, returned: 0, late: 0 };
  for (const d of depts) {
    const chip = chipFor(at.get(`${d.id}|${m}`), m);
    if (m >= start && chip === "approved" || chip === "submitted" || chip === "returned" || chip === "late") counts[chip]++;
  }
  const periods = recentPeriods(12);

  const stat = (n: number, label: string, late = false) => (
    <div className={`card flex flex-[1_1_160px] flex-col gap-1 px-5 py-4 ${late ? "!border-[#f0b8b8]" : ""}`}>
      <span className={`text-[28px] font-bold ${late ? "text-late-ink" : ""}`}>{n}</span>
      <span className="text-sm text-ink-2">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-7">
      <PageHeader title="Missing reports" sub="Who has and has not submitted, by department and month.">
        <form method="get" className="compact flex items-end gap-2">
          <div className="field !flex-none"><label htmlFor="m">Current month</label>
            <select id="m" name="m" defaultValue={m}>{periods.map((p) => <option key={p} value={p}>{monthLabel(p)}</option>)}</select>
          </div>
          <button className="btn ghost !h-11">Show</button>
        </form>
      </PageHeader>
      <div className="flex flex-wrap gap-4">
        {stat(counts.approved, "Approved")}{stat(counts.submitted, "Waiting for review")}{stat(counts.returned, "Returned")}{stat(counts.late, "Late, not submitted", true)}
      </div>
      <Section title="All departments, last four months">
        <div className="overflow-x-auto px-2.5 pb-2.5">
          <table className="tbl min-w-[640px]">
            <thead><tr><th>Department</th>{cols.map((c) => <th key={c}>{monthName(c)}</th>)}<th /></tr></thead>
            <tbody>
              {depts.map((d) => {
                const last = chipFor(at.get(`${d.id}|${m}`), m);
                return (
                  <tr key={d.id}>
                    <td className="font-semibold">{d.name}</td>
                    {cols.map((c) => <td key={c}>{c < start && !at.has(`${d.id}|${c}`) ? <span className="text-muted" title="Before the system was in use">—</span> : <Chip status={chipFor(at.get(`${d.id}|${c}`), c)} />}</td>)}
                    <td>
                      {last === "late" && m >= start && (
                        <ActionForm action={sendReminder} className="flex items-center gap-2">
                          <input type="hidden" name="department" value={d.id} /><input type="hidden" name="period" value={m} />
                          <button className="linkbtn">Send reminder</button>
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
