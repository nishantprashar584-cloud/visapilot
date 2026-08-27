import type { ApplicationStatus } from "@/types";

const statusClasses: Record<ApplicationStatus, string> = {
  draft: "border-slate-400/20 bg-slate-400/10 text-slate-200",
  paid: "border-cyan-400/25 bg-cyan-400/12 text-cyan-100",
  completed: "border-emerald-400/25 bg-emerald-400/12 text-emerald-100",
  expired: "border-amber-400/25 bg-amber-400/12 text-amber-100",
  rejected: "border-rose-400/25 bg-rose-400/12 text-rose-100",
  reapplied: "border-violet-400/25 bg-violet-400/12 text-violet-100",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses[status]}`}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-55" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
      </span>
      {status}
    </span>
  );
}