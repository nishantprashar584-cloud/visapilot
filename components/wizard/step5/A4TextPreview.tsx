import type { A4TextLayout } from "@/lib/pdf/a4TextLayout";

export function A4TextPreview({
  layout,
  title,
}: {
  layout: A4TextLayout;
  title: string;
}) {
  return (
    <div className="space-y-4">
      {layout.pages.map((page, index) => (
        <div key={`${title}-${index + 1}`} className="space-y-3">
          <div className="flex items-start justify-between gap-4 px-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Preview pane</p>
              <p className="mt-2 text-base font-semibold text-[#1b2430]">{title}</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Page {index + 1} of {layout.pages.length}
            </span>
          </div>

          <div className="relative aspect-[1/1.414] w-full overflow-hidden rounded-[1rem] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#fffdf8,#fff7ea)]" />
            <svg
              className="absolute inset-0 h-full w-full bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]"
              viewBox={`0 0 ${layout.pageWidth} ${layout.pageHeight}`}
              preserveAspectRatio="none"
              aria-label={`${title} page ${index + 1}`}
            >
              {page.lines.map((line, lineIndex) => {
                if (!line.text.trim()) {
                  return null;
                }

                return (
                  <text
                    key={`${lineIndex}-${line.y}`}
                    x={line.x}
                    y={layout.pageHeight - line.y}
                    fontSize={line.fontSize}
                    fontFamily="Helvetica, Arial, sans-serif"
                    fill="#1b2430"
                    xmlSpace="preserve"
                  >
                    {line.text}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}