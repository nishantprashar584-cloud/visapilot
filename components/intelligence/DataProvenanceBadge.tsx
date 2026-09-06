export function DataProvenanceBadge({
  labels,
}: {
  labels: string[];
}) {
  if (labels.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
      {labels.map((label) => (
        <span key={label} className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1">
          {label}
        </span>
      ))}
    </div>
  );
}