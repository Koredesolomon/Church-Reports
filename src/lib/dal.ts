import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import type { User } from "./users";

/** Where each role lands after sign-in. */
export const HOME: Record<User["role"], string> = { admin: "/dashboard", leadership: "/dashboard", head: "/reports" };

/** Any signed-in user who has already set their own password (otherwise they are sent to Settings to set it). */
export async function requireUser(loginPath = "/login"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath);
  // A temporary password has to be replaced first; Settings is where that happens.
  if (user.must_change_password) redirect("/settings");
  return user;
}

export async function requireAdmin(): Promise<User> {
  // Signed-out visitors to an admin page are sent to the administrator login at /admin.
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect(HOME[user.role]);
  return user;
}

/** Admin or leadership (leadership is view-only). */
export async function requireStaff(): Promise<User> {
  const user = await requireUser();
  if (user.role === "head") redirect(HOME.head);
  return user;
}

/** A department head. `department_id` is guaranteed by the DB constraint. */
export async function requireHead(): Promise<User & { department_id: string }> {
  const user = await requireUser();
  if (user.role !== "head" || !user.department_id) redirect(HOME[user.role]);
  return user as User & { department_id: string };
}
