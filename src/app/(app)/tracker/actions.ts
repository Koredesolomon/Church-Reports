"use server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { dueDate, isOverdue, isPeriod, longDate, monthLabel } from "@/lib/periods";
import { headOf, notify } from "@/lib/reports";
import { UUID, refresh, type FormState } from "@/lib/action-utils";

export async function sendReminder(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const dept = String(fd.get("department"));
  const period = String(fd.get("period"));
  if (!UUID.test(dept) || !isPeriod(period)) return { error: "Invalid request." };
  const [r] = await sql<{ status: string }[]>`SELECT status FROM reports WHERE department_id = ${dept} AND period = ${period}`;
  if (r && r.status !== "draft") return { error: "That report has already been submitted." };
  if (!isOverdue(period)) return { error: "That report isn't late yet." };
  const head = await headOf(dept);
  if (!head) return { error: "This department has no active head to remind." };
  await notify(head, `Reminder: your ${monthLabel(period)} report is overdue`, `It was due on ${longDate(dueDate(period))}. Please submit it as soon as you can.`, { href: "/reports", kind: "reminder" });
  refresh();
  return { message: "Reminder sent." };
}
