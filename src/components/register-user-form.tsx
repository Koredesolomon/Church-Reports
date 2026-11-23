"use client";
import { useActionState, useState } from "react";
import { registerUser } from "@/app/(app)/users/actions";
import SecretBox from "@/components/secret-box";

type Dept = { id: string; label: string };

/** The input fields. Re-mounted after each successful registration so they come back empty. */
function Fields({ depts }: { depts: Dept[] }) {
  const [role, setRole] = useState("head");
  return (
    <>
      <div className="flex flex-wrap gap-4">
        <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" placeholder="First and last name" required /></div>
        <div className="field"><label htmlFor="username">Username</label><input id="username" name="username" autoCapitalize="none" spellCheck={false} placeholder="e.g. tunde.bello" required /></div>
        <div className="field"><label htmlFor="role">Role</label>
          <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="head">Department head</option><option value="leadership">Leadership (view only)</option><option value="admin">Admin</option>
          </select>
        </div>
        {role === "head" && (
          <div className="field"><label htmlFor="dept">Department</label>
            <select id="dept" name="department" defaultValue="" required>
              <option value="" disabled>Choose a department</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
        )}
      </div>
      {role === "head" && depts.length === 0 && <p className="m-0 text-sm text-muted">Every department already has a head.</p>}
    </>
  );
}

export default function RegisterUserForm({ depts }: { depts: Dept[] }) {
  const [state, action, pending] = useActionState(registerUser, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Fields key={state?.secret?.value ?? "new"} depts={depts} />
      {state?.error && <p role="alert" className="m-0 text-sm font-medium text-late-ink">{state.error}</p>}
      {state?.secret && <SecretBox message={state.message} label={`Temporary password for ${state.secret.label}`} value={state.secret.value} />}
      <div><button disabled={pending} className="btn">{pending ? "Registering…" : "Register user"}</button></div>
    </form>
  );
}
