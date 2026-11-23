import { getCurrentUser } from "@/lib/session";
import { CSV_COLUMNS, csvLine } from "@/lib/members";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.must_change_password || user.role !== "admin") return new Response("Not allowed", { status: 403 });
  const body = [
    csvLine(CSV_COLUMNS.map((c) => c[1])),
    csvLine(["Ada", "Obi", "Female", "1990-05-12", "Married", "0803 555 0100", "ada@example.com", "12 Example Street", "Chidi Obi", "0803 555 0101", "2024-03-09", "Active", "Yes", "Choir; Usher"]),
  ].join("\r\n");
  return new Response("﻿" + body + "\r\n", {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="member-list.csv"', "Cache-Control": "private, no-store" },
  });
}
