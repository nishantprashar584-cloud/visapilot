export function ProcessingTimeline({ progress }: { progress: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        <span>Embassy processing tracker</span>
        <span>{progress}% of 15-day window</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-cyan via-brand-blue to-brand-violet transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>Received</span>
        <span>Under review</span>
        <span>Decision</span>
      </div>
    </div>
  );
}