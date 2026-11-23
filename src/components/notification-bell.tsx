"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { markAllNotificationsRead, markNotificationRead, setNotificationArchived } from "@/app/(app)/notifications/actions";

export type BellItem = {
  id: string; title: string; body: string | null; href: string | null;
  kind: "submitted" | "approved" | "returned" | "reminder" | "info"; ago: string; unread: boolean; archived: boolean;
};

const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const KIND: Record<BellItem["kind"], { bg: string; fg: string; icon: React.ReactNode }> = {
  submitted: { bg: "#e6e8f8", fg: "#2e3192", icon: <svg {...svg}><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg> },
  approved: { bg: "#dff3e6", fg: "#16603a", icon: <svg {...svg}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg> },
  returned: { bg: "#fff0d2", fg: "#7a4a00", icon: <svg {...svg}><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></svg> },
  reminder: { bg: "#fde4e4", fg: "#a5121a", icon: <svg {...svg}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg> },
  info: { bg: "#eef0f5", fg: "#444b63", icon: <svg {...svg}><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0" /></svg> },
};

type Tab = "inbox" | "earlier" | "archived";

/** The bell in the top bar. Opens a panel with Inbox, Earlier and Archived tabs. */
export default function NotificationBell({ items }: { items: BellItem[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("inbox");
  const [, start] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const inbox = items.filter((i) => !i.archived && i.unread);
  const earlier = items.filter((i) => !i.archived && !i.unread);
  const archived = items.filter((i) => i.archived);
  const shown = tab === "inbox" ? inbox : tab === "earlier" ? earlier : archived;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const tabs: [Tab, string, number | null][] = [["inbox", "Inbox", inbox.length], ["earlier", "Earlier", null], ["archived", "Archived", null]];

  return (
    <div ref={root} className="relative">
      <button
        ref={btn}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={inbox.length ? `Notifications, ${inbox.length} unread` : "Notifications"}
        className={`relative grid size-11 cursor-pointer place-items-center rounded-xl border-0 text-ink ${open ? "bg-[#e2e4ec]" : "bg-[#eceef4] hover:bg-[#e2e4ec]"}`}
      >
        <svg {...svg} width="22" height="22"><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0" /></svg>
        {inbox.length > 0 && (
          <span aria-hidden className="absolute right-2 top-2 size-2.5 rounded-full bg-brand-red ring-2 ring-[#eceef4]" />
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+14px)] z-50 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white shadow-[0_24px_60px_-20px_rgba(20,23,43,.35)]"
        >
          <span aria-hidden className="absolute -top-[7px] right-[18px] size-3.5 rotate-45 rounded-sm border-l border-t border-line bg-white" />
          <div className="flex items-center justify-between px-5 pb-1 pt-5">
            <h2 className="m-0 text-base font-semibold">Notifications</h2>
            <form action={markAllNotificationsRead}>
              <button disabled={inbox.length === 0} className="cursor-pointer border-0 bg-transparent p-0 text-sm text-muted hover:text-ink disabled:cursor-default disabled:opacity-50">Mark all as read</button>
            </form>
          </div>

          <div role="tablist" aria-label="Notification groups" className="flex items-center gap-5 border-b border-line px-5 pt-3">
            {tabs.map(([key, label, count]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`-mb-px flex cursor-pointer items-center gap-2 border-0 border-b-2 bg-transparent px-0 pb-2.5 text-[15px] ${tab === key ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
              >
                {label}
                {count !== null && count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-xs font-semibold text-white">{count}</span>}
              </button>
            ))}
          </div>

          <ul role="tabpanel" className="m-0 max-h-[min(60vh,28rem)] list-none overflow-y-auto p-0">
            {shown.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted">
                {tab === "inbox" ? "You're all caught up." : tab === "earlier" ? "Nothing here yet." : "No archived notifications."}
              </li>
            )}
            {shown.map((n) => {
              const k = KIND[n.kind] ?? KIND.info;
              const content = (
                <>
                  <span aria-hidden style={{ background: k.bg, color: k.fg }} className="grid size-11 shrink-0 place-items-center rounded-full [&>svg]:size-5">{k.icon}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`text-[15px] leading-snug ${n.unread ? "font-semibold" : "font-medium"} text-ink`}>{n.title}</span>
                    {n.body && <span className="line-clamp-2 text-sm leading-snug text-ink-2">{n.body}</span>}
                    <span className="text-[13px] text-muted">{n.ago}</span>
                  </span>
                </>
              );
              return (
                <li key={n.id} className={`flex items-start gap-1 border-b border-line-soft last:border-0 ${n.unread ? "bg-[#f4f4fd]" : ""}`}>
                  {n.href ? (
                    <Link href={n.href} onClick={() => { setOpen(false); if (n.unread) start(() => markNotificationRead(n.id)); }} className="flex min-w-0 flex-1 items-start gap-3.5 px-5 py-4 text-inherit no-underline hover:text-inherit">
                      {content}
                    </Link>
                  ) : (
                    <button type="button" onClick={() => { if (n.unread) start(() => markNotificationRead(n.id)); }} className="flex min-w-0 flex-1 cursor-pointer items-start gap-3.5 border-0 bg-transparent px-5 py-4 text-left">
                      {content}
                    </button>
                  )}
                  <div className="flex shrink-0 flex-col items-center gap-2 pr-4 pt-4">
                    {n.unread && <span aria-label="Unread" role="img" className="size-2.5 rounded-full bg-brand-red" />}
                    <form action={setNotificationArchived}>
                      <input type="hidden" name="id" value={n.id} />
                      <input type="hidden" name="archived" value={n.archived ? "false" : "true"} />
                      <button
                        aria-label={n.archived ? "Restore notification" : "Archive notification"}
                        title={n.archived ? "Restore" : "Archive"}
                        className="grid size-7 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-muted hover:bg-black/5 hover:text-ink"
                      >
                        {n.archived
                          ? <svg {...svg} width="16" height="16"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
                          : <svg {...svg} width="16" height="16"><rect x="3" y="4" width="18" height="5" rx="1.5" /><path d="M5 9v10h14V9M10 13h4" /></svg>}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
