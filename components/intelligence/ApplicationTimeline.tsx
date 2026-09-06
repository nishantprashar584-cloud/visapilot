import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import type { TimelineEventDescriptor } from "@/lib/applications/uxState";

function EventIcon({ tone }: { tone: TimelineEventDescriptor["tone"] }) {
  if (tone === "complete") {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (tone === "attention" || tone === "blocked") {
    return <AlertTriangle className="h-4 w-4" />;
  }

  if (tone === "current") {
    return <CircleAlert className="h-4 w-4" />;
  }

  return <span className="text-xs">○</span>;
}

function toneClasses(tone: TimelineEventDescriptor["tone"]) {
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

export function ApplicationTimeline({ events }: { events: TimelineEventDescriptor[] }) {
  return (
    <div className="glass-panel p-6 sm:p-7">
      <p className="eyebrow">Application timeline</p>
      <div className="mt-5 space-y-3">
        {events.map((event, index) => (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${toneClasses(event.tone)}`}>
                <EventIcon tone={event.tone} />
              </div>
              {index < events.length - 1 ? <div className="mt-2 h-8 w-px bg-white/12" /> : null}
            </div>
            <div className="pb-4">
              <p className="text-sm font-semibold text-white">{event.label}</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{event.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}