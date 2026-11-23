"use server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { monthLabel } from "@/lib/periods";
import { getReport, headOf, notify, notifyRole } from "@/lib/reports";
import { UUID, refresh, type FormState } from "@/lib/action-utils";

/** intent = "approve" | "return". Only a submitted report can be reviewed. */
export async function reviewReport(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  if (!UUID.test(id)) return { error: "Report not found." };
  const report = await getReport(id);
  if (!report) return { error: "Report not found." };
  if (report.status !== "submitted") return { error: "This report has already been reviewed." };

  const comment = String(fd.get("comment") ?? "").trim();
  const intent = fd.get("intent");
  const head = await headOf(report.department_id);
  const month = monthLabel(report.period);

  if (intent === "return") {
    if (!comment) return { error: "Add a comment so the department knows what to fix." };
    await sql`UPDATE reports SET status = 'returned', reviewed_by = ${admin.id}, reviewed_at = now(), review_comment = ${comment}, updated_at = now() WHERE id = ${id}`;
    if (head) await notify(head, `Your ${month} report was returned`, comment, { href: `/reports/${id}`, kind: "returned" });
  } else if (intent === "approve") {
    await sql`UPDATE reports SET status = 'approved', reviewed_by = ${admin.id}, reviewed_at = now(), review_comment = ${comment || null}, updated_at = now() WHERE id = ${id}`;
    if (head) await notify(head, `Your ${month} report was approved`, comment || undefined, { href: `/reports/${id}`, kind: "approved" });
    await notifyRole("leadership", `${report.department} ${month} report approved`, undefined, { href: `/reports/${id}`, kind: "approved" });
  } else {
    return { error: "Choose Approve or Return with comment." };
  }
  refresh();
  return { message: intent === "approve" ? "Approved and archived." : "Returned to the department." };
}

/** After approving a New members report: add its people to the member database (skipping known phone numbers). */
export async function addNewMembers(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  if (!UUID.test(id)) return { error: "Report not found." };
  const report = await getReport(id);
  if (!report || report.kind !== "new_members" || report.status !== "approved") return { error: "Approve the report first." };
  if (report.data.imported_at) return { error: "These people were already added." };

  let added = 0, skipped = 0;
  for (const p of report.data.people ?? []) {
    const rows = await sql`
      INSERT INTO members (first_name, last_name, phone, date_joined, created_by, updated_by)
      VALUES (${p.first}, ${p.last}, ${p.phone}, ${p.joined || null}, ${admin.id}, ${admin.id})
      ON CONFLICT DO NOTHING RETURNING id`;
    if (rows.length) added++; else skipped++;
  }
  await sql`UPDATE reports SET data = data || ${sql.json({ imported_at: new Date().toISOString() })} WHERE id = ${id}`;
  refresh();
  return { message: `Added ${added} ${added === 1 ? "member" : "members"}${skipped ? `; ${skipped} already in the database (same phone number)` : ""}.` };
}
