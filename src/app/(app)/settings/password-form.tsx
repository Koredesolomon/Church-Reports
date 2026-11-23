"use client";
import { useActionState } from "react";
import PasswordField from "@/components/password-field";
import { changePassword } from "./actions";

export default function PasswordForm({ temporary }: { temporary: boolean }) {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="flex max-w-md flex-col gap-5">
      <PasswordField id="cur" name="current" label={temporary ? "Temporary password" : "Current password"} autoComplete="current-password" />
      <PasswordField id="new" name="next" label="New password" autoComplete="new-password" minLength={10} hint="At least 10 characters." />
      <PasswordField id="conf" name="confirm" label="Confirm new password" autoComplete="new-password" />
      {state?.error && <p role="alert" className="m-0 text-sm font-medium text-late-ink">{state.error}</p>}
      {state?.message && <p role="status" className="m-0 text-sm font-medium text-ok-ink">{state.message}</p>}
      <div><button disabled={pending} className="btn">{pending ? "Saving…" : temporary ? "Save password and continue" : "Change password"}</button></div>
    </form>
  );
}
