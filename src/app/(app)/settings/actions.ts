"use server";
import { redirect } from "next/navigation";
import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";
import { sql } from "@/lib/db";
import { createSession, destroyUserSessions, getCurrentUser } from "@/lib/session";
import { clearFailures, lockedForMinutes, lockedMessage, recordFailure } from "@/lib/throttle";
import type { FormState } from "@/lib/action-utils";

const schema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z.string().min(10, "Use at least 10 characters.").max(200),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "The new passwords don't match.", path: ["confirm"] })
  .refine((d) => d.next !== d.current, { message: "Choose a password you haven't used just now.", path: ["next"] });

/** Heads and leadership change their own password here. Admins' password is managed in the server's environment file. */
export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") return { error: "The admin password is changed in the server's environment file." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Guessing the current password from a stolen session is limited the same way as signing in.
  const rules = [{ key: `pw:${user.id}`, max: 5 }];
  const locked = await lockedForMinutes(rules);
  if (locked > 0) return { error: lockedMessage(locked) };

  const [row] = await sql<{ password_hash: string }[]>`SELECT password_hash FROM users WHERE id = ${user.id}`;
  if (!(await verify(row.password_hash, parsed.data.current).catch(() => false))) {
    await recordFailure(rules);
    return { error: "Your current password is incorrect." };
  }
  await clearFailures(rules[0].key);

  await sql`UPDATE users SET password_hash = ${await hash(parsed.data.next)}, must_change_password = false WHERE id = ${user.id}`;
  await destroyUserSessions(user.id); // signs out every other device
  await createSession(user.id);

  if (user.must_change_password) redirect("/"); // first sign-in: carry on to their screens
  return { message: "Your password was changed. Other devices have been signed out." };
}
