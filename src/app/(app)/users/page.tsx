import { requireAdmin } from "@/lib/dal";
import { sql } from "@/lib/db";
import { deptLabel } from "@/lib/config";
import { ROLE_LABEL, type Role } from "@/lib/users";
import RegisterUserForm from "@/components/register-user-form";
import { PageHeader } from "@/components/ui";
import UserRow from "@/components/user-row";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

export default async function UsersPage() {
  const me = await requireAdmin();
  const [users, free] = await Promise.all([
    sql<{ id: string; name: string; username: string; role: Role; department: string | null; active: boolean; must_change_password: boolean }[]>`
      SELECT u.id, u.name, u.username, u.role, d.name AS department, u.active, u.must_change_password
      FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.deleted_at IS NULL ORDER BY u.active DESC, u.role, lower(u.name)`,
    sql<{ id: string; name: string; full_name: string | null }[]>`
      SELECT d.id, d.name, d.full_name FROM departments d
      WHERE d.active AND NOT EXISTS (SELECT 1 FROM users u WHERE u.department_id = d.id) ORDER BY d.sort_order, d.name`,
  ]);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader title="Users and departments" sub="Only the admin can register users. There is no public sign-up." />

      <section aria-labelledby="reg" className="card flex flex-col gap-5 p-6">
        <h2 id="reg" className="m-0 text-lg font-bold">Register a user</h2>
        <RegisterUserForm depts={free.map((d) => ({ id: d.id, label: deptLabel(d) }))} />
      </section>

      <section aria-labelledby="all" className="card flex flex-col">
        <h2 id="all" className="m-0 px-6 pb-2 pt-5 text-lg font-bold">All users</h2>
        <div className="overflow-x-auto px-2.5 pb-2.5">
          <table className="tbl min-w-[720px]">
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Department</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <UserRow key={u.id} isSelf={u.id === me.id}
                  u={{ id: u.id, name: u.name, username: u.username, roleLabel: ROLE_LABEL[u.role], department: u.department, active: u.active, mustChange: u.must_change_password }} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
