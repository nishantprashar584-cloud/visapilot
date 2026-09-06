import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateInclusiveGstBreakdown } from "@/lib/payments/gst";
import { getTierConfig, pricingTierSchema, serviceTrackSchema } from "@/lib/payments/tiers";
import { buildRazorpayCheckoutOptions, createRazorpayOrder } from "@/lib/payments/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const checkoutRequestSchema = z.object({
  tier: pricingTierSchema,
  track: serviceTrackSchema.default("APPLY_MYSELF"),
  applicationId: z.string().uuid().optional(),
  applicantName: z.string().trim().min(1).max(160).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in is required to start checkout." }, { status: 401 });
    }

    const requestBody = await request.json();
    const parsedRequest = checkoutRequestSchema.safeParse(requestBody);

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          error: "Invalid checkout payload.",
          issues: parsedRequest.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { tier, track, applicationId, applicantName } = parsedRequest.data;
    const tierConfig = getTierConfig(tier, track);
    const successUrl = new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
    successUrl.searchParams.set("checkout", "success");
    successUrl.searchParams.set("tier", tier);
    successUrl.searchParams.set("track", track);
    const receiptNumber = `vp-${tier}-${Date.now()}`;
    const order = await createRazorpayOrder({
      amountPaise: tierConfig.gstInclusiveAmountInr * 100,
      receipt: receiptNumber,
      notes: {
        userId: user.id,
        tier,
        track,
        applicationId: applicationId ?? "",
      },
    });

    const tax = calculateInclusiveGstBreakdown(tierConfig.gstInclusiveAmountInr);
    const admin = createSupabaseAdminClient();
    const { error: insertError } = await admin.from("payments").insert({
      user_id: user.id,
      application_id: applicationId ?? null,
      provider: "razorpay",
      status: "created",
      pricing_tier: tier,
      requested_credits: tierConfig.requestedCredits,
      gross_amount_inr: tierConfig.gstInclusiveAmountInr,
      taxable_amount_inr: tax.taxableAmountInr,
      gst_amount_inr: tax.gstAmountInr,
      currency: "INR",
      provider_order_id: order.id,
      receipt_number: receiptNumber,
      customer_name: applicantName ?? null,
      customer_email: user.email ?? null,
      notes: {
        tierLabel: tierConfig.label,
        track,
        requestedCredits: tierConfig.requestedCredits,
      },
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({
      orderId: order.id,
      checkoutOptions: buildRazorpayCheckoutOptions({
        orderId: order.id,
        amountPaise: tierConfig.gstInclusiveAmountInr * 100,
        tier,
        track,
        checkoutLabel: tierConfig.checkoutLabel,
        customerName: applicantName ?? null,
        customerEmail: user.email ?? null,
      }),
      successRedirectUrl: successUrl.toString(),
      tier: tierConfig.label,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create checkout session.",
      },
      { status: 500 },
    );
  }
}