"use client";

import { useState } from "react";
import { LoaderCircle, Lock, ShieldCheck, Wallet } from "lucide-react";
import { getDefaultServiceTrack, getPricingMatrixForTrack, serviceTrackLabel } from "@/lib/payments/tiers";
import type { PricingTier, ServiceTrack } from "@/types";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

async function loadRazorpayCheckoutScript() {
  if (typeof window === "undefined") {
    throw new Error("Razorpay checkout is only available in the browser.");
  }

  if (window.Razorpay) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
    document.head.appendChild(script);
  });
}

export function PaymentCheckoutCard() {
  const [activeTrack, setActiveTrack] = useState<ServiceTrack>(getDefaultServiceTrack());
  const [activeTier, setActiveTier] = useState<PricingTier | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const visiblePricing = getPricingMatrixForTrack(activeTrack);

  async function handleCheckout(tier: PricingTier) {
    setActiveTier(tier);
    setMessage(null);

    try {
      await loadRazorpayCheckoutScript();
      const checkoutResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tier, track: activeTrack }),
      });
      const checkoutPayload = (await checkoutResponse.json()) as {
        checkoutOptions?: Record<string, unknown>;
        successRedirectUrl?: string;
        error?: string;
      };

      if (!checkoutResponse.ok || !checkoutPayload.checkoutOptions || !checkoutPayload.successRedirectUrl) {
        throw new Error(checkoutPayload.error ?? "Unable to create a Razorpay order.");
      }

      const RazorpayCheckout = window.Razorpay;

      if (!RazorpayCheckout) {
        throw new Error("Razorpay Checkout did not load correctly.");
      }

      const razorpay = new RazorpayCheckout({
        ...checkoutPayload.checkoutOptions,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyResponse = await fetch("/api/payments/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });

          const verifyPayload = (await verifyResponse.json()) as { error?: string; pending?: boolean };

          if (!verifyResponse.ok) {
            throw new Error(verifyPayload.error ?? "Unable to verify the Razorpay payment.");
          }

          if (verifyPayload.pending) {
            setMessage("Payment is authorized. Credits and GST invoice will appear as soon as Razorpay capture completes.");
            return;
          }

          window.location.href = checkoutPayload.successRedirectUrl ?? "/dashboard?checkout=success";
        },
        modal: {
          ondismiss: () => {
            setMessage("Checkout was closed before payment capture.");
          },
        },
      });

      razorpay.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start Razorpay checkout.");
    } finally {
      setActiveTier(null);
    }
  }

  return (
    <div className="glass-panel p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Plans</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Buy your visa plan with UPI or local cards</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Razorpay checkout prioritizes UPI intent, Indian card routing, and instant GST invoice generation after capture.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
          <Wallet className="h-3.5 w-3.5" />
          GST invoice included
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3 rounded-[1rem] border border-white/12 bg-white/6 px-4 py-3 text-sm text-slate-200">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
            <span>Built around current Schengen tourist form structure and provider checklist guidance.</span>
          </div>
        </div>
        <div className="md:col-span-3 grid gap-2 sm:grid-cols-2 rounded-[1.15rem] border border-white/12 bg-white/6 p-2">
          {(["APPLY_MYSELF", "VIP_CONCIERGE"] as const).map((track) => (
            <button
              key={track}
              type="button"
              onClick={() => setActiveTrack(track)}
              className={activeTrack === track
                ? "rounded-[0.95rem] border border-cyan-300/40 bg-cyan-300/16 px-4 py-3 text-sm font-semibold text-cyan-50"
                : "rounded-[0.95rem] border border-white/14 bg-white/6 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"}
            >
              {serviceTrackLabel[track]}
            </button>
          ))}
        </div>
        {(Object.entries(visiblePricing) as Array<[PricingTier, (typeof visiblePricing)[PricingTier]]>).map(([tier, config]) => (
          <div key={tier} className="rounded-[1.2rem] border border-white/14 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">{config.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">₹{config.gstInclusiveAmountInr.toLocaleString("en-IN")}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{config.description}</p>
            {activeTrack === "VIP_CONCIERGE" ? (
              <p className="mt-2 text-sm leading-6 text-emerald-200">Nothing is submitted to the embassy until you approve the final review.</p>
            ) : null}
            <button
              type="button"
              onClick={() => void handleCheckout(tier)}
              disabled={activeTier !== null}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeTier === tier ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              {activeTier === tier ? "Opening checkout..." : `Buy ${config.label}`}
            </button>
            <p className="mt-3 flex items-start gap-2 text-xs text-slate-300">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Secure 256-bit encryption. 18% GST included. Zero hidden VisaPilot processing fees.</span>
            </p>
          </div>
        ))}
      </div>

      {message ? (
        <div className="mt-5 rounded-[1rem] border border-white/14 bg-white/10 px-4 py-3 text-sm text-slate-100">
          {message}
        </div>
      ) : null}
    </div>
  );
}