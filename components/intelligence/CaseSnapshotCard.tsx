import type { CaseSnapshotItem } from "@/lib/applications/uxState";

export function CaseSnapshotCard({
  items,
  title = "Case snapshot",
  description,
}: {
  items: CaseSnapshotItem[];
  title?: string;
  description?: string;
}) {
  return (
    <div className="glass-panel p-6 sm:p-7">
      <p className="eyebrow">{title}</p>
      {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{description}</p> : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-[1rem] border border-white/12 bg-white/8 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}