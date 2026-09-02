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
            <div className="absolute inset-0 bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]">
              {page.lines.map((line, lineIndex) => (
                <p
                  key={`${lineIndex}-${line.y}`}
                  className="absolute m-0 whitespace-pre-wrap text-[11px] leading-[16px] text-[#1b2430]"
                  style={{
                    left: `${(line.x / layout.pageWidth) * 100}%`,
                    top: `${((layout.pageHeight - line.y - line.fontSize) / layout.pageHeight) * 100}%`,
                    width: `${((layout.pageWidth - line.x - layout.margin) / layout.pageWidth) * 100}%`,
                  }}
                >
                  {line.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}