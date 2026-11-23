import "server-only";
import { sql } from "./db";
import { addMonths, isOverdue } from "./periods";
import type { ChipStatus } from "@/components/ui";

export type Kind = "department" | "financial" | "new_members";
export type Status = "draft" | "submitted" | "returned" | "approved";

export const KIND_LABEL: Record<Kind, string> = { department: "Department report", financial: "Financial", new_members: "New members" };
export const KIND_TITLE: Record<Kind, string> = { department: "Department report", financial: "Financial report", new_members: "New members report" };

export type Person = { first: string; last: string; phone: string; joined: string };
export type ReportData = {
  // department report
  summary?: string; achievements?: string; challenges?: string; plans?: string; headcount?: string;
  // financial
  income?: string; expenses?: string; closing?: string; notes?: string;
  // new members
  people?: Person[]; followup?: string; imported_at?: string;
};

export type ReportRow = {
  id: string;
  department_id: string;
  department: string;
  period: string;
  kind: Kind;
  status: Status;
  data: ReportData;
  submitted_by_name: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  updated_at: string;
  file_count: number;
};

const SELECT = sql`
  SELECT r.id, r.department_id, d.name AS department, r.period, r.kind, r.status, r.data,
         u.name AS submitted_by_name, to_char(r.submitted_at, 'YYYY-MM-DD') AS submitted_at,
         to_char(r.reviewed_at, 'YYYY-MM-DD') AS reviewed_at, r.review_comment,
         to_char(r.updated_at, 'YYYY-MM-DD HH24:MI') AS updated_at,
         (SELECT count(*)::int FROM report_attachments a WHERE a.report_id = r.id) AS file_count
  FROM reports r JOIN departments d ON d.id = r.department_id LEFT JOIN users u ON u.id = r.submitted_by`;

export async function getReport(id: string): Promise<ReportRow | null> {
  const [r] = await sql<ReportRow[]>`${SELECT} WHERE r.id = ${id}`;
  return r ?? null;
}

export type Attachment = { id: string; filename: string; size: number };
export async function getAttachments(reportId: string): Promise<Attachment[]> {
  return sql<Attachment[]>`SELECT id, filename, size FROM report_attachments WHERE report_id = ${reportId} ORDER BY created_at`;
}

/** A report's chip: a draft or missing report past its due date shows as Late. */
export function chipFor(status: Status | null | undefined, period: string): ChipStatus {
  if (!status) return isOverdue(period) ? "late" : "none";
  if ((status === "draft") && isOverdue(period)) return "late";
  return status;
}

export function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function parseMoney(v: string | undefined): number | null {
  const s = (v ?? "").replace(/[,\s₦]/g, "");
  return /^\d+(\.\d{1,2})?$/.test(s) ? Number(s) : null;
}
export const naira = (v: string | undefined) => {
  const n = parseMoney(v);
  return n === null ? (v || "—") : `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
};

/** Returns an error message when a report isn't complete enough to submit. */
export function validateForSubmit(kind: Kind, d: ReportData): string | null {
  if (kind === "financial") {
    for (const [k, label] of [["income", "Total income"], ["expenses", "Total expenses"], ["closing", "Closing balance"]] as const) {
      if (parseMoney(d[k]) === null) return `${label} must be an amount in naira, for example 2,480,000.`;
    }
    return null;
  }
  if (kind === "new_members") {
    const people = d.people ?? [];
    if (people.length === 0) return "Add at least one new member, or leave the report as a draft.";
    for (const [i, p] of people.entries()) {
      if (!p.first.trim() || !p.last.trim() || !p.phone.trim() || !p.joined) return `Person ${i + 1}: fill in the first name, last name, phone and date joined.`;
    }
    return null;
  }
  for (const [k, label] of [["summary", "Summary of the month"], ["achievements", "Key achievements"], ["challenges", "Challenges"], ["plans", "Plans for next month"]] as const) {
    if (!(d[k] ?? "").trim()) return `${label} is required.`;
  }
  return null;
}

export function readData(kind: Kind, fd: FormData): ReportData {
  const t = (k: string) => String(fd.get(k) ?? "").trim();
  if (kind === "financial") return { income: t("income"), expenses: t("expenses"), closing: t("closing"), notes: t("notes") };
  if (kind === "new_members") {
    const first = fd.getAll("first"), last = fd.getAll("last"), phone = fd.getAll("phone"), joined = fd.getAll("joined");
    const people: Person[] = first.map((_, i) => ({
      first: String(first[i]).trim(), last: String(last[i] ?? "").trim(), phone: String(phone[i] ?? "").trim(), joined: String(joined[i] ?? ""),
    })).filter((p) => p.first || p.last || p.phone || p.joined);
    return { people, followup: t("followup") };
  }
  return { summary: t("summary"), achievements: t("achievements"), challenges: t("challenges"), plans: t("plans"), headcount: t("headcount") };
}

export type NotifyKind = "submitted" | "approved" | "returned" | "reminder" | "info";

export async function notify(userId: string, title: string, body?: string, opts: { href?: string; kind?: NotifyKind } = {}) {
  await sql`INSERT INTO notifications (user_id, title, body, href, kind)
            VALUES (${userId}, ${title}, ${body ?? null}, ${opts.href ?? null}, ${opts.kind ?? "info"})`;
}

/** Notify every active user with a role (e.g. all admins). */
export async function notifyRole(role: "admin" | "leadership", title: string, body?: string, opts: { href?: string; kind?: NotifyKind } = {}) {
  await sql`INSERT INTO notifications (user_id, title, body, href, kind)
            SELECT id, ${title}, ${body ?? null}, ${opts.href ?? null}, ${opts.kind ?? "info"}
            FROM users WHERE role = ${role} AND active`;
}

export async function headOf(departmentId: string): Promise<string | null> {
  const [u] = await sql<{ id: string }[]>`SELECT id FROM users WHERE department_id = ${departmentId} AND role = 'head' AND active`;
  return u?.id ?? null;
}

/**
 * The first month that can be "late": the month before the system was first used (its report is due right after).
 * Earlier months show as not tracked, so a new install doesn't open with a wall of Late.
 */
export async function trackingStart(): Promise<string> {
  const [r] = await sql<{ m: string }[]>`SELECT to_char(date_trunc('month', min(created_at)), 'YYYY-MM-01') AS m FROM users`;
  return addMonths(r?.m ?? "1970-01-01", -1);
}
