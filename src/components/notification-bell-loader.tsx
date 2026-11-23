import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { timeAgo } from "@/lib/periods";
import NotificationBell, { type BellItem } from "./notification-bell";

/** Loads the signed-in user's latest notifications for the bell. */
export default async function NotificationBellLoader() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await sql<{ id: string; title: string; body: string | null; href: string | null; kind: BellItem["kind"]; created_at: Date; unread: boolean; archived: boolean }[]>`
    SELECT id, title, body, href, kind, created_at, read_at IS NULL AS unread, archived_at IS NOT NULL AS archived
    FROM notifications WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 60`;
  const now = new Date();
  const items: BellItem[] = rows.map((r) => ({
    id: r.id, title: r.title, body: r.body, href: r.href, kind: r.kind, unread: r.unread, archived: r.archived, ago: timeAgo(new Date(r.created_at), now),
  }));
  return <NotificationBell items={items} />;
}
