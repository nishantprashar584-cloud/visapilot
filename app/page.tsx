import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  FileArchive,
  FileText,
  MapPinned,
  Plane,
  Route,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { MarqueePills } from "@/components/MarqueePills";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { TintedIconBadge } from "@/components/ui/TintedIconBadge";

const heroBadgeCopy = "Zero-Retention Architecture • 256-Bit Encrypted";

const steps = [
  {
    number: "01",
    title: "Scan Passport",
    body: "Our AI document scanner reads your identity details without retaining files.",
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

export default function Home() {
  return (
    <div className="pb-16 pt-1 sm:pb-20 sm:pt-2">
      <section className="w-full px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/12 bg-[linear-gradient(145deg,rgba(20,31,53,0.96),rgba(12,19,36,0.98)_45%,rgba(30,41,82,0.92))] px-5 py-8 shadow-[0_26px_90px_rgba(4,8,24,0.34)] sm:px-8 sm:py-10 lg:px-10">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <TintedIconBadge icon={ShieldCheck} tone="emerald" label={heroBadgeCopy} />
                <span className="vp-badge vp-badge-travel">
                  <Plane className="h-3.5 w-3.5" />
                  India-first Schengen tourist preparation
                </span>
              </div>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.28em] text-cyan-100">Schengen visa preparation, simplified</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-[3.45rem] lg:leading-[1.02]">
                Prepare your visa application with confidence.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-lg">
                VisaPilot turns a complex tourist visa packet into a guided workflow with readiness checks, document tools, financial review, and a dashboard that tells you what to do next.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/readiness" className="vp-btn vp-btn-primary px-6">
                  Check My Visa Readiness - Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/apply" className="vp-btn vp-btn-secondary px-6">
                  Start Application
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="vp-chip"><BadgeCheck className="h-4 w-4 text-emerald-300" /> Passport-first identity flow</span>
                <span className="vp-chip"><Sparkles className="h-4 w-4 text-indigo-300" /> AI explanation, not guesswork</span>
                <span className="vp-chip"><Wallet className="h-4 w-4 text-sky-300" /> Deterministic funding checks</span>
              </div>

              <div className="mt-7">
                <MarqueePills />
              </div>
            </div>

            <div className="glass-panel p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Application Preview</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">A real working visa workspace</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Structured around readiness, documents, and next actions instead of generic marketing copy.</p>
                </div>
                <span className="vp-badge vp-badge-brand">Live hierarchy</span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="vp-surface-quiet p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"><FileText className="h-3.5 w-3.5 text-emerald-300" /> Identity</p>
                  <p className="mt-2 text-base font-semibold text-white">Passport extracted and ready to review</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">The workflow distinguishes extracted data from verified data and keeps identity lock visible.</p>
                </div>
                <div className="vp-surface-quiet p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"><Route className="h-3.5 w-3.5 text-cyan-300" /> Travel</p>
                  <p className="mt-2 text-base font-semibold text-white">Trip timeline and accommodation stay connected</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Dates, destination, and supporting proof stay aligned across readiness, wizard, and packet export.</p>
                </div>
                <div className="vp-surface-quiet p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"><Wallet className="h-3.5 w-3.5 text-sky-300" /> Financials</p>
                  <p className="mt-2 text-base font-semibold text-white">Funding posture is explained clearly</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Warnings stay calm and specific, with the next corrective action attached to the case.</p>
                </div>
                <div className="vp-surface-quiet p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"><MapPinned className="h-3.5 w-3.5 text-amber-300" /> Next best action</p>
                  <p className="mt-2 text-base font-semibold text-white">One dominant instruction at a time</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">The dashboard elevates the most important step while secondary tools stay nearby.</p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="vp-badge vp-badge-success">Passport reviewed</span>
                  <span className="vp-badge vp-badge-travel">Trip checked</span>
                  <span className="vp-badge vp-badge-attention">Funding needs review</span>
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">Next best action</p>
                    <p className="mt-2 text-base font-semibold text-white">Upload the latest bank statement</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">The financial review remains the only blocker before the packet looks submission-ready.</p>
                  </div>
                  <CircleAlert className="mt-1 h-5 w-5 text-amber-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-14 w-full px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="eyebrow">How It Works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-50 sm:text-4xl">
            Start with a free readiness view, then move into the five-step application flow.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">Blue marks the main action, indigo marks AI assistance, green marks verified progress, and amber marks review.</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article key={step.number} className="glass-card p-6 sm:p-7">
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
            Choose your visa plan.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-slate-200 sm:text-base">
            Compare the Self-Guided and Done-For-You options, see the full GST-inclusive price, and pick the plan that fits your trip.
          </p>
        </div>

        <div className="mt-8">
          <PricingPlans />
        </div>
      </section>
    </div>
  );
}
