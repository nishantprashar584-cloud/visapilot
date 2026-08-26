export function PrivacyCountdownBadge({ daysRemaining }: { daysRemaining: number }) {
  const toneClass =
    daysRemaining <= 15
      ? "border-rose-400/25 bg-rose-400/12 text-rose-100"
      : daysRemaining <= 45
        ? "border-amber-400/25 bg-amber-400/12 text-amber-100"
        : "border-emerald-400/25 bg-emerald-400/12 text-emerald-100";

  return (
    <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClass}`}>
      {daysRemaining} day privacy countdown
    </div>
  );
}