import Link from "next/link";
import {
  Check,
  FileArchive,
  FileText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
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
    price: "₹1,999",
    href: "/apply?tier=solo",
    summary: "For one traveler preparing one complete Schengen tourist packet.",
    features: [
      "1 application credit",
      "Tourist visa OCR, audit, and cover-letter generation",
      "Official consulate-ready packet export",
      "Includes 18% GST invoice",
    ],
    featured: false,
  },
  {
    name: "Couple",
    price: "₹3,299",
    href: "/apply?tier=couple",
    summary: "For two adults on the same tourist trip with shared itinerary coordination.",
    features: [
      "2 application credits",
      "Cross-referenced co-traveler narratives",
      "Joint sponsorship and shared itinerary flow",
      "Includes 18% GST invoice",
    ],
    featured: true,
  },
  {
    name: "Family",
    price: "₹5,599",
    href: "/apply?tier=family",
    summary: "For up to four family members traveling together on one tourist plan.",
    features: [
      "Up to 4 application credits",
      "Minor annexures and parental NOC generation",
      "Shared family itinerary and packet bundle",
      "Includes 18% GST invoice",
    ],
    featured: false,
  },
] as const;

export default function Home() {
  return (
    <div className="pb-16 pt-1 sm:pb-20 sm:pt-2">
      <section className="mb-4">
        <MarqueePills />
      </section>

      <section className="w-full px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/14 bg-[linear-gradient(145deg,rgba(24,34,58,0.96),rgba(17,24,39,0.9)_45%,rgba(30,41,82,0.92))] px-5 py-9 shadow-[0_26px_90px_rgba(4,8,24,0.34)] sm:px-8 sm:py-12 lg:px-10">
          <div className="mx-auto max-w-5xl text-center">
            <div className="flex justify-center">
              <TintedIconBadge icon={ShieldCheck} tone="emerald" label={heroBadgeCopy} />
            </div>
            <div className="mt-5 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/16 px-4 py-1.5 text-sm font-medium text-emerald-50 shadow-[0_0_30px_rgba(16,185,129,0.18)]">
                <TrendingUp className="h-4 w-4 text-emerald-200" />
                98% of applications got accepted using VisaPilot
              </span>
            </div>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
              The Automated Schengen Tourist Visa Engine
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:text-lg">
              Generate a 96% VFS-compliant tourist visa packet with form prep, financial audits, and multi-city itinerary sync in minutes.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/apply"
                className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
              >
                Start Application
              </Link>
              <Link
                href="#pricing"
                className="inline-flex items-center justify-center rounded-full border border-white/18 bg-white/10 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/35 hover:bg-white/14"
              >
                View Pricing
              </Link>
            </div>

            <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
                <TintedIconBadge icon={FileText} tone="red" label="Official PDF actions" />
                <p className="mt-3 text-sm leading-6 text-slate-200">Form preparation stays aligned to your tourist itinerary, identity record, and appointment packet.</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
                <TintedIconBadge icon={Sparkles} tone="indigo" label="AI letter engine" />
                <p className="mt-3 text-sm leading-6 text-slate-200">Cover letters and financial checks stay aligned to leisure travel, route logic, and return ties.</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
                <TintedIconBadge icon={Wallet} tone="emerald" label="Security and purge" />
                <p className="mt-3 text-sm leading-6 text-slate-200">Identity locking and the 90-day purge window stay visible without crowding the flow.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-14 w-full px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="eyebrow">How It Works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-50 sm:text-4xl">
            Three clean phases around a five-step application flow.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article key={step.number} className="rounded-[1.6rem] border border-white/14 bg-[linear-gradient(180deg,rgba(27,39,67,0.9),rgba(14,22,42,0.94))] p-6 shadow-[0_20px_50px_rgba(6,10,24,0.26)] sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <TintedIconBadge icon={Icon} tone={step.tone} />
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Step {step.number}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-200">{step.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="pricing" className="mt-16 w-full px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="eyebrow">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-50 sm:text-4xl">
            Pick the pass that matches the trip structure.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pricingTiers.map((tier) => (
            <article
              key={tier.name}
              className={tier.featured
                ? "rounded-[1.7rem] border border-indigo-300/30 bg-[linear-gradient(180deg,#eef2ff,#ffffff)] px-6 py-7 text-slate-950 shadow-[0_24px_60px_rgba(99,102,241,0.18)] sm:px-7"
                : "rounded-[1.7rem] border border-white/14 bg-[linear-gradient(180deg,rgba(26,38,66,0.92),rgba(14,22,42,0.96))] px-6 py-7 text-white shadow-[0_20px_50px_rgba(6,10,24,0.26)] sm:px-7"}
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

              <p className={tier.featured ? "mt-4 text-sm leading-7 text-slate-700" : "mt-4 text-sm leading-7 text-slate-200"}>
                {tier.summary}
              </p>

              <ul className={tier.featured ? "mt-6 space-y-3 text-sm text-slate-800" : "mt-6 space-y-3 text-sm text-slate-100"}>
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
                  ? "mt-8 inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500"
                  : "mt-8 inline-flex w-full items-center justify-center rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/20 transition hover:bg-cyan-200"}
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
