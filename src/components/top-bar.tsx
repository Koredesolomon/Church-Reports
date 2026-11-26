"use client";
import { usePathname } from "next/navigation";

// These pages show the bell in their own header, beside the month dropdown.
const BELL_IN_HEADER = ["/dashboard", "/reviews", "/tracker", "/reports"];

/** The row above the page content that holds the bell on every other page. */
export default function TopBar({ children }: { children: React.ReactNode }) {
  if (BELL_IN_HEADER.includes(usePathname())) return null;
  return <div className="no-print relative z-20 mb-5 flex items-center justify-end">{children}</div>;
}
