"use server";
import { z } from "zod";
import { hash } from "@node-rs/argon2";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { createUser, usernameSchema } from "@/lib/users";
import { destroyUserSessions } from "@/lib/session";
import { UUID, generatePassword, pgCode, refresh, type FormState } from "@/lib/action-utils";

const schema = z.object({
  name: z.string().trim().min(1, "Enter the person's full name.").max(100),
  username: usernameSchema,
  role: z.enum(["admin", "head", "leadership"], "Choose a role."),
});

export async function registerUser(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = schema.safeParse({ name: fd.get("name"), username: fd.get("username"), role: fd.get("role") });
  if (!p.success) return { error: p.error.issues[0].message };
  const dept = String(fd.get("department") ?? "");
  const departmentId = p.data.role === "head" ? (UUID.test(dept) ? dept : null) : null;
  if (p.data.role === "head" && !departmentId) return { error: "Choose a department for the department head." };

  const password = generatePassword();
  try {
    const u = await createUser({ ...p.data, departmentId, password }, admin.id);
    let where = "";
    if (departmentId) {
      const [d] = await sql<{ name: string }[]>`SELECT name FROM departments WHERE id = ${departmentId}`;
      where = `, ${d?.name}`;
    }
    refresh();
    return { message: `User registered: ${u.name}${where}`, secret: { label: u.username, value: password } };
  } catch (e) {
    if (e instanceof Error && /taken|already has a head|Choose a department|Only department heads/.test(e.message)) return { error: e.message };
    throw e;
  }
}

/** intent = "reset" | "deactivate" | "reactivate" | "delete" */
export async function userAction(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const intent = fd.get("intent");
  if (!UUID.test(id)) return { error: "User not found." };
  if (id === admin.id && intent !== "reset") return { error: "You can't deactivate or delete your own account." };

  if (intent === "delete") return deleteUser(id);

  if (intent === "reset") {
    const password = generatePassword();
    const rows = await sql`UPDATE users SET password_hash = ${await hash(password)}, must_change_password = true WHERE id = ${id} AND deleted_at IS NULL RETURNING name`;
    if (!rows.length) return { error: "User not found." };
    await destroyUserSessions(id);
    return { message: `Password reset for ${rows[0].name}`, secret: { label: "New temporary password", value: password } };
  }
  const active = intent === "reactivate";
  if (intent !== "reactivate" && intent !== "deactivate") return { error: "Unknown action." };
  const rows = await sql`UPDATE users SET active = ${active} WHERE id = ${id} AND deleted_at IS NULL RETURNING id`;
  if (!rows.length) return { error: "User not found." };
  if (!active) await destroyUserSessions(id);
  refresh();
  return { message: active ? "Reactivated." : "Deactivated." };
}

/**
 * Erases an account that has no history. One with reports (or other records) can't be erased without losing who did what,
 * so it is retired instead: it can't sign in, disappears from the list, and frees its department and username.
 */
async function deleteUser(id: string): Promise<FormState> {
  try {
    const rows = await sql`DELETE FROM users WHERE id = ${id} AND deleted_at IS NULL RETURNING id`;
    if (!rows.length) return { error: "User not found." };
  } catch (e) {
    if (pgCode(e).code !== "23503") throw e; // 23503 = other records still point at this user
    await sql.begin(async (tx) => {
      await tx`UPDATE users SET deleted_at = now(), active = false, department_id = NULL, password_hash = '' WHERE id = ${id}`;
      await tx`DELETE FROM sessions WHERE user_id = ${id}`;
      await tx`DELETE FROM notifications WHERE user_id = ${id}`;
    });
  }
  refresh();
  return { message: "Deleted." };
}
