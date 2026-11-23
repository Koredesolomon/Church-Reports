import { getCurrentUser } from "@/lib/session";
import { csvEscape, queryArchive, readFilters } from "@/lib/archive";
import { KIND_LABEL } from "@/lib/reports";
import { longDate, monthLabel } from "@/lib/periods";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.must_change_password || user.role === "head") return new Response("Not allowed", { status: 403 });
  const f = readFilters(Object.fromEntries(new URL(req.url).searchParams), user.role === "admin");
  const { rows } = await queryArchive(f, { all: true });
  const lines = [["Month", "Department", "Report", "Status", "Approved on", "Files"].join(",")];
  for (const r of rows) {
    lines.push([monthLabel(r.period), r.department, KIND_LABEL[r.kind], r.status, r.reviewed_at && r.status === "approved" ? longDate(r.reviewed_at) : "", r.file_count].map(csvEscape).join(","));
  }
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="archive.csv"', "Cache-Control": "private, no-store" },
  });
}
