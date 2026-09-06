import type { LucideIcon } from "lucide-react";

type BadgeTone = "red" | "blue" | "indigo" | "emerald" | "amber" | "slate";

const badgeToneClasses: Record<BadgeTone, string> = {
  red: "border border-rose-300/24 bg-rose-400/14 text-rose-50",
  blue: "border border-sky-300/24 bg-sky-400/14 text-sky-50",
  indigo: "border border-indigo-300/24 bg-indigo-400/14 text-indigo-50",
  emerald: "border border-emerald-300/24 bg-emerald-400/14 text-emerald-50",
  amber: "border border-amber-300/24 bg-amber-400/14 text-amber-50",
  slate: "border border-slate-200/14 bg-white/8 text-slate-100",
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
    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/7 px-3 py-2 shadow-[0_10px_24px_rgba(8,15,35,0.16)] backdrop-blur-md">
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${badgeToneClasses[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      {label ? <span className="text-sm font-medium text-slate-100">{label}</span> : null}
    </span>
  );
}