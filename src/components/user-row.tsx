"use client";
import { useActionState } from "react";
import { userAction } from "@/app/(app)/users/actions";
import ConfirmButton from "@/components/confirm-button";
import SecretBox from "@/components/secret-box";

export type UserRowData = { id: string; name: string; username: string; roleLabel: string; department: string | null; active: boolean; mustChange: boolean };

/** One row of the users table. A reset's new password appears directly under that user, full width. */
export default function UserRow({ u, isSelf }: { u: UserRowData; isSelf: boolean }) {
  const [state, action, pending] = useActionState(userAction, undefined);
  const result = state?.secret || state?.error || state?.message;
  return (
    <>
      <tr className="align-top">
        <td className="font-semibold">{u.name}</td><td>{u.username}</td><td>{u.roleLabel}</td><td>{u.department ?? "None"}</td>
        <td>{!u.active ? <span className="chip s-draft">Deactivated</span> : u.mustChange ? <span className="chip s-submitted">Not signed in yet</span> : <span className="chip s-approved">Active</span>}</td>
        <td>
          <form action={action} className="flex flex-wrap items-center gap-2 whitespace-nowrap">
            <input type="hidden" name="id" value={u.id} />
            {u.active && <button disabled={pending} name="intent" value="reset" className="linkbtn">Reset password</button>}
            {u.active && !isSelf && <><span aria-hidden className="text-muted">·</span><button disabled={pending} name="intent" value="deactivate" className="linkbtn">Deactivate</button></>}
            {!u.active && <button disabled={pending} name="intent" value="reactivate" className="linkbtn">Reactivate</button>}
            {!isSelf && (
              <>
                <span aria-hidden className="text-muted">·</span>
                <ConfirmButton
                  label="Delete"
                  className="linkbtn !text-late-ink"
                  disabled={pending}
                  name="intent"
                  value="delete"
                  title="Delete this user?"
                  confirmLabel="Delete user"
                >
                  <strong className="text-ink">{u.name}</strong> ({u.username}) will no longer be able to sign in. This can&apos;t be undone.
                </ConfirmButton>
              </>
            )}
          </form>
        </td>
      </tr>
      {result && (
        <tr>
          <td colSpan={6} className="!pt-0">
            {state?.secret
              ? <SecretBox message={state.message} label={`New temporary password for ${u.username}`} value={state.secret.value} />
              : state?.error
                ? <p role="alert" className="m-0 text-sm font-medium text-late-ink">{state.error}</p>
                : <p role="status" className="m-0 text-sm font-medium text-ok-ink">{state?.message}</p>}
          </td>
        </tr>
      )}
    </>
  );
}
