import type { LucideIcon } from "lucide-react";

type BadgeTone = "red" | "blue" | "indigo" | "emerald" | "amber" | "slate";

const badgeToneClasses: Record<BadgeTone, string> = {
  red: "bg-rose-400/16 text-rose-100 ring-1 ring-rose-300/25 shadow-[0_0_24px_rgba(244,63,94,0.18)]",
  blue: "bg-sky-400/16 text-sky-100 ring-1 ring-sky-300/25 shadow-[0_0_24px_rgba(56,189,248,0.18)]",
  indigo: "bg-indigo-400/18 text-indigo-50 ring-1 ring-indigo-300/30 shadow-[0_0_28px_rgba(99,102,241,0.24)]",
  emerald: "bg-emerald-400/18 text-emerald-50 ring-1 ring-emerald-300/28 shadow-[0_0_28px_rgba(16,185,129,0.22)]",
  amber: "bg-amber-400/18 text-amber-50 ring-1 ring-amber-300/28 shadow-[0_0_28px_rgba(245,158,11,0.22)]",
  slate: "bg-slate-300/14 text-slate-50 ring-1 ring-slate-200/20 shadow-[0_0_24px_rgba(148,163,184,0.16)]",
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
    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-3 py-2 shadow-[0_12px_32px_rgba(8,15,35,0.2)] backdrop-blur-md">
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${badgeToneClasses[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      {label ? <span className="text-sm font-medium text-slate-100">{label}</span> : null}
    </span>
  );
}