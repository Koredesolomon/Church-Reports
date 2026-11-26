"use client";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

/** A dropdown that applies as soon as something is chosen, by setting one query parameter on the current page. */
export default function ParamSelect({ param, value, label, options }: { param: string; value: string; label: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  return (
    <div className="compact flex items-center">
      <div className="field !flex-none">
        <label htmlFor={param}>{label}</label>
        <select
          key={value}
          id={param}
          defaultValue={value}
          aria-busy={pending}
          className={pending ? "opacity-60" : ""}
          onChange={(e) => {
            const next = e.target.value;
            start(() => router.push(`${pathname}?${param}=${encodeURIComponent(next)}`));
          }}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}
