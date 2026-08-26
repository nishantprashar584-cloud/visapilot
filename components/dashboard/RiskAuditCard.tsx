import type { RiskAuditResult } from "@/types";

const statusClasses: Record<RiskAuditResult["status"], string> = {
  GREEN: "border-emerald-400/25 bg-emerald-400/12 text-emerald-100",
  YELLOW: "border-amber-400/25 bg-amber-400/12 text-amber-100",
  RED: "border-rose-400/25 bg-rose-400/12 text-rose-100",
};

export function RiskAuditCard({ audit }: { audit: RiskAuditResult }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Pre-flight risk audit</h3>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses[audit.status]}`}>
          {audit.status}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-white/6 p-4 text-sm text-slate-200">
          Liquid balance: EUR {audit.availableLiquidBalanceEur.toFixed(2)} / required EUR {audit.requiredLiquidBalanceEur.toFixed(2)}
        </div>
        <div className="rounded-2xl bg-white/6 p-4 text-sm text-slate-200">
          Passport valid through: {audit.passportValidThrough}
        </div>
      </div>

      {audit.missingDocuments.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-white">Missing items</p>
          <ul className="space-y-2 text-sm leading-7 text-slate-300">
            {audit.missingDocuments.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold text-white">Actionable fixes</p>
        <ul className="space-y-2 text-sm leading-7 text-slate-300">
          {audit.fixInstructions.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}