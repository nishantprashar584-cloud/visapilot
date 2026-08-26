interface StepProgressProps {
  currentStep: number;
  labels: string[];
}

export function StepProgress({ currentStep, labels }: StepProgressProps) {
  return (
    <div className="space-y-3">
      {labels.map((label, index) => {
        const isActive = index === currentStep;
        const isComplete = index < currentStep;

        return (
          <div
            key={label}
            className={`rounded-[1.75rem] border p-4 transition ${
              isActive
                ? "border-brand-cyan/40 bg-white/10 text-white shadow-glow"
                : isComplete
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                  : "border-white/10 bg-white/5 text-slate-400"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold ${
                  isActive
                    ? "bg-gradient-to-br from-brand-cyan to-brand-violet text-slate-950"
                    : isComplete
                      ? "bg-emerald-400/20 text-emerald-100"
                      : "bg-white/8 text-slate-300"
                }`}
              >
                {isComplete ? "OK" : `0${index + 1}`}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {isComplete ? "Complete" : isActive ? "Current" : "Pending"}
                </p>
                <p className="mt-1 text-sm font-semibold text-inherit">{label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}