"use client";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import MonthOptions from "@/components/month-options";

/** A month dropdown that applies as soon as a month is chosen (it sets ?m= on the current page). */
export default function MonthPicker({
  value, periods, label, hideLabel = false, className,
}: {
  value: string;
  periods: string[];
  label: string;
  hideLabel?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  return (
    <div className="compact flex items-center">
      <div className="field !flex-none">
        <label htmlFor="m" className={hideLabel ? "sr-only" : undefined}>{label}</label>
        <select
          key={value}
          id="m"
          defaultValue={value}
          aria-busy={pending}
          className={`${className ?? ""} ${pending ? "opacity-60" : ""}`}
          onChange={(e) => {
            const month = e.target.value;
            start(() => router.push(`${pathname}?m=${month}`));
          }}
        >
          <MonthOptions periods={periods} />
        </select>
      </div>
    </div>
  );
}
