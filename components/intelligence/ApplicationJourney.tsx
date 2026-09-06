import { CheckCircle2 } from "lucide-react";
import type { ApplicationJourneyStage } from "@/lib/applications/uxState";

function toneClasses(tone: ApplicationJourneyStage["tone"]) {
  switch (tone) {
    case "complete":
      return "border-emerald-300/24 bg-emerald-400/12 text-emerald-50";
    case "current":
      return "border-cyan-300/24 bg-cyan-400/12 text-cyan-50";
    case "attention":
      return "border-amber-300/24 bg-amber-400/12 text-amber-50";
    case "blocked":
      return "border-rose-300/24 bg-rose-400/12 text-rose-50";
    default:
      return "border-white/10 bg-white/5 text-slate-300";
  }
}

export function ApplicationJourney({
  stages,
  title = "Application journey",
}: {
  stages: ApplicationJourneyStage[];
  title?: string;
}) {
  return (
    <div className="glass-panel p-6 sm:p-7">
      <p className="eyebrow">{title}</p>
      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        {stages.map((stage) => (
          <div key={stage.id} className={`rounded-[1rem] border p-4 ${toneClasses(stage.tone)}`}>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-current/20 bg-black/10 text-xs font-semibold">
                {stage.tone === "complete" ? <CheckCircle2 className="h-3.5 w-3.5" /> : stage.tone === "current" ? "→" : stage.tone === "attention" ? "!" : stage.tone === "blocked" ? "×" : "○"}
              </span>
              <p className="text-sm font-semibold text-white">{stage.label}</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-current/90">{stage.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}