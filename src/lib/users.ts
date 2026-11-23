import "server-only";
import { hash } from "@node-rs/argon2";
import { z } from "zod";
import { sql } from "./db";

export type Role = "admin" | "head" | "leadership";
export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", head: "Department head", leadership: "Leadership (view only)" };

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(40)
  .regex(/^[A-Za-z0-9._@-]+$/, "Username can use letters, numbers and . _ @ - only.");

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Enter the person's full name.").max(100),
  username: usernameSchema,
  role: z.enum(["admin", "head", "leadership"]),
  departmentId: z.uuid().nullable(), // required for heads, must be null otherwise
  password: z.string().min(10).max(200), // temporary; the user must change it at first sign-in
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export type User = {
  id: string;
  name: string;
  username: string;
  role: Role;
  department_id: string | null;
  active: boolean;
  must_change_password: boolean;
};

/**
 * Creates a user. Callers MUST verify the acting user is an admin first
 * (pass their id as `createdBy`); there is no public sign-up.
 */
export async function createUser(input: CreateUserInput, createdBy: string | null): Promise<User> {
  const data = createUserSchema.parse(input);
  if ((data.role === "head") !== (data.departmentId !== null)) {
    throw new Error(data.role === "head" ? "Choose a department for the department head." : "Only department heads have a department.");
  }
  const passwordHash = await hash(data.password);
  try {
    const [user] = await sql<User[]>`
      INSERT INTO users (name, username, role, department_id, password_hash, created_by)
      VALUES (${data.name}, ${data.username}, ${data.role}, ${data.departmentId}, ${passwordHash}, ${createdBy})
      RETURNING id, name, username, role, department_id, active, must_change_password`;
    return user;
  } catch (e) {
    const err = e as { code?: string; constraint_name?: string };
    if (err.code === "23505") {
      throw new Error(err.constraint_name === "users_department_id_key" ? "That department already has a head." : "That username is already taken.");
    }
    throw e;
  }
}
