import { PricingPlans } from "@/components/pricing/PricingPlans";

export default function PricingPage() {
  return (
    <section className="w-full space-y-8 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-4 text-center">
        <p className="eyebrow">Pricing</p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-50 sm:text-4xl">
          Choose your visa plan.
        </h1>
        <p className="mx-auto max-w-3xl text-sm leading-6 text-slate-200 sm:text-base">
          Compare the Self-Guided and Done-For-You options, see the full GST-inclusive price, and pick the plan that fits your trip.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <span className="vp-badge vp-badge-brand">Self-Guided: you submit</span>
          <span className="vp-badge vp-badge-ai">Done-For-You: managed filing workflow</span>
        </div>
      </div>

      <PricingPlans />
    </section>
  );
}