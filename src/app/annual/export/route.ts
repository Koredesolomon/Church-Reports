import { getCurrentUser } from "@/lib/session";
import { reportsForYear } from "@/lib/annual";
import { csvEscape } from "@/lib/archive";
import { KIND_LABEL, parseMoney } from "@/lib/reports";
import { churchYearOf } from "@/lib/church-year";
import { currentPeriod, monthLabel } from "@/lib/periods";

/** One row per APPROVED report in the church year. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.must_change_password || user.role === "head") return new Response("Not allowed", { status: 403 });
  const y = Number(new URL(req.url).searchParams.get("y"));
  const year = Number.isInteger(y) && y > 2000 && y < 2200 ? y : churchYearOf(currentPeriod());

  const rows = (await reportsForYear(year)).filter((r) => r.status === "approved").sort((a, b) => a.period.localeCompare(b.period) || a.department.localeCompare(b.department));
  const lines = [["Month", "Department", "Report", "Income", "Expenses", "Closing balance", "New members", "Headcount", "Summary", "Achievements", "Challenges", "Plans", "Notes", "Approved on"].join(",")];
  for (const r of rows) {
    const d = r.data;
    const amount = (v?: string) => parseMoney(v) ?? "";
    lines.push([
      monthLabel(r.period), r.department, KIND_LABEL[r.kind], amount(d.income), amount(d.expenses), amount(d.closing),
      r.kind === "new_members" ? (d.people?.length ?? 0) : "", d.headcount ?? "", d.summary ?? "", d.achievements ?? "", d.challenges ?? "", d.plans ?? "", d.notes ?? d.followup ?? "", r.approved_on ?? "",
    ].map(csvEscape).join(","));
  }
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="annual-${year}-${year + 1}.csv"`, "Cache-Control": "private, no-store" },
  });
}
