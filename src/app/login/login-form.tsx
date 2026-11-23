"use client";
import { useActionState, useState } from "react";
import { login } from "./actions";

const svg = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export default function LoginForm({ audience }: { audience: "admin" | "user" }) {
  const [state, action, pending] = useActionState(login, undefined);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="audience" value={audience} />
      <label className="sky-field">
        <span className="sr-only">Username</span>
        <svg {...svg}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.9 3.6-6 8-6s8 2.1 8 6" /></svg>
        <input name="username" type="text" placeholder="Username" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
      </label>
      <label className="sky-field">
        <span className="sr-only">Password</span>
        <svg {...svg}><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        <input name="password" type={show ? "text" : "password"} placeholder="Password" autoComplete="current-password" required />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
          {show
            ? <svg {...svg}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
            : <svg {...svg}><path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>}
        </button>
      </label>
      {state?.error && <p role="alert" className="m-0 text-center text-sm font-medium text-late-ink">{state.error}</p>}
      <button disabled={pending} className="btn-dark mt-2">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
