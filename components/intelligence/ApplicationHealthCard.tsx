import { AlertTriangle, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import type { ApplicationHealthDescriptor } from "@/lib/applications/uxState";

function HealthIcon({ label }: { label: ApplicationHealthDescriptor["state"] }) {
  if (label === "COMPLETED" || label === "READY") {
    return <CheckCircle2 className="h-5 w-5" />;
  }

  if (label === "BLOCKED") {
    return <ShieldAlert className="h-5 w-5" />;
  }

  if (label === "ACTION_REQUIRED") {
    return <AlertTriangle className="h-5 w-5" />;
  }

  return <Sparkles className="h-5 w-5" />;
}

export function ApplicationHealthCard({
  health,
  score,
  title = "Application health",
}: {
  health: ApplicationHealthDescriptor;
  score?: number | null;
  title?: string;
}) {
  return (
    <div className="glass-panel p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{title}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{health.label}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{health.detail}</p>
        </div>
        <div className={`vp-badge ${health.toneClassName}`}>
          <HealthIcon label={health.state} />
          {health.label}
        </div>
      </div>
      {typeof score === "number" ? (
        <div className="mt-5 rounded-[1rem] border border-white/12 bg-white/8 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Readiness score</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">{score}<span className="ml-1 text-lg text-slate-300">/100</span></p>
        </div>
      ) : null}
    </div>
  );
}