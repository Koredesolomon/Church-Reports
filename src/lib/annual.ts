import "server-only";
import { sql } from "./db";
import { parseMoney, type Kind, type ReportData, type Status } from "./reports";
import { churchYearOf, churchYearPeriods } from "./church-year";
import { currentPeriod } from "./periods";

export type YearReport = {
  department_id: string;
  department: string;
  period: string;
  kind: Kind;
  status: Status;
  data: ReportData; // only filled in for approved reports
  approved_on: string | null;
};

/** Every report in the year. Contents are loaded for APPROVED reports only, so nothing else can reach the totals. */
export async function reportsForYear(year: number): Promise<YearReport[]> {
  const months = churchYearPeriods(year);
  return sql<YearReport[]>`
    SELECT r.department_id, d.name AS department, r.period, r.kind, r.status,
           CASE WHEN r.status = 'approved' THEN r.data ELSE '{}'::jsonb END AS data,
           CASE WHEN r.status = 'approved' THEN to_char(lagos(r.reviewed_at), 'YYYY-MM-DD') END AS approved_on
    FROM reports r JOIN departments d ON d.id = r.department_id
    WHERE r.period >= ${months[0]} AND r.period <= ${months[11]}
    ORDER BY d.sort_order, d.name, r.period`;
}

/** Years worth offering: from the first one with an approved report (or the first one in use) up to the current one. */
export async function availableYears(start: string): Promise<number[]> {
  const [r] = await sql<{ first: string | null }[]>`SELECT min(period)::text AS first FROM reports WHERE status = 'approved'`;
  const current = churchYearOf(currentPeriod());
  const first = Math.min(churchYearOf(r?.first && r.first < start ? r.first : start), current);
  return Array.from({ length: current - first + 1 }, (_, i) => first + i);
}

/** Totals from the approved reports. */
export function summarise(reports: YearReport[]) {
  const approved = reports.filter((r) => r.status === "approved");

  const finance = approved
    .filter((r) => r.kind === "financial")
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((r) => ({ period: r.period, income: parseMoney(r.data.income) ?? 0, expenses: parseMoney(r.data.expenses) ?? 0, closing: parseMoney(r.data.closing) }));
  // Add in kobo so decimals don't drift.
  const sum = (key: "income" | "expenses") => finance.reduce((t, f) => t + Math.round(f[key] * 100), 0) / 100;

  const members = approved
    .filter((r) => r.kind === "new_members")
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((r) => ({ period: r.period, count: r.data.people?.length ?? 0 }));

  const departments = new Map<string, YearReport[]>();
  for (const r of approved.filter((x) => x.kind === "department")) {
    departments.set(r.department, [...(departments.get(r.department) ?? []), r]);
  }

  return {
    approvedCount: approved.length,
    finance,
    income: sum("income"),
    expenses: sum("expenses"),
    closing: finance.length ? finance[finance.length - 1] : null, // latest approved month's closing balance
    members,
    newMembers: members.reduce((t, m) => t + m.count, 0),
    departments: [...departments.entries()],
  };
}
