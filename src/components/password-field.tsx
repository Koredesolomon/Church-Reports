"use client";
import { useState } from "react";

const svg = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/** A labelled password box with a button that shows or hides what was typed. */
export default function PasswordField({
  id, name, label, autoComplete, minLength, hint,
}: { id: string; name: string; label: string; autoComplete: string; minLength?: number; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} required className="!pr-12" />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={show}
          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-muted hover:text-ink"
        >
          {show
            ? <svg {...svg}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
            : <svg {...svg}><path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>}
        </button>
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
