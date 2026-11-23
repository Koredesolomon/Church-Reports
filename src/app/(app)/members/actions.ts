"use server";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { UUID, refresh, type FormState } from "@/lib/action-utils";
import { CSV_COLUMNS, departmentsForMembers, parseCsv, phoneIndex, validateMember, type MemberInput, type Raw } from "@/lib/members";

const FIELDS = ["first_name", "last_name", "gender", "date_of_birth", "marital_status", "phone", "email", "address", "kin_name", "kin_phone", "date_joined", "status", "baptised", "notes"];

function readForm(fd: FormData): { raw: Raw; deptIds: string[] } {
  const raw: Raw = {};
  for (const k of FIELDS) raw[k] = String(fd.get(k) ?? "");
  return { raw, deptIds: fd.getAll("dept").map(String).filter((d) => UUID.test(d)) };
}

/** Creates (no id) or updates a member. */
export async function saveMember(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const editing = UUID.test(id);
  const { raw, deptIds } = readForm(fd);

  const depts = await departmentsForMembers();
  let selfKey: string | undefined;
  if (editing) {
    const [cur] = await sql<{ k: string }[]>`SELECT regexp_replace(phone, '\D', '', 'g') AS k FROM members WHERE id = ${id}`;
    if (!cur) return { error: "Member not found." };
    selfKey = cur.k;
  }
  const res = validateMember(raw, depts, await phoneIndex(), selfKey);
  if ("error" in res) return { error: res.error + "." };
  const v = res.value;

  let memberId = id;
  await sql.begin(async (tx) => {
    if (editing) {
      await tx`UPDATE members SET first_name = ${v.first_name}, last_name = ${v.last_name}, gender = ${v.gender}, date_of_birth = ${v.date_of_birth},
        marital_status = ${v.marital_status}, phone = ${v.phone}, email = ${v.email}, address = ${v.address}, kin_name = ${v.kin_name},
        kin_phone = ${v.kin_phone}, date_joined = ${v.date_joined}, status = ${v.status}, baptised = ${v.baptised}, notes = ${v.notes},
        updated_by = ${admin.id}, updated_at = now() WHERE id = ${id}`;
    } else {
      const [m] = await tx<{ id: string }[]>`INSERT INTO members (first_name, last_name, gender, date_of_birth, marital_status, phone, email, address,
        kin_name, kin_phone, date_joined, status, baptised, notes, created_by, updated_by)
        VALUES (${v.first_name}, ${v.last_name}, ${v.gender}, ${v.date_of_birth}, ${v.marital_status}, ${v.phone}, ${v.email}, ${v.address},
        ${v.kin_name}, ${v.kin_phone}, ${v.date_joined}, ${v.status}, ${v.baptised}, ${v.notes}, ${admin.id}, ${admin.id}) RETURNING id`;
      memberId = m.id;
    }
    await tx`DELETE FROM member_departments WHERE member_id = ${memberId}`;
    const ids = deptIds.filter((d) => depts.some((x) => x.id === d));
    if (ids.length) await tx`INSERT INTO member_departments (member_id, department_id) SELECT ${memberId}, unnest(${ids}::uuid[])`;
  });
  refresh();
  redirect(`/members?id=${memberId}`);
}

/** intent = "inactive" | "active" */
export async function setMemberStatus(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const status = fd.get("intent") === "active" ? "active" : "inactive";
  if (!UUID.test(id)) return { error: "Member not found." };
  await sql`UPDATE members SET status = ${status}, updated_by = ${admin.id}, updated_at = now() WHERE id = ${id}`;
  refresh();
  return { message: status === "active" ? "Reactivated." : "Deactivated." };
}

// ---------- CSV import ----------
export type ImportPreview = {
  error?: string;
  total: number;
  ready: number;
  header: string[];
  problems: { row: number; problem: string; cells: string[] }[];
};

const MAX_ROWS = 5000;

async function analyse(text: string) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "The file has no member rows." as const };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  // Map each known column to its position (by display label or key)
  const pos = new Map<string, number>();
  for (const [key, label] of CSV_COLUMNS) {
    const i = header.findIndex((h) => h === label.toLowerCase() || h === key);
    if (i >= 0) pos.set(key, i);
  }
  for (const need of ["first_name", "last_name", "phone"]) if (!pos.has(need)) return { error: `The file needs a "${CSV_COLUMNS.find((c) => c[0] === need)![1]}" column. Download the template to see the format.` as const };
  const data = rows.slice(1);
  if (data.length > MAX_ROWS) return { error: `That file has ${data.length} rows. Import up to ${MAX_ROWS} at a time.` as const };

  const depts = await departmentsForMembers();
  const known = await phoneIndex();
  const good: { value: MemberInput; departmentIds: string[] }[] = [];
  const problems: ImportPreview["problems"] = [];
  const seenInFile = new Map<string, number>();

  data.forEach((cells, i) => {
    const raw: Raw = {};
    for (const [key, idx] of pos) raw[key] = cells[idx] ?? "";
    const res = validateMember(raw, depts, known);
    const rowNo = i + 2; // spreadsheet row: the header is row 1
    if ("error" in res) { problems.push({ row: rowNo, problem: res.error, cells }); return; }
    const k = res.value.phone.replace(/\D/g, "");
    if (seenInFile.has(k)) { problems.push({ row: rowNo, problem: `Phone number is repeated in this file (row ${seenInFile.get(k)})`, cells }); return; }
    seenInFile.set(k, rowNo);
    good.push({ value: res.value, departmentIds: res.departmentIds });
  });
  return { header: rows[0], total: data.length, good, problems, depts };
}

export async function previewImport(text: string): Promise<ImportPreview> {
  await requireAdmin();
  const a = await analyse(String(text));
  if ("error" in a) return { error: a.error, total: 0, ready: 0, header: [], problems: [] };
  return { total: a.total, ready: a.good.length, header: a.header, problems: a.problems.slice(0, 500) };
}

export async function confirmImport(text: string): Promise<{ error?: string; imported?: number; skipped?: number }> {
  const admin = await requireAdmin();
  const a = await analyse(String(text));
  if ("error" in a) return { error: a.error };
  await sql.begin(async (tx) => {
    for (const g of a.good) {
      const v = g.value;
      const [m] = await tx<{ id: string }[]>`INSERT INTO members (first_name, last_name, gender, date_of_birth, marital_status, phone, email, address,
        kin_name, kin_phone, date_joined, status, baptised, notes, created_by, updated_by)
        VALUES (${v.first_name}, ${v.last_name}, ${v.gender}, ${v.date_of_birth}, ${v.marital_status}, ${v.phone}, ${v.email}, ${v.address},
        ${v.kin_name}, ${v.kin_phone}, ${v.date_joined}, ${v.status}, ${v.baptised}, ${v.notes}, ${admin.id}, ${admin.id})
        ON CONFLICT DO NOTHING RETURNING id`;
      if (m && g.departmentIds.length) await tx`INSERT INTO member_departments (member_id, department_id) SELECT ${m.id}, unnest(${g.departmentIds}::uuid[])`;
    }
  });
  refresh();
  return { imported: a.good.length, skipped: a.problems.length };
}
