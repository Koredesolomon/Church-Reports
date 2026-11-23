import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { CSV_COLUMNS, STATUSES, csvLine } from "@/lib/members";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.must_change_password || user.role !== "admin") return new Response("Not allowed", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const status = ["active", "inactive", "transferred_out"].includes(sp.get("s") ?? "") ? sp.get("s")! : null;
  const dept = /^[0-9a-f-]{36}$/i.test(sp.get("d") ?? "") ? sp.get("d")! : null;
  const q = (sp.get("q") ?? "").trim().slice(0, 80);
  const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;

  const rows = await sql<Record<string, string | boolean | null>[]>`
    SELECT m.member_no, m.first_name, m.last_name, m.gender, m.date_of_birth, m.marital_status, m.phone, m.email, m.address, m.kin_name, m.kin_phone,
           m.date_joined, m.status, m.baptised,
           (SELECT string_agg(dp.name, '; ' ORDER BY dp.sort_order) FROM member_departments md JOIN departments dp ON dp.id = md.department_id WHERE md.member_id = m.id) AS departments
    FROM members m
    WHERE true ${status ? sql`AND m.status = ${status as "active"}` : sql``}
      ${dept ? sql`AND EXISTS (SELECT 1 FROM member_departments x WHERE x.member_id = m.id AND x.department_id = ${dept})` : sql``}
      ${q ? sql`AND (m.first_name || ' ' || m.last_name ILIKE ${like} OR m.member_no ILIKE ${like})` : sql``}
    ORDER BY lower(m.last_name), lower(m.first_name)`;

  const lines = [csvLine(["Member no.", ...CSV_COLUMNS.map((c) => c[1])])];
  for (const r of rows) {
    lines.push(csvLine([
      r.member_no, r.first_name, r.last_name, r.gender, r.date_of_birth, r.marital_status, r.phone, r.email, r.address, r.kin_name, r.kin_phone,
      r.date_joined, STATUSES[r.status as keyof typeof STATUSES], r.baptised === null ? "" : r.baptised ? "Yes" : "No", r.departments,
    ]));
  }
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="members.csv"', "Cache-Control": "private, no-store" },
  });
}
