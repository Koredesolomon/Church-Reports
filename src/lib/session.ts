import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { sql } from "./db";
import type { User } from "./users";

const COOKIE = "session";
const DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + DURATION_MS);
  const [{ id }] = await sql<{ id: string }[]>`
    INSERT INTO sessions (user_id, expires_at) VALUES (${userId}, ${expiresAt}) RETURNING id`;
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  if (id && /^[0-9a-f-]{36}$/i.test(id)) await sql`DELETE FROM sessions WHERE id = ${id}`;
  store.delete(COOKIE);
}

/** Deletes all of a user's sessions (use after password change or deactivation). */
export async function destroyUserSessions(userId: string) {
  await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
}

/** Current user from the session cookie, or null. Not memoized. */
export async function lookupUser(): Promise<User | null> {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [user] = await sql<User[]>`
    SELECT u.id, u.name, u.username, u.role, u.department_id, u.active, u.must_change_password
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ${id} AND s.expires_at > now() AND u.active`;
  return user ?? null;
}

/** Same as lookupUser, memoized for the rest of the request (used by pages and layouts). */
export const getCurrentUser = cache(lookupUser);

