import "server-only";
import { sql } from "./db";
import { isPeriod } from "./periods";
import type { Kind } from "./reports";

export const PAGE_SIZE = 10;

export type ArchiveFilters = { q: string; m: string; d: string; t: string; s: "approved" | "all"; p: number };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/** Reads filters from the query string. Leadership only ever sees approved reports. */
export function readFilters(sp: Record<string, string | string[] | undefined>, canSeeAll: boolean): ArchiveFilters {
  const t = str(sp.t);
  return {
    q: str(sp.q).trim().slice(0, 100),
    m: isPeriod(str(sp.m)) ? str(sp.m) : "",
    d: /^[0-9a-f-]{36}$/i.test(str(sp.d)) ? str(sp.d) : "",
    t: ["department", "financial", "new_members"].includes(t) ? t : "",
    s: canSeeAll && str(sp.s) === "all" ? "all" : "approved",
    p: Math.max(1, Number(str(sp.p)) || 1),
  };
}

export type ArchiveRow = {
  id: string; period: string; department: string; kind: Kind; status: string; reviewed_at: string | null; file_count: number;
};

function where(f: ArchiveFilters) {
  const like = `%${f.q.replace(/[\\%_]/g, "\\$&")}%`;
  return sql`
    WHERE true
    ${f.s === "approved" ? sql`AND r.status = 'approved'` : sql`AND r.status <> 'draft'`}
    ${f.m ? sql`AND r.period = ${f.m}` : sql``}
    ${f.d ? sql`AND r.department_id = ${f.d}` : sql``}
    ${f.t ? sql`AND r.kind = ${f.t as Kind}` : sql``}
    ${f.q ? sql`AND (d.name ILIKE ${like} OR d.full_name ILIKE ${like} OR r.data::text ILIKE ${like})` : sql``}`;
}

export async function queryArchive(f: ArchiveFilters, opts: { all?: boolean } = {}) {
  const [{ total }] = await sql<{ total: number }[]>`
    SELECT count(*)::int AS total FROM reports r JOIN departments d ON d.id = r.department_id ${where(f)}`;
  const limit = opts.all ? 5000 : PAGE_SIZE;
  const offset = opts.all ? 0 : (f.p - 1) * PAGE_SIZE;
  const rows = await sql<ArchiveRow[]>`
    SELECT r.id, r.period, d.name AS department, r.kind, r.status, to_char(r.reviewed_at, 'YYYY-MM-DD') AS reviewed_at,
           (SELECT count(*)::int FROM report_attachments a WHERE a.report_id = r.id) AS file_count
    FROM reports r JOIN departments d ON d.id = r.department_id ${where(f)}
    ORDER BY r.period DESC, d.sort_order LIMIT ${limit} OFFSET ${offset}`;
  return { total, rows };
}

export function csvEscape(v: unknown) {
  let s = v == null ? "" : String(v);
  // Neutralise spreadsheet formulas in exported text.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
