import Link from "next/link";
import { requireStaff } from "@/lib/dal";
import { sql } from "@/lib/db";
import { deptLabel } from "@/lib/config";
import { availableYears, reportsForYear, summarise } from "@/lib/annual";
import { churchYearLabel, churchYearOf, churchYearPeriods } from "@/lib/church-year";
import { currentPeriod, isOverdue, monthLabel, monthShort } from "@/lib/periods";
import { trackingStart } from "@/lib/reports";
import ParamSelect from "@/components/param-select";
import PrintButton from "@/components/print-button";
import { PageHeader, Section } from "@/components/ui";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

const CELL = {
  approved: { mark: "✓", cls: "s-approved", label: "Approved" },
  waiting: { mark: "…", cls: "s-submitted", label: "Not approved yet" },
  late: { mark: "!", cls: "s-late", label: "Late, not submitted" },
  none: { mark: "–", cls: "s-none", label: "No report due" },
} as const;

// Whole naira show without decimals; amounts with kobo show both digits.
const money = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

export default async function AnnualSummary({ searchParams }: PageProps<"/annual">) {
  await requireStaff();
  const sp = await searchParams;
  const start = await trackingStart();
  const years = await availableYears(start);
  const asked = Number(typeof sp.y === "string" ? sp.y : NaN);
  const year = years.includes(asked) ? asked : churchYearOf(currentPeriod());
  const months = churchYearPeriods(year);

  const [reports, departments] = await Promise.all([
    reportsForYear(year),
    sql<{ id: string; name: string; full_name: string | null }[]>`SELECT id, name, full_name FROM departments WHERE active ORDER BY sort_order, name`,
  ]);
  const s = summarise(reports);
  const status = new Map(reports.map((r) => [`${r.department_id}|${r.period}`, r.status]));

  const cellFor = (dept: string, period: string): keyof typeof CELL => {
    const st = status.get(`${dept}|${period}`);
    if (st === "approved") return "approved";
    if (st === "submitted" || st === "returned") return "waiting";
    return period >= start && isOverdue(period) ? "late" : "none";
  };

  const stat = (label: string, value: string, sub: string) => (
    <div className="card flex flex-[1_1_200px] flex-col gap-1 px-5 py-4">
      <span className="text-sm text-ink-2">{label}</span>
      <span className="text-[26px] font-bold tracking-tight">{value}</span>
      <span className="text-[13px] text-muted">{sub}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-7">
      <PageHeader title="Annual summary" sub={`${churchYearLabel(year)} · approved reports only`}>
        <div className="no-print flex flex-wrap items-end gap-3">
          <ParamSelect param="y" label="Year" value={String(year)} options={years.map((y) => ({ value: String(y), label: churchYearLabel(y) }))} />
          <a className="btn ghost" href={`/annual/export?y=${year}`}>Export (CSV)</a>
          <PrintButton />
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-4">
        {stat("Approved reports", String(s.approvedCount), "In this year")}
        {stat("Total income", money(s.income), `From ${s.finance.length} of 12 months`)}
        {stat("Total expenses", money(s.expenses), `From ${s.finance.length} of 12 months`)}
        {stat("Closing balance", s.closing?.closing != null ? money(s.closing.closing) : "—", s.closing ? `As at ${monthLabel(s.closing.period)}` : "No financial report yet")}
        {stat("New members", String(s.newMembers), `From ${s.members.length} of 12 months`)}
      </div>

      <Section title="Submissions by department">
        <ul className="m-0 flex list-none flex-wrap gap-4 px-6 pb-2 text-[13px] text-ink-2" aria-label="Key">
          {Object.values(CELL).map((c) => <li key={c.label} className="flex items-center gap-2"><span aria-hidden className={`chip ${c.cls} !px-2`}>{c.mark}</span>{c.label}</li>)}
        </ul>
        <div className="overflow-x-auto px-2.5 pb-2.5">
          <table className="tbl min-w-[760px]">
            <thead><tr><th>Department</th>{months.map((m) => <th key={m} className="!px-1 text-center">{monthShort(m)}</th>)}<th className="text-right">Approved</th></tr></thead>
            <tbody>
              {departments.map((d) => {
                const cells = months.map((m) => cellFor(d.id, m));
                return (
                  <tr key={d.id}>
                    <td className="font-semibold" title={deptLabel(d)}>{d.name}</td>
                    {cells.map((c, i) => (
                      <td key={months[i]} className="!px-1 text-center">
                        <span className={`chip ${CELL[c].cls} !w-7 !justify-center !px-0`} role="img" aria-label={`${monthLabel(months[i])}: ${CELL[c].label}`} title={`${monthLabel(months[i])}: ${CELL[c].label}`}>{CELL[c].mark}</span>
                      </td>
                    ))}
                    <td className="text-right font-semibold">{cells.filter((c) => c === "approved").length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="flex flex-wrap items-start gap-6">
        <Section title="Finance by month" className="min-w-0 flex-[2_1_420px]">
          <div className="overflow-x-auto px-2.5 pb-2.5">
            <table className="tbl">
              <thead><tr><th>Month</th><th className="text-right">Income</th><th className="text-right">Expenses</th><th className="text-right">Closing balance</th></tr></thead>
              <tbody>
                {s.finance.map((f) => (
                  <tr key={f.period}><td>{monthLabel(f.period)}</td><td className="text-right">{money(f.income)}</td><td className="text-right">{money(f.expenses)}</td><td className="text-right">{f.closing != null ? money(f.closing) : "—"}</td></tr>
                ))}
                {s.finance.length > 0 && <tr><td className="font-bold">Total</td><td className="text-right font-bold">{money(s.income)}</td><td className="text-right font-bold">{money(s.expenses)}</td><td /></tr>}
                {s.finance.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted">No approved financial reports in this year yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
        <Section title="New members by month" className="min-w-0 flex-[1_1_260px]">
          <div className="overflow-x-auto px-2.5 pb-2.5">
            <table className="tbl">
              <thead><tr><th>Month</th><th className="text-right">New members</th></tr></thead>
              <tbody>
                {s.members.map((m) => <tr key={m.period}><td>{monthLabel(m.period)}</td><td className="text-right">{m.count}</td></tr>)}
                {s.members.length > 0 && <tr><td className="font-bold">Total</td><td className="text-right font-bold">{s.newMembers}</td></tr>}
                {s.members.length === 0 && <tr><td colSpan={2} className="py-6 text-center text-muted">No approved new members reports yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="dept-h">
        <h2 id="dept-h" className="m-0 text-lg font-bold">Department reports</h2>
        {s.departments.length === 0 && <p className="card m-0 p-6 text-center text-muted">No approved department reports in this year yet.</p>}
        {s.departments.map(([name, items]) => (
          <div key={name} className="card flex flex-col gap-4 p-6">
            <h3 className="m-0 text-base font-bold">{name} <span className="font-normal text-muted">· {items.length} approved</span></h3>
            {items.map((r) => (
              <div key={r.period} className="flex flex-col gap-2 border-t border-line-soft pt-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{monthLabel(r.period)}</span>
                  {r.data.headcount && <span className="text-[13px] text-muted">Headcount: {r.data.headcount}</span>}
                </div>
                {([["Achievements", r.data.achievements], ["Challenges", r.data.challenges]] as const).map(([label, text]) => (
                  <p key={label} className="m-0 text-sm leading-relaxed"><span className="font-semibold text-muted">{label}: </span><span className="whitespace-pre-wrap">{text?.trim() || "—"}</span></p>
                ))}
              </div>
            ))}
          </div>
        ))}
      </section>

      <p className="no-print m-0 text-sm text-muted">To read a full report, open it from the <Link href="/archive">Archive</Link>.</p>
    </div>
  );
}
