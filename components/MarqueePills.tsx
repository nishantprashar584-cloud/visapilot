const countryLabels = [
  "🇫🇷 France",
  "🇪🇸 Spain",
  "🇩🇪 Germany",
  "🇮🇹 Italy",
  "🇳🇱 Netherlands",
  "🇨🇭 Switzerland",
  "🇦🇹 Austria",
  "🇵🇹 Portugal",
] as const;

export function MarqueePills() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-[1.35rem] border border-white/10 bg-black/70 px-4 py-3 shadow-panel">
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-3 whitespace-nowrap text-sm font-medium text-slate-200">
            {countryLabels.map((label, index) => (
              <span key={label} className="flex items-center gap-3">
                <span>{label}</span>
                {index < countryLabels.length - 1 ? <span className="text-slate-500">•</span> : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}