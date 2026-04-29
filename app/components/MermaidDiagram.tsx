"use client";

import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  flowchart: { htmlLabels: true, useMaxWidth: true, curve: "basis" },
});

export default function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "_");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    mermaid
      .render(`mermaid-${id}`, chart)
      .then(({ svg }) => {
        if (!cancelled) setSvg(svg);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (error) {
    return (
      <pre className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 whitespace-pre-wrap">
        Mermaid render error: {error}
      </pre>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full cursor-zoom-in overflow-x-auto text-left"
        aria-label="흐름도 확대 보기"
      >
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="mt-1 text-right text-[11px] text-neutral-400 group-hover:text-neutral-600">
          클릭해서 크게 보기 ⤢
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[92vh] w-full max-w-[96vw] overflow-auto rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 hover:border-neutral-400"
              aria-label="닫기"
            >
              ✕ 닫기
            </button>
            <div
              className="[&_svg]:!max-w-none [&_svg]:h-auto"
              style={{ minWidth: "min(1100px, 90vw)" }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      )}
    </>
  );
}
