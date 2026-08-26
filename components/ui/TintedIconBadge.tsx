import type { LucideIcon } from "lucide-react";

type BadgeTone = "red" | "blue" | "indigo" | "emerald" | "amber" | "slate";

const badgeToneClasses: Record<BadgeTone, string> = {
  red: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

export function TintedIconBadge({
  icon: Icon,
  tone,
  label,
}: {
  icon: LucideIcon;
  tone: BadgeTone;
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3 py-2 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-white/5">
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${badgeToneClasses[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      {label ? <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</span> : null}
    </span>
  );
}