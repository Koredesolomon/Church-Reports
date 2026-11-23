"use server";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requireHead } from "@/lib/dal";
import { currentPeriod, isPeriod, monthLabel, recentPeriods } from "@/lib/periods";
import { getReport, notifyRole, readData, validateForSubmit, type Kind } from "@/lib/reports";
import { UUID, refresh, type FormState } from "@/lib/action-utils";

import { MAX_FILES_PER_REPORT as MAX_FILES, MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/limits";
const ALLOWED = new Set(["pdf", "xls", "xlsx", "csv", "png", "jpg", "jpeg", "gif", "webp"]);

/** Starts a report for the chosen month (field `period`): this reporting month or any of the previous eleven. */
export async function startReport(formData: FormData): Promise<void> {
  const user = await requireHead();
  const [dept] = await sql<{ report_kind: Kind }[]>`SELECT report_kind FROM departments WHERE id = ${user.department_id}`;
  const asked = String(formData.get("period") ?? "");
  const period = isPeriod(asked) && recentPeriods(12).includes(asked) ? asked : currentPeriod();
  await sql`INSERT INTO reports (department_id, period, kind, created_by)
            VALUES (${user.department_id}, ${period}, ${dept.report_kind}, ${user.id})
            ON CONFLICT (department_id, period) DO NOTHING`;
  const [r] = await sql<{ id: string }[]>`SELECT id FROM reports WHERE department_id = ${user.department_id} AND period = ${period}`;
  redirect(`/reports/${r.id}`);
}

/** intent = "draft" | "submit" */
export async function saveReport(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireHead();
  const id = String(fd.get("id"));
  if (!UUID.test(id)) return { error: "Report not found." };
  const report = await getReport(id);
  // Heads can only change their own department's report, and only while it is a draft or has been returned.
  if (!report || report.department_id !== user.department_id) return { error: "Report not found." };
  if (report.status !== "draft" && report.status !== "returned") return { error: "This report is locked." };

  const data = readData(report.kind, fd);
  const submitting = fd.get("intent") === "submit";
  if (submitting) {
    const problem = validateForSubmit(report.kind, data);
    if (problem) return { error: problem };
  }

  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length) {
    const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM report_attachments WHERE report_id = ${id}`;
    if (n + files.length > MAX_FILES) return { error: `A report can have up to ${MAX_FILES} files.` };
    if (files.reduce((sum, f) => sum + f.size, 0) > MAX_UPLOAD_BYTES) {
      return { error: `Attach up to ${MAX_UPLOAD_LABEL} of files at a time. Save, then attach the rest.` };
    }
    for (const f of files) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED.has(ext)) return { error: `${f.name}: use a PDF, Excel or image file.` };
    }
    for (const f of files) {
      await sql`INSERT INTO report_attachments (report_id, filename, content_type, size, data, uploaded_by)
                VALUES (${id}, ${f.name.slice(0, 200)}, ${f.type || "application/octet-stream"}, ${f.size}, ${Buffer.from(await f.arrayBuffer())}, ${user.id})`;
    }
  }

  if (submitting) {
    await sql`UPDATE reports SET data = ${sql.json(data)}, status = 'submitted', submitted_by = ${user.id},
              submitted_at = now(), updated_at = now() WHERE id = ${id}`;
    await notifyRole("admin", `${report.department} submitted a report`, `${monthLabel(report.period)} · ready for review`, { href: `/reviews?m=${report.period}&id=${id}`, kind: "submitted" });
    refresh();
    redirect("/reports");
  }
  await sql`UPDATE reports SET data = ${sql.json(data)}, updated_at = now() WHERE id = ${id}`;
  refresh();
  return { message: files.length ? "Draft saved, files attached." : "Draft saved." };
}

export async function removeAttachment(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireHead();
  const id = String(fd.get("attachment"));
  if (!UUID.test(id)) return { error: "File not found." };
  await sql`DELETE FROM report_attachments a USING reports r
            WHERE a.id = ${id} AND r.id = a.report_id AND r.department_id = ${user.department_id}
              AND r.status IN ('draft', 'returned')`;
  refresh();
  return { message: "File removed." };
}

export async function markAllRead(): Promise<void> {
  const user = await requireHead();
  await sql`UPDATE notifications SET read_at = now() WHERE user_id = ${user.id} AND read_at IS NULL`;
  refresh();
}
