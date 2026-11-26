import Image from "next/image";
import Link from "next/link";
import { requireStaff } from "@/lib/dal";
import { sql } from "@/lib/db";
import { CHURCH_NAME } from "@/lib/config";
import { addMonths, currentPeriod, dueDate, isOverdue, isPeriod, longDate, monthLabel, monthShort, recentPeriods, shortDate, timeOfDay, todayStr, yesterdayStr } from "@/lib/periods";
import { KIND_LABEL, trackingStart, type Kind, type Status } from "@/lib/reports";
import { Chip } from "@/components/ui";
import MonthPicker from "@/components/month-picker";
import { Card, CardHead, Donut } from "@/components/dash";
import HeaderBell from "@/components/header-bell";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

const NAVY = "#2e3192", GOLD = "#fdb214", MAGENTA = "#b6208b", RED = "#e51c24";
const AVATARS = ["#e7e4fb", "#dce8fd", "#ffe9d6", "#ddf3e6", "#fde4e4"];
const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const hue = (s: string) => AVATARS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATARS.length];
const pct = (n: number, t: number) => (t > 0 ? Math.round((n / t) * 100) : 0);

type Counts = { approved: number; submitted: number; returned: number; missing: number };

/** How many of the departments are in each state for a month. "Missing" = nothing submitted yet. */
async function countsFor(period: string, total: number, tracked: boolean): Promise<Counts> {
  const rows = await sql<{ status: Status; n: number }[]>`SELECT status, count(*)::int AS n FROM reports WHERE period = ${period} GROUP BY status`;
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<Status, number>>;
  const approved = by.approved ?? 0, submitted = by.submitted ?? 0, returned = by.returned ?? 0;
  return { approved, submitted, returned, missing: tracked ? Math.max(total - approved - submitted - returned, 0) : 0 };
}

