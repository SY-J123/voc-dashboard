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

  if (error) {
    return (
      <pre className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 whitespace-pre-wrap">
        Mermaid render error: {error}
      </pre>
    );
  }

  return (
    <div
      className="mermaid-diagram overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
