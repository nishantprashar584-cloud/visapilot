import type { CaseChangeItem } from "@/lib/applications/uxState";

export function CaseChangePanel({
  changes,
  title = "Your application changed",
}: {
  changes: CaseChangeItem[];
  title?: string;
}) {
  if (changes.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel p-6 sm:p-7">
      <p className="eyebrow">{title}</p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Changing important case details can affect other parts of the application. Review the impacted areas before finalizing the packet.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {changes.map((change) => (
          <div key={change.id} className={change.impact === "recalculated" ? "rounded-[1rem] border border-emerald-300/24 bg-emerald-400/12 p-4" : "rounded-[1rem] border border-amber-300/24 bg-amber-400/12 p-4"}>
            <p className="text-sm font-semibold text-white">{change.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{change.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}