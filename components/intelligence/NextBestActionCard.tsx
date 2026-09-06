import Link from "next/link";
import { ArrowRight, CircleAlert } from "lucide-react";
import type { NextBestActionDescriptor } from "@/lib/applications/uxState";

export function NextBestActionCard({
  action,
  href,
  secondaryHref,
  secondaryLabel,
}: {
  action: NextBestActionDescriptor;
  href: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-blue-300/22 bg-[linear-gradient(180deg,rgba(24,69,154,0.16),rgba(14,22,42,0.9))] p-6 shadow-[0_24px_60px_rgba(20,46,117,0.16)] sm:p-7">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-100/85">
        <CircleAlert className="h-3.5 w-3.5" />
        Next best action
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-white">{action.title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">{action.detail}</p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100/80">{action.reason}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={href} className="vp-btn vp-btn-primary px-5">
          {action.title}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className="vp-btn vp-btn-secondary px-5">
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}