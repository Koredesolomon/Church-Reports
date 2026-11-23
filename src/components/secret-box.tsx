/** Shows a freshly generated temporary password, once. */
export default function SecretBox({ message, label, value }: { message?: string; label: string; value: string }) {
  return (
    <div role="status" className="flex flex-col gap-1.5 rounded-lg border border-ok-line bg-ok-bg p-4">
      {message && <span className="text-sm font-semibold text-ok-ink">{message}</span>}
      <span className="text-[15px]">{label}: <strong className="select-all text-lg tracking-wider">{value}</strong></span>
      <span className="text-sm leading-relaxed text-ink-2">This is the newest password, and any earlier one no longer works. It is shown once. Give it to the user in person. They must choose a new password when they first sign in.</span>
    </div>
  );
}
