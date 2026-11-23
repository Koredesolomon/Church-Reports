import { requireHead } from "@/lib/dal";
import { sql } from "@/lib/db";
import { shortDate } from "@/lib/periods";
import { PageHeader, Section } from "@/components/ui";
import { markAllRead } from "../reports/actions";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

export default async function NotificationsPage() {
  const user = await requireHead();
  const notes = await sql<{ id: string; title: string; body: string | null; created_at: string; unread: boolean }[]>`
    SELECT id, title, body, to_char(lagos(created_at), 'YYYY-MM-DD') AS created_at, read_at IS NULL AS unread
    FROM notifications WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 100`;
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Notifications" sub="Messages about your reports.">
        <form action={markAllRead}><button className="btn ghost">Mark all as read</button></form>
      </PageHeader>
      <Section title="All notifications">
        <div className="flex flex-col px-6 pb-3">
          {notes.length === 0 && <p className="m-0 pb-3 text-[15px] text-muted">Nothing here yet.</p>}
          {notes.map((n) => (
            <div key={n.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-line-soft py-3.5 last:border-0">
              <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
                <span className={`text-[15px] ${n.unread ? "font-semibold" : "font-medium"}`}>{n.title}</span>
                {n.body && <span className="text-sm leading-relaxed text-ink-2">{n.body}</span>}
              </div>
              <span className="flex items-center gap-2.5">
                {n.unread && <span className="chip s-submitted">New</span>}
                <span className="text-[13px] text-muted">{shortDate(n.created_at, true)}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
