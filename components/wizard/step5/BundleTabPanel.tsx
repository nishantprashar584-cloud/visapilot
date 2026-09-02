import { Eye, Minus, PackageCheck, Plus } from "lucide-react";

export function BundleTabPanel({
  previewMode,
  isSubmitting,
  previewPacketTitle,
  bundleMetricItems,
  bundlePreviewPages,
  activeBundlePreviewPage,
  previewScale,
  onPreviousPage,
  onNextPage,
  onZoomOut,
  onZoomReset,
  onZoomIn,
  onSelectPage,
  onOpenConsulateReadyPacket,
}: {
  previewMode: boolean;
  isSubmitting: boolean;
  previewPacketTitle: string;
  bundleMetricItems: Array<{ label: string; value: string }>;
  bundlePreviewPages: Array<{ id: string; label: string; render: () => JSX.Element }>;
  activeBundlePreviewPage: number;
  previewScale: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomIn: () => void;
  onSelectPage: (index: number) => void;
  onOpenConsulateReadyPacket: () => void;
}) {
  const currentBundlePreviewPage = bundlePreviewPages[activeBundlePreviewPage] ?? bundlePreviewPages[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/24 bg-emerald-400/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-50">
            <PackageCheck className="h-3.5 w-3.5" />
            96% VFS Compliant & Ready
          </div>
          <h3 className="mt-4 text-2xl font-semibold text-white sm:text-[1.9rem]">Master Bundle</h3>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            Review the first page, confirm the packet metrics, and take the primary export action without leaving this landing context.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:min-w-[32rem] lg:justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-500 px-6 py-4 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(99,102,241,0.34)] transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1 lg:min-w-[18rem]"
          >
            <PackageCheck className="h-4 w-4" />
            {previewMode
              ? "Download Master VFS Bundle .PDF"
              : isSubmitting
                ? "Generating master bundle..."
                : "Generate & Save Master VFS Bundle"}
          </button>
          <button
            type="button"
            onClick={onOpenConsulateReadyPacket}
            disabled={!previewMode}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/16 bg-white/8 px-6 py-4 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/35 hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1 lg:min-w-[13rem]"
          >
            <Eye className="h-4 w-4" />
            {previewMode ? "Open full interactive viewer" : "Viewer unlocks after dashboard save"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {bundleMetricItems.map((metric) => (
          <div key={metric.label} className="rounded-[1rem] border border-white/14 bg-white/10 px-4 py-4 text-slate-100 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[1.2rem] bg-[#fffaf0] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.16)] sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Interactive A4 preview</p>
            <p className="mt-2 text-base font-semibold text-[#1b2430]">{previewPacketTitle}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={onPreviousPage} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:bg-slate-50">
              Prev page
            </button>
            <button type="button" onClick={onNextPage} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:bg-slate-50">
              Next page
            </button>
            <button type="button" onClick={onZoomOut} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50" aria-label="Zoom out">
              <Minus className="h-4 w-4" />
            </button>
            <button type="button" onClick={onZoomReset} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:bg-slate-50">
              {Math.round(previewScale * 100)}%
            </button>
            <button type="button" onClick={onZoomIn} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50" aria-label="Zoom in">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto pb-1">
          {bundlePreviewPages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              onClick={() => onSelectPage(index)}
              className={index === activeBundlePreviewPage
                ? "rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.12)]"
                : "rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] transition hover:bg-slate-50"}
            >
              {page.label}
            </button>
          ))}
        </div>

        <div className="mt-5 max-h-[80vh] overflow-y-auto rounded-[1rem] bg-[#f4ead2] p-3 sm:p-5">
          <div className="mx-auto w-full max-w-[30rem] transition-transform duration-200" style={{ transform: `scale(${previewScale})`, transformOrigin: "top center" }}>
            <div className="space-y-4">
              {currentBundlePreviewPage.render()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}