"use client";
import { useState } from "react";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/limits";

/** A file picker that refuses to attach more than the upload limit, before anything is sent. */
export default function FileInput({ id, name }: { id: string; name: string }) {
  const [problem, setProblem] = useState("");
  return (
    <>
      <input
        id={id}
        name={name}
        type="file"
        multiple
        accept=".pdf,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp"
        className="w-full text-[15px]"
        aria-describedby={problem ? `${id}-problem` : undefined}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          const total = files.reduce((sum, f) => sum + f.size, 0);
          if (total > MAX_UPLOAD_BYTES) {
            setProblem(`Those files are ${(total / 1024 / 1024).toFixed(1)} MB together. Attach up to ${MAX_UPLOAD_LABEL} at a time, or compress them.`);
            e.target.value = "";
          } else setProblem("");
        }}
      />
      {problem && <p id={`${id}-problem`} role="alert" className="m-0 mt-2 text-sm font-medium text-late-ink">{problem}</p>}
    </>
  );
}
