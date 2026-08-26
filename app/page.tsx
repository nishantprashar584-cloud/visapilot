import Link from "next/link";
import {
  Check,
  FileArchive,
  FileText,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { MarqueePills } from "@/components/MarqueePills";
import { TintedIconBadge } from "@/components/ui/TintedIconBadge";

const heroBadgeCopy = "Zero-Retention Architecture • 256-Bit Encrypted";

const steps = [
  {
    number: "01",
    title: "Scan Passport",
    body: "Ephemeral RAM OCR extracts identity without retaining files.",
    icon: FileText,
    tone: "red",
  },
  {
    number: "02",
    title: "Audit & Generate",
    body: "Real-time bank sufficiency audit plus an AI consular cover letter.",
    icon: Sparkles,
    tone: "indigo",
  },
  {
    number: "03",
    title: "Download & Apply",
    body: "One-click download of your ready-to-submit embassy package.",
    icon: FileArchive,
    tone: "blue",
  },
] as const;

const pricingTiers = [
  {
    name: "Solo",
    price: "$19",
    href: "/apply?tier=solo",
    summary: "For one traveler preparing one complete visa packet.",
    features: [
      "1 application credit",
      "Financial audit and refusal-risk review",
      "AI cover letter and completed packet",
    ],
    featured: false,
  },
  {
    name: "Couple",
    price: "$29",
    href: "/apply?tier=couple",
    summary: "For two travelers on the same trip with separate identity records.",
    features: [
      "2 application credits",
      "Separate identity lock for each traveler",
      "Shared itinerary and dashboard flow",
    ],
    featured: true,
  },
  {
    name: "Family",
    price: "$49",
    href: "/apply?tier=family",
    summary: "For families coordinating up to four applicants in one workflow.",
    features: [
      "Up to 4 application credits",
      "Shared planning across the household",
      "Separate packet support per traveler",
    ],
    featured: false,
  },
] as const;

export default function Home() {
  return (
    <div className="pb-16 pt-4 sm:pb-20 sm:pt-6">
      <section className="mb-6">
        <MarqueePills />
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(8,10,15,0.98))] px-5 py-9 shadow-panel sm:px-8 sm:py-12 lg:px-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex justify-center">
              <TintedIconBadge icon={ShieldCheck} tone="emerald" label={heroBadgeCopy} />
            </div>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
              Schengen Visa Applications, Automated & Privacy-First
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-lg">
              Generate official auto-filled PDFs, consular cover letters, and daily financial audit checks in 5 minutes.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/apply"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Start Application
              </Link>
              <Link
                href="#pricing"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
              >
                View Pricing
              </Link>
            </div>

            <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <TintedIconBadge icon={FileText} tone="red" label="Official PDF actions" />
                <p className="mt-3 text-sm leading-6 text-slate-300">Embassy-ready forms are filled and flattened from your application data.</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <TintedIconBadge icon={Sparkles} tone="indigo" label="AI letter engine" />
                <p className="mt-3 text-sm leading-6 text-slate-300">Cover letters and financial checks stay aligned to your itinerary and home ties.</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <TintedIconBadge icon={Wallet} tone="emerald" label="Security and purge" />
                <p className="mt-3 text-sm leading-6 text-slate-300">Identity locking and the 90-day purge window stay visible without crowding the flow.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="eyebrow">How It Works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            Three clean steps from identity to embassy packet.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article key={step.number} className="rounded-[1.6rem] border border-white/10 bg-black/80 p-6 shadow-panel sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <TintedIconBadge icon={Icon} tone={step.tone} />
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Step {step.number}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{step.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="pricing" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="eyebrow">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            Pick the pass that matches the trip structure.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <article
              key={tier.name}
              className={tier.featured
                ? "rounded-[1.7rem] border border-indigo-300/20 bg-white px-6 py-7 text-slate-950 shadow-panel sm:px-7"
                : "rounded-[1.7rem] border border-white/10 bg-black/80 px-6 py-7 text-white shadow-panel sm:px-7"}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={tier.featured ? "text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-indigo-700" : "eyebrow"}>
                    {tier.name}
                  </p>
                  <p className="mt-4 text-4xl font-semibold tracking-[-0.05em]">{tier.price}</p>
                </div>
                {tier.featured ? (
                  <span className="rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    Highlighted
                  </span>
                ) : null}
              </div>

              <p className={tier.featured ? "mt-4 text-sm leading-7 text-slate-700" : "mt-4 text-sm leading-7 text-slate-300"}>
                {tier.summary}
              </p>

              <ul className={tier.featured ? "mt-6 space-y-3 text-sm text-slate-800" : "mt-6 space-y-3 text-sm text-slate-200"}>
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className={tier.featured ? "mt-0.5 h-4 w-4 text-indigo-700" : "mt-0.5 h-4 w-4 text-emerald-300"} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

                <Link
                href={tier.href}
                className={tier.featured
                  ? "mt-8 inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                  : "mt-8 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"}
              >
                Select Pass
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
