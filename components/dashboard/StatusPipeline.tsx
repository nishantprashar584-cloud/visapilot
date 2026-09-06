import { getVaultPipelineStepIndex, vaultPipelineSteps } from "@/lib/applications/workflow";
import type { ApplicationStatus } from "@/types";

export function StatusPipeline({ status }: { status: ApplicationStatus }) {
  const activeIndex = getVaultPipelineStepIndex(status);
  const progressSummary = [
    "Your profile is on track. Step 1 of 4: we are checking your documents and financial details.",
    "Your profile is on track. Step 2 of 4: finish the official form and keep every answer consistent.",
    "Your profile is on track. Step 3 of 4: your appointment details are being lined up.",
    "Your profile is on track. Step 4 of 4: your case is ready for the VFS handoff.",
  ][activeIndex] ?? "Your profile is on track.";

  return (
    <div className="glass-panel p-5 sm:p-6">
      <div className="mb-5">
        <p className="eyebrow">Visa progress</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Track what happens next</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{progressSummary}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {vaultPipelineSteps.map((step, index) => {
          const active = index <= activeIndex;

          return (
            <div
              key={step.id}
              className={active
                ? "rounded-[1.1rem] border border-emerald-300/25 bg-emerald-400/10 p-4"
                : "rounded-[1.1rem] border border-white/10 bg-white/5 p-4"}
            >
              <p className={active ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100" : "text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400"}>
                Step {index + 1}
              </p>
              <h2 className="mt-2 text-base font-semibold text-white">{step.label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{step.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}