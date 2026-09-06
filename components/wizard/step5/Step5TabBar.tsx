export type WorkspaceTab = "bundle" | "cover-letter" | "pdf-editor" | "checklist" | "prep";

const tabToneClasses: Record<WorkspaceTab, { active: string; inactive: string; eyebrow: string }> = {
  bundle: { active: "border-rose-300/24 bg-rose-400/10 text-rose-50", inactive: "hover:border-rose-300/20", eyebrow: "text-rose-200/80" },
  "cover-letter": { active: "border-indigo-300/24 bg-indigo-400/10 text-indigo-50", inactive: "hover:border-indigo-300/20", eyebrow: "text-indigo-200/80" },
  "pdf-editor": { active: "border-blue-300/24 bg-blue-400/10 text-blue-50", inactive: "hover:border-blue-300/20", eyebrow: "text-blue-200/80" },
  checklist: { active: "border-emerald-300/24 bg-emerald-400/10 text-emerald-50", inactive: "hover:border-emerald-300/20", eyebrow: "text-emerald-200/80" },
  prep: { active: "border-amber-300/24 bg-amber-400/10 text-amber-50", inactive: "hover:border-amber-300/20", eyebrow: "text-amber-200/80" },
};

export function Step5TabBar({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: Array<{ id: WorkspaceTab; label: string; eyebrow: string }>;
  activeTab: WorkspaceTab;
  onSelect: (tab: WorkspaceTab) => void;
}) {
  return (
    <div className="hide-scrollbar flex gap-3 overflow-x-auto whitespace-nowrap pb-1" role="tablist" aria-label="Document Studio tools">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const tone = tabToneClasses[tab.id];

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            role="tab"
            aria-selected={isActive}
            className={isActive
              ? `inline-flex shrink-0 flex-col rounded-[1rem] border px-4 py-3 text-left shadow-[0_14px_30px_rgba(8,15,35,0.16)] ${tone.active}`
              : `inline-flex shrink-0 flex-col rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-left text-slate-400 transition hover:bg-white/8 hover:text-slate-100 ${tone.inactive}`}
          >
            <span className={isActive
              ? `text-[10px] font-semibold uppercase tracking-[0.22em] ${tone.eyebrow}`
              : "text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500"}>{tab.eyebrow}</span>
            <span className="mt-1 text-sm font-semibold">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}