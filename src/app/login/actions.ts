"use server";
import { redirect } from "next/navigation";
import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";
import { sql } from "@/lib/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/session";

const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  audience: z.enum(["admin", "user"]),
});

// Verified against when the username is unknown, so response time doesn't reveal which usernames exist.
const DUMMY_HASH = hash("not-a-real-password");

export type LoginState = { error?: string } | undefined;

/** Two sign-in screens share this action: "admin" accepts admins only, "user" accepts department heads and leadership. */
export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter your username and password." };
  const { username, password, audience } = parsed.data;

  const [user] = await sql<{ id: string; password_hash: string; role: string; active: boolean }[]>`
    SELECT id, password_hash, role, active FROM users WHERE lower(username) = lower(${username})`;
  const ok = await verify(user?.password_hash ?? (await DUMMY_HASH), password).catch(() => false);
  if (!user || !user.active || !ok) {
    // Server-side diagnostics only: the password is never logged, and the visitor still gets one generic message.
    const why = !user ? "no such username" : !user.active ? "account is deactivated" : "wrong password";
    console.warn(`[login] failed on /${audience === "admin" ? "admin" : "login"}: username="${username}" (${why})`);
    return { error: "Incorrect username or password." };
  }

  // The password was right, so it is safe to say which screen this account belongs on.
  const isAdmin = user.role === "admin";
  if (audience === "admin" && !isAdmin) return { error: "This account isn't an administrator. Sign in on the main login page." };
  if (audience === "user" && isAdmin) return { error: "Administrators sign in on the administrator login page." };

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  const user = await getCurrentUser();
  await destroySession();
  redirect(user?.role === "admin" ? "/admin" : "/login");
}
