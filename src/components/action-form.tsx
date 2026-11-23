"use client";
import { useActionState, useRef } from "react";

type State = { error?: string; message?: string; secret?: { label: string; value: string } } | undefined;

export default function ActionForm({
  action,
  children,
  className,
  id,
  resetOnSuccess = false,
  confirmValue,
  confirmText = "Are you sure?",
  noStatus = false,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  children: React.ReactNode;
  className?: string;
  id?: string;
  resetOnSuccess?: boolean;
  /** Ask for confirmation when the submitting button has this value. */
  confirmValue?: string;
  confirmText?: string;
  noStatus?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: State, fd: FormData) => {
    const next = await action(prev, fd);
    if (resetOnSuccess && next && !next.error) ref.current?.reset();
    return next;
  }, undefined);

  return (
    <form
      id={id}
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (confirmValue && submitter?.value === confirmValue && !confirm(confirmText)) e.preventDefault();
      }}
    >
      <fieldset disabled={pending} className="contents">{children}</fieldset>
      {!noStatus && state?.error && <p role="alert" className="text-sm font-medium text-late-ink">{state.error}</p>}
      {!noStatus && state?.message && <p role="status" className="text-sm font-medium text-ok-ink">{state.message}</p>}
      {state?.secret && (
        <div role="status" className="flex flex-col gap-1.5 rounded-lg border border-ok-line bg-ok-bg p-4">
          <span className="text-sm font-semibold text-ok-ink">{state.message}</span>
          <span>{state.secret.label}: <strong className="select-all text-lg tracking-wider">{state.secret.value}</strong></span>
          <span className="text-sm leading-relaxed text-ink-2">This is shown once. Give it to the user in person. They must choose a new password when they first sign in.</span>
        </div>
      )}
    </form>
  );
}
