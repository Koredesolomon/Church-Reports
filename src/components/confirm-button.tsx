"use client";
import { useId, useRef } from "react";

/**
 * A button that asks "are you sure?" in the app's own dialog before submitting the surrounding form.
 * The confirming button submits with `name`/`value`, exactly as a plain submit button would.
 * A native <dialog> gives focus trapping and Escape-to-close for free.
 */
export default function ConfirmButton({
  label, className, title, children, confirmLabel, name, value, disabled,
}: {
  label: string;
  className?: string;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  name: string;
  value: string;
  disabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const close = () => dialog.current?.close();

  return (
    <>
      <button type="button" disabled={disabled} className={className} onClick={() => dialog.current?.showModal()}>{label}</button>
      <dialog
        ref={dialog}
        className="confirm-dialog"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(e) => { if (e.target === dialog.current) close(); }} // a click on the dimmed backdrop cancels
      >
        <div className="flex flex-col items-center gap-4 p-6 text-center sm:p-7">
          <span aria-hidden className="grid size-14 place-items-center rounded-2xl bg-[#fde4e4] text-late-ink">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
          </span>
          <h2 id={titleId} className="m-0 text-xl font-bold tracking-tight">{title}</h2>
          <div id={bodyId} className="text-[15px] leading-relaxed text-ink-2">{children}</div>
          <div className="mt-2 flex w-full flex-col-reverse gap-3 sm:flex-row">
            {/* Cancel is focused first, so pressing Enter by accident does nothing harmful. */}
            <button type="button" className="btn ghost flex-1" autoFocus onClick={close}>Cancel</button>
            <button type="submit" name={name} value={value} className="btn destroy flex-1" onClick={() => setTimeout(close, 0)}>{confirmLabel}</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
