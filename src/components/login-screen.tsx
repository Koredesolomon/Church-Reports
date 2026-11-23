import Image from "next/image";
import { CHURCH_NAME, INSTAGRAM_URL } from "@/lib/config";
import LoginForm from "@/app/login/login-form";

/** The sign-in screen. `audience` picks the wording and which accounts the form accepts. */
export default function LoginScreen({ audience }: { audience: "admin" | "user" }) {
  const admin = audience === "admin";
  return (
    <div className={`sky flex min-h-screen flex-1 flex-col ${admin ? "sky-admin" : ""}`}>
      <div className="sky-arc size-[900px]" aria-hidden />
      <div className="sky-arc size-[1250px]" aria-hidden />
      <header className="flex items-center gap-2.5 p-5 sm:p-7">
        <Image src="/logo.webp" alt="" width={32} height={32} className="size-8 rounded-lg bg-white object-contain p-0.5 shadow-sm" priority />
        <span className="text-[15px] font-semibold text-white">{CHURCH_NAME}</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="glass-card flex w-full max-w-[380px] flex-col items-center gap-5 px-7 pb-7 pt-8">
          <span className="icon-tile">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10 17l5-5-5-5M15 12H4M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
            </svg>
          </span>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h1 className="m-0 text-[22px] font-bold tracking-tight">{admin ? "Administrator sign in" : "Sign in"}</h1>
            <p className="m-0 max-w-[260px] text-[14px] leading-relaxed text-muted">
              {admin ? "Review reports, manage members and register users." : "Use the username the church office registered for you."}
            </p>
          </div>
          <div className="w-full"><LoginForm audience={audience} /></div>
          {admin && (
            <details className="w-full text-sm text-muted">
              <summary className="cursor-pointer text-right font-medium text-ink-2 marker:content-none hover:text-ink">Forgot password?</summary>
              <p className="m-0 mt-2 rounded-lg bg-[#f0f2f6] px-3 py-2.5 leading-relaxed">The administrator password is set in the server&apos;s environment file.</p>
            </details>
          )}
          <div className="flex w-full flex-col items-center gap-3">
            <div className="flex w-full items-center gap-3 text-xs text-muted" aria-hidden>
              <span className="flex-1 border-t border-dashed border-[#d5d9e3]" /><span>Follow us on</span><span className="flex-1 border-t border-dashed border-[#d5d9e3]" />
            </div>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram (opens in a new tab)"
              className="grid h-11 w-24 place-items-center rounded-xl border border-[#e6e9f0] bg-white text-[#e1306c] shadow-sm transition hover:-translate-y-px hover:shadow-md"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
              </svg>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
