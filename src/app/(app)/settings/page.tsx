import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/users";
import { PageHeader } from "@/components/ui";
import PasswordForm from "./password-form";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

export default async function SettingsPage() {
  // Deliberately not requireUser(): a user on a temporary password is sent *here* to set their own.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/dashboard");

  let department: string | null = null;
  if (user.department_id) {
    const [d] = await sql<{ name: string }[]>`SELECT name FROM departments WHERE id = ${user.department_id}`;
    department = d?.name ?? null;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-7">
      <PageHeader title="Settings" sub="Your account and password." />

      {user.must_change_password && (
        <div role="status" className="flex flex-col gap-1 rounded-lg border border-warn-line bg-warn-bg px-4 py-3.5">
          <span className="text-[13px] font-semibold text-warn-ink">Choose a new password</span>
          <span className="text-[15px] leading-relaxed">You signed in with a temporary password. Set your own password before you continue.</span>
        </div>
      )}

      <section aria-labelledby="acct" className="card flex flex-col gap-1 p-6">
        <h2 id="acct" className="m-0 mb-2 text-lg font-bold">Your account</h2>
        <div className="kv"><span>Name</span><span>{user.name}</span></div>
        <div className="kv"><span>Username</span><span>{user.username}</span></div>
        <div className="kv"><span>Role</span><span>{ROLE_LABEL[user.role]}</span></div>
        {department && <div className="kv"><span>Department</span><span>{department}</span></div>}
        <p className="hint m-0 pt-3">To change your name or username, ask the church office.</p>
      </section>

      <section aria-labelledby="pw" className="card flex flex-col gap-5 p-6">
        <h2 id="pw" className="m-0 text-lg font-bold">{user.must_change_password ? "Set your password" : "Change password"}</h2>
        <PasswordForm temporary={user.must_change_password} />
      </section>
    </div>
  );
}
