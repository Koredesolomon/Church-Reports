import Image from "next/image";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/session";
import { sql } from "@/lib/db";
import { CHURCH_NAME } from "@/lib/config";
import type { Role } from "@/lib/users";
import NavLinks, { type NavItem } from "@/components/nav-links";
import NotificationBellLoader from "@/components/notification-bell-loader";
import { logout } from "../login/actions";

async function navFor(role: Role, userId: string): Promise<{ items: NavItem[]; roleLabel: string }> {
  if (role === "admin") {
    return {
      roleLabel: "Admin",
      items: [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/reviews", label: "Review queue" },
        { href: "/tracker", label: "Missing reports" },
        { href: "/archive", label: "Archive" },
        { href: "/members", label: "Members" },
        { href: "/users", label: "Users and departments" },
      ],
    };
  }
  if (role === "leadership") {
    return {
      roleLabel: "Leadership",
      items: [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/archive", label: "Archive" },
        { href: "/members", label: "Members" },
        { href: "/settings", label: "Settings" },
      ],
    };
  }
  const [{ unread }] = await sql<{ unread: number }[]>`SELECT count(*)::int AS unread FROM notifications WHERE user_id = ${userId} AND read_at IS NULL`;
  return {
    roleLabel: "Department head",
    items: [
      { href: "/reports", label: "My reports" },
      { href: "/members", label: "My department's members" },
      { href: "/notifications", label: "Notifications", badge: unread },
      { href: "/settings", label: "Settings" },
    ],
  };
}

async function SidebarBody() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { items, roleLabel } = await navFor(user.role, user.id);
  let label = roleLabel;
  if (user.role === "head" && user.department_id) {
    const [d] = await sql<{ name: string }[]>`SELECT name FROM departments WHERE id = ${user.department_id}`;
    label = `${d?.name ?? ""} head`;
  }
  return (
    <>
      <NavLinks items={items} />
      <div className="mt-auto hidden flex-col gap-0.5 border-t border-line px-2 pt-3 lg:flex">
        <span className="truncate text-sm font-semibold">{user.name}</span>
        <span className="text-[13px] text-muted">{label}</span>
        <form action={logout}><button className="linkbtn mt-2 !no-underline">Sign out</button></form>
      </div>
    </>
  );
}

async function TopBarUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-[12rem] truncate text-[15px] font-semibold sm:block">{user.name}</span>
      <span aria-hidden className="grid size-11 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">{initials}</span>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <aside className="flex flex-col gap-4 border-b border-line bg-white p-4 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:gap-6 lg:border-b-0 lg:border-r lg:p-4 lg:py-6">
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3">
            <Image src="/logo.webp" alt="" width={40} height={40} className="size-10 rounded-md object-contain" priority />
            <span className="text-[15px] font-bold leading-tight">{CHURCH_NAME}</span>
          </div>
          <form action={logout} className="lg:hidden"><button className="linkbtn">Sign out</button></form>
        </div>
        <Suspense fallback={<div className="h-10" />}><SidebarBody /></Suspense>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
        <div className="mb-5 flex items-center justify-end gap-4">
          <Suspense fallback={<span className="block size-11 rounded-xl bg-[#eceef4]" />}><NotificationBellLoader /></Suspense>
          <Suspense fallback={<span className="block size-11 rounded-full bg-brand-soft" />}><TopBarUser /></Suspense>
        </div>
        {children}
      </main>
    </div>
  );
}
