"use client";
import { useState } from "react";
import type { Person } from "@/lib/reports";

/** The list of new members on a New members report: add and remove rows. */
export default function PeopleEditor({ initial }: { initial: Person[] }) {
  const [rows, setRows] = useState<(Person & { key: number })[]>(
    (initial.length ? initial : [{ first: "", last: "", phone: "", joined: "" }]).map((p, i) => ({ ...p, key: i })),
  );
  const [next, setNext] = useState(1000);
  const set = (key: number, patch: Partial<Person>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const filled = rows.filter((r) => r.first || r.last || r.phone || r.joined).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="lbl">Number of new members</span>
        <span className="text-2xl font-bold" aria-live="polite">{filled}</span>
        <span className="hint">Counted from the list below.</span>
      </div>
      <h3 className="m-0 text-base font-bold">New members this month</h3>
      {rows.map((r, i) => (
        <fieldset key={r.key} className="m-0 flex flex-col gap-3 rounded-lg border border-line p-4">
          <legend className="px-1 text-[13px] font-semibold text-muted">Person {i + 1}</legend>
          <div className="flex flex-wrap gap-4">
            <div className="field"><label htmlFor={`f${r.key}`}>First name</label><input id={`f${r.key}`} name="first" value={r.first} onChange={(e) => set(r.key, { first: e.target.value })} /></div>
            <div className="field"><label htmlFor={`l${r.key}`}>Last name</label><input id={`l${r.key}`} name="last" value={r.last} onChange={(e) => set(r.key, { last: e.target.value })} /></div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="field"><label htmlFor={`p${r.key}`}>Phone</label><input id={`p${r.key}`} name="phone" inputMode="tel" value={r.phone} onChange={(e) => set(r.key, { phone: e.target.value })} /></div>
            <div className="field"><label htmlFor={`j${r.key}`}>Date joined</label><input id={`j${r.key}`} name="joined" type="date" value={r.joined} onChange={(e) => set(r.key, { joined: e.target.value })} /></div>
          </div>
          {rows.length > 1 && (
            <div><button type="button" className="linkbtn" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}>Remove person {i + 1}</button></div>
          )}
        </fieldset>
      ))}
      <div>
        <button type="button" className="btn ghost" onClick={() => { setRows((r) => [...r, { first: "", last: "", phone: "", joined: "", key: next }]); setNext(next + 1); }}>
          Add a person
        </button>
      </div>
    </div>
  );
}
