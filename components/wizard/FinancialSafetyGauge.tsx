import { resolveSchengenCountryRule } from "@/config/schengen-rules";

function formatCurrency(value: number): string {
  return `EUR ${value.toFixed(2)}`;
}

export function FinancialSafetyGauge({
  destinationCountry,
  stayDurationDays,
  availableLiquidFundsEur,
}: {
  destinationCountry: string;
  stayDurationDays: number;
  availableLiquidFundsEur: number;
}) {
  if (!destinationCountry.trim() || stayDurationDays <= 0) {
    return (
      <div className="rounded-[1rem] border border-white/10 bg-[#101010] px-4 py-4 text-sm text-slate-300">
        Enter the destination and travel dates to calculate the statutory funds target and live safety margin.
      </div>
    );
  }

  const rule = resolveSchengenCountryRule(destinationCountry);
  const requiredMinimumEur = Math.max(rule.dailyFundsEur * stayDurationDays, rule.minimumBalanceEur ?? 0);
  const marginPercent = requiredMinimumEur > 0 ? (availableLiquidFundsEur / requiredMinimumEur) * 100 : 0;
  const normalizedPercent = Math.max(0, Math.min(marginPercent, 200));
  const barWidth = `${Math.min(normalizedPercent / 2, 100)}%`;
  const tier = marginPercent < 100 ? "red" : marginPercent < 150 ? "amber" : "green";
  const tierConfig =
    tier === "green"
      ? {
          badge: "[Strong Financial Health]",
          badgeClass: "border-emerald-300/30 bg-emerald-400/12 text-emerald-100",
          barClass: "from-emerald-400 via-lime-300 to-emerald-200",
          summary: `Your ${formatCurrency(availableLiquidFundsEur)} balance provides a ${Math.round(marginPercent)}% safety margin above ${rule.displayName}'s required minimum. Excellent return-intent profile.`,
        }
      : tier === "amber"
        ? {
            badge: "[Barely Compliant]",
            badgeClass: "border-amber-300/30 bg-amber-400/12 text-amber-100",
            barClass: "from-amber-400 via-yellow-300 to-amber-200",
            summary: `You meet the bare minimum of ${formatCurrency(requiredMinimumEur)}, but consulates prefer a 50%+ buffer for unexpected travel costs.`,
          }
        : {
            badge: "[Insufficient Funds - Automatic Refusal Risk]",
            badgeClass: "border-rose-300/30 bg-rose-400/12 text-rose-100",
            barClass: "from-rose-500 via-red-400 to-orange-300",
            summary: `Your funds are below ${rule.displayName}'s legal statutory minimum of ${formatCurrency(requiredMinimumEur)}. Add a sponsor or additional liquid accounts.`,
          };

  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-4 sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Financial safety gauge</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {rule.displayName} baseline: {formatCurrency(rule.dailyFundsEur)} per day for {stayDurationDays} day{stayDurationDays === 1 ? "" : "s"}.
            {rule.minimumBalanceEur ? ` Country floor applies at ${formatCurrency(rule.minimumBalanceEur)}.` : ""}
          </p>
        </div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tierConfig.badgeClass}`}>
          {tierConfig.badge}
        </span>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/50">
        <div className={`h-full rounded-full bg-gradient-to-r ${tierConfig.barClass} transition-all duration-500`} style={{ width: barWidth }} />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-3">
        <div className="rounded-[1rem] border border-white/10 bg-black/30 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Required minimum</p>
          <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(requiredMinimumEur)}</p>
        </div>
        <div className="rounded-[1rem] border border-white/10 bg-black/30 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Available funds</p>
          <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(availableLiquidFundsEur)}</p>
        </div>
        <div className="rounded-[1rem] border border-white/10 bg-black/30 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Safety margin</p>
          <p className="mt-2 text-lg font-semibold text-white">{Math.round(marginPercent)}%</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">{tierConfig.summary}</p>
    </div>
  );
}