type Ev = { at: Date; what: string; dept: string; who: string; period: string };
const STAGE: Record<string, number> = { none: 0, draft: 30, returned: 40, submitted: 70, approved: 100 };

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireStaff();
  const isAdmin = user.role === "admin";
  const sp = await searchParams;
  const m = typeof sp.m === "string" && isPeriod(sp.m) ? sp.m : currentPeriod();
  const start = await trackingStart();
  const trendPeriods = [5, 4, 3, 2, 1, 0].map((i) => addMonths(m, -i));

  const [depts] = await Promise.all([
    sql<{ id: string; name: string; head: string | null }[]>`
      SELECT d.id, d.name, u.name AS head FROM departments d LEFT JOIN users u ON u.department_id = d.id AND u.role = 'head' AND u.active
      WHERE d.active ORDER BY d.sort_order, d.name`,
  ]);
  const total = depts.length;
  const [now, trend, [mem], recent, status, events] = await Promise.all([
    countsFor(m, total, m >= start),
    sql<{ period: string; n: number }[]>`
      SELECT period, count(*) FILTER (WHERE status <> 'draft' AND lagos(submitted_at)::date <= (period + interval '1 month' + interval '4 days')::date)::int AS n
      FROM reports WHERE period = ANY(${trendPeriods}) GROUP BY period`,
    sql<{ active: number; joined: number }[]>`
      SELECT count(*) FILTER (WHERE status = 'active')::int AS active, count(*) FILTER (WHERE date_joined >= date_trunc('month', lagos(now()))::date)::int AS joined FROM members`,
    sql<{ id: string; department: string; kind: Kind; status: Status; at: Date; by: string | null; comment: string | null }[]>`
      SELECT r.id, d.name AS department, r.kind, r.status, r.submitted_at AS at, u.name AS by, r.review_comment AS comment
      FROM reports r JOIN departments d ON d.id = r.department_id LEFT JOIN users u ON u.id = r.submitted_by
      WHERE r.period = ${m} AND r.status <> 'draft' ORDER BY r.submitted_at DESC NULLS LAST LIMIT 6`,
    sql<{ department_id: string; status: Status }[]>`SELECT department_id, status FROM reports WHERE period = ${m}`,
    sql<{ at: Date; what: string; dept: string; who: string; period: string }[]>`
      (SELECT r.submitted_at AS at, 'submitted' AS what, d.name AS dept, u.name AS who, r.period::text AS period
         FROM reports r JOIN departments d ON d.id = r.department_id JOIN users u ON u.id = r.submitted_by WHERE r.submitted_at IS NOT NULL)
      UNION ALL
      (SELECT r.reviewed_at, r.status::text, d.name, u.name, r.period::text
         FROM reports r JOIN departments d ON d.id = r.department_id JOIN users u ON u.id = r.reviewed_by
         WHERE r.reviewed_at IS NOT NULL AND r.status IN ('approved', 'returned'))
      ORDER BY at DESC LIMIT 8`,
  ]);
  const tracked = m >= start;
  const overdue = isOverdue(m);
  const byDept = new Map(status.map((r) => [r.department_id, r.status]));
  const toChase = tracked ? depts.filter((d) => { const s = byDept.get(d.id); return !s || s === "draft" || s === "returned"; }) : [];
  const submittedCount = now.approved + now.submitted + now.returned;

  // Chart: on time (up) against late or missing (down), per month
  const onTime = new Map(trend.map((t) => [t.period, t.n]));
  const bars = trendPeriods.map((p) => {
    const up = onTime.get(p) ?? 0;
    return { p, up, down: p >= start ? Math.max(total - up, 0) : 0 };
  });
  const max = Math.max(total, 1);
  const ticks = [total, Math.round(total / 2), 0, Math.round(total / 2), total];

  // Activity feed grouped by day
  const today = todayStr();
  const yesterday = yesterdayStr();
  const dayOf = (d: Date) => todayStr(new Date(d));
  const groups: { label: string; items: Ev[] }[] = [];
  for (const e of events) {
    const day = dayOf(e.at);
    const label = day === today ? "Today" : day === yesterday ? "Yesterday" : shortDate(day, true);
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(e);
    else groups.push({ label, items: [e] });
  }
  const timeOf = timeOfDay;

  const donut = [
    { label: "Approved", value: now.approved, color: NAVY },
    { label: "Waiting for review", value: now.submitted, color: GOLD },
    { label: "Returned", value: now.returned, color: MAGENTA },
    { label: tracked && overdue ? "Late" : "Not submitted", value: now.missing, color: RED },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="m-0 text-[26px] font-bold tracking-tight">Dashboard</h1>
          <span className="text-sm text-muted">{isAdmin ? `A summary of ${monthLabel(m)}.` : "A summary of the month. You can view, not edit."}</span>
        </div>
        <div className="relative z-20 flex w-full items-center justify-between gap-3 sm:w-auto">
          <MonthPicker label="Month" hideLabel value={m} periods={recentPeriods(12)} className="!h-11 !rounded-full !border-line !pl-4 !text-sm font-medium" />
          <HeaderBell />
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[19rem_minmax(0,1fr)_21rem] xl:grid-rows-[auto_auto_1fr]">
        {/* ---- summary, across the left and middle columns ---- */}
        <section aria-label="Summary" className="relative flex min-h-[200px] xl:col-span-2 flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-[#232672] p-5 text-white">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-white/[.06]" />
          <span aria-hidden className="pointer-events-none absolute -bottom-16 right-6 size-40 rounded-full bg-white/[.05]" />
          <div className="relative flex items-center gap-2.5">
            <Image src="/logo.webp" alt="" width={32} height={32} className="size-8 rounded-lg bg-white object-contain p-0.5" />
            <span className="text-sm font-semibold">{CHURCH_NAME}</span>
          </div>
          <div className="relative flex flex-col gap-1">
            <span className="text-lg font-semibold">{monthLabel(m)}</span>
            <span className="text-xs text-white/70">Reports approved</span>
            <div className="flex items-end justify-between gap-3">
              <span className="text-[34px] font-bold leading-none tracking-tight">{now.approved} <span className="text-lg font-medium text-white/70">of {total}</span></span>
              <span className="text-right text-xs leading-tight text-white/70">Due<br /><strong className="text-sm text-white">{shortDate(dueDate(m))}</strong></span>
            </div>
          </div>
        </section>

        {/* ---- left column ---- */}
        <div className="flex flex-col gap-5 xl:col-start-1 xl:row-start-2 xl:self-stretch [&>section]:flex-1">

          <Card className="flex flex-col gap-3 p-5">
            <CardHead title={tracked && overdue ? "Late reports" : "Still to submit"} right={isAdmin ? <Link href="/tracker" className="text-[13px] font-medium">View all</Link> : undefined} />
            {toChase.length === 0 && <p className="m-0 text-sm text-muted">{tracked ? "Every department has submitted." : "Nothing to chase for this month."}</p>}
            {toChase.slice(0, 3).map((d) => {
              const s = byDept.get(d.id) ?? "none";
              return (
                <div key={d.id} className="flex flex-col gap-2 rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden style={{ background: hue(d.name) }} className="grid size-9 shrink-0 place-items-center rounded-lg text-[13px] font-bold">{initials(d.name)}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{d.name}</span><span className="block truncate text-xs text-muted">{d.head ?? "No head assigned"}</span></span>
                    <Chip status={s === "none" ? (overdue ? "late" : "none") : s === "draft" && overdue ? "late" : (s as Status)} />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#ffe9b3]"><div className="h-full rounded-full bg-brand" style={{ width: `${STAGE[s]}%` }} /></div>
                  <span className="text-xs text-muted">Due {longDate(dueDate(m))}</span>
                </div>
              );
            })}
            {toChase.length > 3 && <span className="text-sm text-muted">and {toChase.length - 3} more</span>}
          </Card>
        </div>

        {/* ---- middle column ---- */}
        <div className="flex min-w-0 flex-col gap-5 xl:col-start-2 xl:row-start-2">
          <Card className="flex flex-col gap-5 p-5">
            <CardHead title="On-time reports" sub="Submitted by the 5th, last six months" right={
              <ul className="m-0 flex list-none gap-4 p-0 text-xs text-ink-2" aria-label="Legend">
                <li className="flex items-center gap-1.5 whitespace-nowrap"><span className="size-2.5 shrink-0 rounded-sm" style={{ background: NAVY }} />On time</li>
                <li className="flex items-center gap-1.5 whitespace-nowrap"><span className="size-2.5 shrink-0 rounded-sm" style={{ background: GOLD }} />Late or missing</li>
              </ul>} />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted">On time in {monthLabel(m)}</span>
              <span className="text-[28px] font-bold leading-tight tracking-tight">{bars[bars.length - 1].up} <span className="text-base font-medium text-muted">of {total}</span></span>
            </div>
            <div role="img" aria-label={`On-time and late reports per month: ${bars.map((b) => `${monthShort(b.p)} ${b.up} on time, ${b.down} late or missing`).join("; ")}.`} className="flex gap-3">
              <div className="flex h-[240px] w-7 flex-col justify-between text-right text-xs text-muted" aria-hidden>
                {ticks.map((t, i) => <span key={i}>{i > 2 ? `-${t}` : t}</span>)}
              </div>
              <div className="relative min-w-0 flex-1">
                <div className="absolute inset-0 flex h-[240px] flex-col justify-between" aria-hidden>
                  {ticks.map((_, i) => <div key={i} className={`border-t ${i === 2 ? "border-[#c9cde0]" : "border-dashed border-[#e3e6ef]"}`} />)}
                </div>
                <div className="relative flex h-[240px] items-stretch">
                  {bars.map((b) => (
                    <div key={b.p} className="group relative flex flex-1 flex-col items-center">
                      <div className="flex h-1/2 w-full items-end justify-center"><div className="w-[34%] max-w-8 rounded-t-md" style={{ height: `${(b.up / max) * 100}%`, minHeight: b.up ? 3 : 0, background: NAVY }} /></div>
                      <div className="flex h-1/2 w-full items-start justify-center"><div className="w-[34%] max-w-8 rounded-b-md" style={{ height: `${(b.down / max) * 100}%`, minHeight: b.down ? 3 : 0, background: GOLD }} /></div>
                      <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-white px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        <div className="mb-1 font-semibold">{monthLabel(b.p)}</div>
                        <div className="flex justify-between gap-4"><span className="text-muted">On time</span><strong>{b.up}</strong></div>
                        <div className="flex justify-between gap-4"><span className="text-muted">Late or missing</span><strong>{b.down}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex">{bars.map((b) => <span key={b.p} className={`flex-1 text-center text-xs ${b.p === m ? "font-semibold text-ink" : "text-muted"}`}>{monthShort(b.p)}</span>)}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* ---- recent submissions, filling the space below both columns ---- */}
        <Card className="flex min-w-0 flex-col gap-4 p-5 xl:col-span-2 xl:col-start-1 xl:row-start-3 xl:self-stretch">
          <CardHead title="Recent submissions" sub={`Reports for ${monthLabel(m)}`} right={isAdmin ? <Link href="/reviews" className="text-[13px] font-medium">Open review queue</Link> : undefined} />
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full border-collapse text-left text-sm">
              <thead><tr className="bg-brand-soft text-[13px] text-ink-2">
                <th className="rounded-l-lg px-3.5 py-2.5 font-medium">Report</th><th className="px-3.5 font-medium">Date &amp; time</th><th className="px-3.5 font-medium">Submitted by</th><th className="px-3.5 font-medium">Note</th><th className="rounded-r-lg px-3.5 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-line-soft last:border-0">
                    <td className="px-3.5 py-3"><Link href={`/reports/${r.id}`} className="block font-semibold text-ink no-underline hover:underline">{r.department}</Link><span className="text-xs text-muted">{KIND_LABEL[r.kind]}</span></td>
                    <td className="px-3.5 py-3">{r.at ? <>{shortDate(todayStr(new Date(r.at)), true)}<br /><span className="text-xs text-muted">{timeOf(r.at)}</span></> : "—"}</td>
                    <td className="px-3.5 py-3">{r.by ?? "—"}</td>
                    <td className="max-w-[16rem] px-3.5 py-3 text-xs text-ink-2"><span className="line-clamp-2">{r.status === "returned" && r.comment ? r.comment : "—"}</span></td>
                    <td className="px-3.5 py-3"><Chip status={r.status} /></td>
                  </tr>
                ))}
                {recent.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted">No reports submitted for {monthLabel(m)} yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ---- right column ---- */}
        <div className="flex flex-col gap-5 xl:col-start-3 xl:row-span-3 xl:row-start-1">
          <Card className="flex flex-col gap-5 p-5">
            <CardHead title="Statistic" sub={monthLabel(m)} />
            <Donut segments={donut.map((d) => ({ value: d.value, color: d.color }))} total={tracked ? total : submittedCount} label={tracked ? "Departments" : "Submitted"} />
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {donut.map((d) => (
                <li key={d.label} className="flex items-center gap-3 text-sm">
                  <span className="grid h-7 min-w-11 place-items-center rounded-md px-1.5 text-xs font-bold" style={{ background: d.color, color: d.color === GOLD ? "#14172b" : "#fff" }}>{pct(d.value, tracked ? total : submittedCount)}%</span>
                  <span className="flex-1">{d.label}</span>
                  <span className="font-semibold">{d.value}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 border-t border-line-soft pt-4 text-center">
              <div className="flex-1"><div className="text-xl font-bold">{mem.active}</div><div className="text-xs text-muted">Active members</div></div>
              <div className="flex-1"><div className="text-xl font-bold">{mem.joined}</div><div className="text-xs text-muted">Joined this month</div></div>
            </div>
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            <CardHead title="Recent activity" />
            {groups.length === 0 && <p className="m-0 text-sm text-muted">Nothing yet. Activity appears as departments submit and you review.</p>}
            {groups.map((g) => (
              <div key={g.label} className="flex flex-col gap-3">
                <h3 className="m-0 text-[15px] font-semibold">{g.label}</h3>
                {g.items.map((e, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span aria-hidden style={{ background: hue(e.who) }} className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold">{initials(e.who)}</span>
                    <p className="m-0 min-w-0 flex-1 text-sm leading-snug">
                      <strong>{e.who}</strong> {e.what === "submitted" ? "submitted" : e.what === "approved" ? "approved" : "returned"} the {e.dept} report for {monthLabel(e.period)}
                      <span className="mt-0.5 block text-xs text-muted">{timeOf(e.at)}</span>
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
