"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; badge?: number; match?: string };

/** Sidebar links; a column on large screens, a scrolling row on small ones. */
export default function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const on = (n: NavItem) => path === (n.match ?? n.href) || path.startsWith((n.match ?? n.href) + "/");
  return (
    <nav aria-label="Main" className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={on(n) ? "page" : undefined}
          className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-[15px] no-underline ${
            on(n) ? "bg-brand-soft font-semibold text-brand" : "font-medium text-ink-2 hover:bg-[#f1f2f8] hover:text-ink"
          }`}
        >
          {n.label}
          {!!n.badge && (
            <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">{n.badge}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
