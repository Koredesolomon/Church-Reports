import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { sql } from "@/lib/db";
import { deptLabel } from "@/lib/config";
import { UUID } from "@/lib/action-utils";
import { longDate, shortDate } from "@/lib/periods";
import { STATUSES, type MemberStatus } from "@/lib/members";
import ActionForm from "@/components/action-form";
import { PageHeader, Pager, qs } from "@/components/ui";
import { setMemberStatus } from "./actions";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

const SIZE = 10;
const CHIP: Record<MemberStatus, string> = { active: "s-approved", inactive: "s-draft", transferred_out: "s-returned" };

type Row = { id: string; member_no: string; first_name: string; last_name: string; status: MemberStatus; date_joined: string | null; departments: string | null };

export default async function Members({ searchParams }: PageProps<"/members">) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const q = str(sp.q).trim().slice(0, 80);
  const status = ["active", "inactive", "transferred_out", "all"].includes(str(sp.s)) ? (str(sp.s) as MemberStatus | "all") : "active";
  // Heads only ever see their own department's members, whatever the URL says.
  const d = user.role === "head" ? user.department_id! : UUID.test(str(sp.d)) ? str(sp.d) : "";
  const page = Math.max(1, Number(str(sp.p)) || 1);
  const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const digits = q.replace(/\D/g, "");

  const where = sql`WHERE true
    ${status !== "all" ? sql`AND m.status = ${status}` : sql``}
    ${d ? sql`AND EXISTS (SELECT 1 FROM member_departments x WHERE x.member_id = m.id AND x.department_id = ${d})` : sql``}
    ${q ? sql`AND (m.first_name || ' ' || m.last_name ILIKE ${like} OR m.member_no ILIKE ${like} ${digits.length >= 3 ? sql`OR regexp_replace(m.phone, '\D', '', 'g') LIKE ${"%" + digits + "%"}` : sql``})` : sql``}`;

  const [[{ total }], rows, depts] = await Promise.all([
    sql<{ total: number }[]>`SELECT count(*)::int AS total FROM members m ${where}`,
    sql<Row[]>`SELECT m.id, m.member_no, m.first_name, m.last_name, m.status, m.date_joined,
        (SELECT string_agg(dp.name, ', ' ORDER BY dp.sort_order) FROM member_departments md JOIN departments dp ON dp.id = md.department_id WHERE md.member_id = m.id) AS departments
      FROM members m ${where} ORDER BY lower(m.last_name), lower(m.first_name) LIMIT ${SIZE} OFFSET ${(page - 1) * SIZE}`,
    sql<{ id: string; name: string; full_name: string | null }[]>`SELECT id, name, full_name FROM departments WHERE report_kind = 'department' AND active ORDER BY sort_order, name`,
  ]);

  const selId = UUID.test(str(sp.id)) ? str(sp.id) : rows[0]?.id;
  const [sel] = selId
    ? await sql<(Row & { gender: string | null; date_of_birth: string | null; marital_status: string | null; phone: string; email: string | null; address: string | null;
        kin_name: string | null; kin_phone: string | null; baptised: boolean | null; notes: string | null; updated_at: string; editor: string | null })[]>`
        SELECT m.id, m.member_no, m.first_name, m.last_name, m.status, m.date_joined, m.gender, m.date_of_birth, m.marital_status, m.phone, m.email, m.address,
          m.kin_name, m.kin_phone, m.baptised, m.notes, to_char(m.updated_at, 'YYYY-MM-DD') AS updated_at, u.name AS editor,
          (SELECT string_agg(dp.name, ', ' ORDER BY dp.sort_order) FROM member_departments md JOIN departments dp ON dp.id = md.department_id WHERE md.member_id = m.id) AS departments
        FROM members m LEFT JOIN users u ON u.id = m.updated_by
        WHERE m.id = ${selId} ${d ? sql`AND EXISTS (SELECT 1 FROM member_departments x WHERE x.member_id = m.id AND x.department_id = ${d})` : sql``}`
    : [];

  const keep = { q, s: status === "active" ? undefined : status, d: user.role === "head" ? undefined : d };
  const from = total === 0 ? 0 : (page - 1) * SIZE + 1;
  const dash = (v: string | null | undefined) => v || "—";

  return (
    <div className="flex flex-col gap-7">
      <PageHeader title={user.role === "head" ? "My department's members" : "Members"} sub={isAdmin ? "Member records. Department heads see only their own department." : user.role === "head" ? "Members of your department. You can view, not edit." : "Member records. You can view, not edit."}>
        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <Link className="btn ghost" href="/members/import">Import CSV</Link>
            <a className="btn ghost" href={`/members/export${qs({ q, s: keep.s, d })}`}>Export CSV</a>
            <Link className="btn" href="/members/new">Add member</Link>
          </div>
        )}
      </PageHeader>

      <form method="get" className="compact card flex flex-wrap items-end gap-4 p-5">
        <div className="field !flex-[2_1_240px]"><label htmlFor="q">Search</label><input id="q" name="q" type="search" defaultValue={q} placeholder="Name, member number or phone" /></div>
        {user.role !== "head" && (
          <div className="field !flex-[1_1_170px]"><label htmlFor="d">Department</label>
            <select id="d" name="d" defaultValue={d}><option value="">All departments</option>{depts.map((x) => <option key={x.id} value={x.id}>{deptLabel(x)}</option>)}</select>
          </div>
        )}
        <div className="field !flex-[1_1_150px]"><label htmlFor="s">Status</label>
          <select id="s" name="s" defaultValue={status}>{Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}<option value="all">All</option></select>
        </div>
        <button className="btn">Search</button>
      </form>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="list" className="card flex min-w-0 flex-[1_1_520px] flex-col">
          <h2 id="list" className="m-0 px-6 pb-2 pt-5 text-lg font-bold">{total} {status === "all" ? "" : STATUSES[status].toLowerCase() + " "}{total === 1 ? "member" : "members"}</h2>
          <div className="overflow-x-auto px-2.5 pb-2.5">
            <table className="tbl min-w-[520px]">
              <thead><tr><th>No.</th><th>Name</th><th>Department</th><th>Status</th><th>Joined</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.id === sel?.id ? "sel" : ""}>
                    <td>{r.member_no}</td>
                    <td><Link href={`/members${qs({ ...keep, p: page > 1 ? page : undefined, id: r.id })}`} className="font-semibold">{r.first_name} {r.last_name}</Link></td>
                    <td>{dash(r.departments)}</td>
                    <td><span className={`chip ${CHIP[r.status]}`}>{STATUSES[r.status]}</span></td>
                    <td>{r.date_joined ? shortDate(r.date_joined, true) : "—"}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted">No members match.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-6 py-3.5 text-sm text-muted">
            <span>{total === 0 ? "Nothing to show" : `Showing ${from} to ${Math.min(page * SIZE, total)} of ${total}`}</span>
            <Pager page={page} pages={Math.max(1, Math.ceil(total / SIZE))} href={(p) => `/members${qs({ ...keep, p })}`} />
          </div>
        </section>

        {sel && (
          <section aria-labelledby="rec" className="card flex min-w-0 flex-[1_1_340px] flex-col gap-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5"><h2 id="rec" className="m-0 text-xl font-bold">{sel.first_name} {sel.last_name}</h2><span className="text-sm text-muted">{sel.member_no}</span></div>
              <span className={`chip ${CHIP[sel.status]}`}>{STATUSES[sel.status]}</span>
            </div>
            <div className="flex flex-col gap-0.5"><h3 className="grp">PERSONAL</h3>
              <div className="kv"><span>Gender</span><span>{dash(sel.gender)}</span></div>
              <div className="kv"><span>Date of birth</span><span>{sel.date_of_birth ? longDate(sel.date_of_birth) : "—"}</span></div>
              <div className="kv"><span>Marital status</span><span>{dash(sel.marital_status)}</span></div>
            </div>
            <div className="flex flex-col gap-0.5"><h3 className="grp">CONTACT</h3>
              <div className="kv"><span>Phone</span><span>{sel.phone}</span></div>
              <div className="kv"><span>Email</span><span>{dash(sel.email)}</span></div>
              <div className="kv"><span>Address</span><span>{dash(sel.address)}</span></div>
              <div className="kv"><span>Next of kin</span><span>{sel.kin_name ? `${sel.kin_name}${sel.kin_phone ? ", " + sel.kin_phone : ""}` : "—"}</span></div>
            </div>
            <div className="flex flex-col gap-0.5"><h3 className="grp">CHURCH</h3>
              <div className="kv"><span>Date joined</span><span>{sel.date_joined ? longDate(sel.date_joined) : "—"}</span></div>
              <div className="kv"><span>Department</span><span>{dash(sel.departments)}</span></div>
              <div className="kv"><span>Baptised</span><span>{sel.baptised === null ? "—" : sel.baptised ? "Yes" : "No"}</span></div>
            </div>
            {isAdmin && sel.notes && <div className="flex flex-col gap-1"><h3 className="grp">NOTES</h3><p className="m-0 whitespace-pre-wrap text-sm leading-relaxed">{sel.notes}</p></div>}
            {isAdmin && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[13px] text-muted">Last edited by {sel.editor ?? "the church office"}, {longDate(sel.updated_at)}</span>
                <span className="flex items-center gap-2">
                  <ActionForm action={setMemberStatus} noStatus>
                    <input type="hidden" name="id" value={sel.id} />
                    {sel.status === "active"
                      ? <button name="intent" value="inactive" className="btn ghost !h-10">Deactivate</button>
                      : <button name="intent" value="active" className="btn ghost !h-10">Reactivate</button>}
                  </ActionForm>
                  <Link className="btn !h-10" href={`/members/${sel.id}`}>Edit</Link>
                </span>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
