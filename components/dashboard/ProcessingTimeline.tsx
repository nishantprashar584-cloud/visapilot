export function ProcessingTimeline({ progress }: { progress: number }) {
  const stageLabel = progress >= 80 ? "Decision window" : progress >= 40 ? "Under review" : "Received";

  return (
    <div className="space-y-4 rounded-[1rem] border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Embassy processing tracker</p>
          <p className="mt-1 text-sm font-semibold text-white">{stageLabel}</p>
        </div>
        <span className="vp-badge vp-badge-neutral">{progress}% of 15-day window</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
        <span className={progress < 40 ? "font-semibold text-cyan-100" : ""}>Received</span>
        <span className={progress >= 40 && progress < 80 ? "text-center font-semibold text-cyan-100" : "text-center"}>Under review</span>
        <span className={progress >= 80 ? "text-right font-semibold text-cyan-100" : "text-right"}>Decision</span>
      </div>
    </div>
  );
}