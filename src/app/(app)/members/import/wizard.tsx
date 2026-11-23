"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { confirmImport, previewImport, type ImportPreview } from "../actions";

const MAX_BYTES = 2 * 1024 * 1024;

function csvCell(v: string) { return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }

export default function ImportWizard() {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [done, setDone] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const step = done ? 3 : preview && !preview.error ? 2 : 1;

  async function onFile(f: File | undefined) {
    setError(""); setPreview(null); setDone(null);
    if (!f) return;
    if (f.size > MAX_BYTES) { setError("That file is larger than 2 MB."); return; }
    const t = await f.text();
    setText(t); setName(f.name);
    start(async () => {
      const p = await previewImport(t);
      if (p.error) setError(p.error); else setPreview(p);
    });
  }

  function downloadProblems() {
    if (!preview) return;
    const lines = [[...preview.header, "Problem"].map(csvCell).join(",")];
    for (const p of preview.problems) lines.push([...preview.header.map((_, i) => p.cells[i] ?? ""), p.problem].map(csvCell).join(","));
    const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "problem-rows.csv" });
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <ol className="m-0 flex list-none flex-wrap gap-3 p-0 text-sm font-semibold" aria-label="Steps">
        {["Upload", "Check", "Import"].map((l, i) => (
          <li key={l} aria-current={step === i + 1 ? "step" : undefined} className={`rounded-full px-4 py-2 ${step === i + 1 ? "bg-brand text-white" : "bg-white text-muted border border-line"}`}>{i + 1} {l}</li>
        ))}
      </ol>

      {step === 1 && (
        <section className="card flex flex-col gap-5 p-6">
          <p className="m-0 text-[15px] leading-relaxed">Upload a CSV with one member per row. Dates can be written 2024-03-09 or 09/03/2024. Separate several departments with a semicolon.</p>
          <div><a className="btn ghost" href="/members/template" download>Download the CSV template</a></div>
          <div className="rounded-[10px] border-[1.5px] border-dashed border-[#9aa0bc] bg-[#fafafd] p-5">
            <label htmlFor="csv" className="lbl mb-2 block">CSV file</label>
            <input id="csv" type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="w-full text-[15px]" />
          </div>
          {pending && <p className="m-0 text-sm text-muted" role="status">Reading the file…</p>}
          {error && <p role="alert" className="m-0 text-sm font-medium text-late-ink">{error}</p>}
        </section>
      )}

      {step === 2 && preview && (
        <>
          <section className="card flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-semibold">{name} · {preview.total} rows read</span>
              <button className="linkbtn" onClick={() => { setPreview(null); setText(""); }}>Choose another file</button>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex min-w-[160px] flex-1 flex-col gap-0.5 rounded-2xl bg-[#ddf3e6] px-5 py-4"><span className="text-[28px] font-bold">{preview.ready}</span><span className="text-sm text-ink-2">Ready to import</span></div>
              <div className="flex min-w-[160px] flex-1 flex-col gap-0.5 rounded-2xl bg-[#fce1e1] px-5 py-4"><span className="text-[28px] font-bold">{preview.problems.length}</span><span className="text-sm text-ink-2">Need attention</span></div>
            </div>
          </section>
          {preview.problems.length > 0 && (
            <section className="card flex flex-col">
              <h2 className="m-0 px-6 pb-2 pt-5 text-lg font-bold">Rows that need attention</h2>
              <div className="overflow-x-auto px-2.5 pb-2.5">
                <table className="tbl min-w-[420px]"><thead><tr><th>Row</th><th>Problem</th></tr></thead>
                  <tbody>{preview.problems.map((p) => <tr key={p.row}><td className="whitespace-nowrap font-semibold">Row {p.row}</td><td>{p.problem}</td></tr>)}</tbody>
                </table>
              </div>
              <p className="m-0 px-6 pb-4 pt-2 text-[13px] text-muted">Row numbers match your spreadsheet (the header is row 1). Rows with problems are skipped. Fix them in the file and import it again.</p>
            </section>
          )}
          {error && <p role="alert" className="m-0 text-sm font-medium text-late-ink">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button className="btn" disabled={pending || preview.ready === 0} onClick={() => start(async () => {
              const r = await confirmImport(text);
              if (r.error) setError(r.error); else setDone({ imported: r.imported ?? 0, skipped: r.skipped ?? 0 });
            })}>{pending ? "Importing…" : `Import ${preview.ready} members`}</button>
            {preview.problems.length > 0 && <button className="btn ghost" onClick={downloadProblems}>Download the {preview.problems.length} problem rows</button>}
          </div>
        </>
      )}

      {step === 3 && done && (
        <section className="card flex flex-col gap-4 p-6" role="status">
          <h2 className="m-0 text-lg font-bold">Import finished</h2>
          <p className="m-0 text-[15px]">{done.imported} members were added.{done.skipped ? ` ${done.skipped} rows were skipped.` : ""}</p>
          <div><Link href="/members" className="btn">Open the member list</Link></div>
        </section>
      )}
    </div>
  );
}
