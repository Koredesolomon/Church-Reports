import "server-only";
import { sql } from "./db";
import { todayStr } from "./periods";
import { csvEscape } from "./archive";

export const STATUSES = { active: "Active", inactive: "Inactive", transferred_out: "Transferred out" } as const;
export type MemberStatus = keyof typeof STATUSES;
export const GENDERS = ["Female", "Male"] as const;
export const MARITAL = ["Single", "Married", "Widowed", "Divorced"] as const;

export type MemberInput = {
  first_name: string; last_name: string; gender: string | null; date_of_birth: string | null; marital_status: string | null;
  phone: string; email: string | null; address: string | null; kin_name: string | null; kin_phone: string | null;
  date_joined: string | null; status: MemberStatus; baptised: boolean | null; notes: string | null;
};

const digits = (s: string) => s.replace(/\D/g, "");

/** Accepts YYYY-MM-DD or DD/MM/YYYY; returns ISO, or null when it isn't a real date. */
export function parseDate(v: string): string | null {
  const s = v.trim();
  let y: number, m: number, d: number;
  let mt = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (mt) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  else if ((mt = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) { d = +mt[1]; m = +mt[2]; y = +mt[3]; }
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export type Raw = Record<string, string | undefined>;
export type DeptRef = { id: string; name: string };

/**
 * Validates one member's fields (from the form or one CSV row).
 * `knownPhones` maps a digits-only phone to its member number so duplicates can be named.
 */
export function validateMember(raw: Raw, depts: DeptRef[], knownPhones: Map<string, string>, selfPhoneKey?: string):
  { error: string } | { value: MemberInput; departmentIds: string[] } {
  const t = (k: string) => (raw[k] ?? "").trim();
  const nul = (k: string) => t(k) || null;
  const today = todayStr();

  if (!t("first_name")) return { error: "First name is missing" };
  if (!t("last_name")) return { error: "Last name is missing" };
  if (!t("phone")) return { error: "Phone number is missing" };
  if (digits(t("phone")).length < 7) return { error: "Phone number is not valid" };
  const key = digits(t("phone"));
  const dup = knownPhones.get(key);
  if (dup && key !== selfPhoneKey) return { error: `Phone number already exists (${dup})` };

  let dob: string | null = null;
  if (t("date_of_birth")) {
    dob = parseDate(t("date_of_birth"));
    if (!dob) return { error: "Date of birth is not a valid date" };
    if (dob > today) return { error: "Date of birth is in the future" };
  }
  let joined: string | null = null;
  if (t("date_joined")) {
    joined = parseDate(t("date_joined"));
    if (!joined) return { error: "Date joined is not a valid date" };
    if (joined > today) return { error: "Date joined is in the future" };
  }
  const gender = t("gender") ? GENDERS.find((g) => g.toLowerCase() === t("gender").toLowerCase()) : null;
  if (t("gender") && !gender) return { error: "Gender must be Female or Male" };
  const marital = t("marital_status") ? MARITAL.find((g) => g.toLowerCase() === t("marital_status").toLowerCase()) : null;
  if (t("marital_status") && !marital) return { error: "Marital status must be Single, Married, Widowed or Divorced" };

  let status: MemberStatus = "active";
  if (t("status")) {
    const hit = (Object.entries(STATUSES) as [MemberStatus, string][]).find(([, l]) => l.toLowerCase() === t("status").toLowerCase());
    if (!hit) return { error: "Status must be Active, Inactive or Transferred out" };
    status = hit[0];
  }
  let baptised: boolean | null = null;
  if (t("baptised")) {
    const b = t("baptised").toLowerCase();
    if (!["yes", "no"].includes(b)) return { error: "Baptised must be Yes or No" };
    baptised = b === "yes";
  }

  const departmentIds: string[] = [];
  for (const name of (raw.departments ?? "").split(/[;|]/).map((s) => s.trim()).filter(Boolean)) {
    const d = depts.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!d) {
      const near = depts.find((x) => x.name.toLowerCase().startsWith(name.toLowerCase().replace(/s$/, "")) || name.toLowerCase().startsWith(x.name.toLowerCase()));
      return { error: `Department "${name}" does not exist${near ? `. Did you mean ${near.name}?` : ""}` };
    }
    departmentIds.push(d.id);
  }

  return {
    departmentIds,
    value: {
      first_name: t("first_name"), last_name: t("last_name"), gender: gender ?? null, date_of_birth: dob, marital_status: marital ?? null,
      phone: t("phone"), email: nul("email"), address: nul("address"), kin_name: nul("kin_name"), kin_phone: nul("kin_phone"),
      date_joined: joined, status, baptised, notes: nul("notes"),
    },
  };
}

export async function phoneIndex(): Promise<Map<string, string>> {
  const rows = await sql<{ k: string; member_no: string }[]>`SELECT regexp_replace(phone, '\D', '', 'g') AS k, member_no FROM members`;
  return new Map(rows.map((r) => [r.k, r.member_no]));
}

export async function departmentsForMembers(): Promise<DeptRef[]> {
  return sql<DeptRef[]>`SELECT id, name FROM departments WHERE active ORDER BY sort_order, name`;
}

/** Minimal CSV parser: quotes, escaped quotes, CRLF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && s[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.some((c) => c.trim())) rows.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export const CSV_COLUMNS = [
  ["first_name", "First name"], ["last_name", "Last name"], ["gender", "Gender"], ["date_of_birth", "Date of birth"], ["marital_status", "Marital status"],
  ["phone", "Phone"], ["email", "Email"], ["address", "Home address"], ["kin_name", "Next of kin name"], ["kin_phone", "Next of kin phone"],
  ["date_joined", "Date joined"], ["status", "Status"], ["baptised", "Baptised"], ["departments", "Departments"],
] as const;

export function csvLine(cells: unknown[]) { return cells.map(csvEscape).join(","); }
