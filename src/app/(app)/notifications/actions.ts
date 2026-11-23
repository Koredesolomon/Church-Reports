"use server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { UUID, refresh } from "@/lib/action-utils";

// Every query is scoped to the signed-in user, so nobody can touch another person's notifications.

export async function markAllNotificationsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await sql`UPDATE notifications SET read_at = now() WHERE user_id = ${user.id} AND read_at IS NULL AND archived_at IS NULL`;
  refresh();
}

export async function markNotificationRead(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !UUID.test(id)) return;
  await sql`UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE id = ${id} AND user_id = ${user.id}`;
  refresh();
}

/** Form action: fields `id` and `archived` ("true" archives, "false" restores). Archiving also marks it read. */
export async function setNotificationArchived(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const id = String(formData.get("id"));
  if (!user || !UUID.test(id)) return;
  const archive = formData.get("archived") === "true";
  await sql`UPDATE notifications SET archived_at = ${archive ? sql`now()` : null}, read_at = COALESCE(read_at, now())
            WHERE id = ${id} AND user_id = ${user.id}`;
  refresh();
}
