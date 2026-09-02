export type WorkspaceTab = "bundle" | "cover-letter" | "pdf-editor" | "checklist" | "prep";

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
    <div className="hide-scrollbar flex gap-6 overflow-x-auto whitespace-nowrap border-b border-white/10 pb-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={isActive
              ? "inline-flex shrink-0 flex-col border-b-2 border-indigo-500 pb-3 text-left text-indigo-300"
              : "inline-flex shrink-0 flex-col border-b-2 border-transparent pb-3 text-left text-slate-400 transition hover:text-slate-100"}
          >
            <span className={isActive
              ? "text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-200/80"
              : "text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500"}>{tab.eyebrow}</span>
            <span className="mt-1 text-sm font-semibold">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}