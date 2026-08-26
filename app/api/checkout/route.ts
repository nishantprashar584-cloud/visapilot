import { NextResponse } from "next/server";
import { z } from "zod";
import { publicEnv } from "@/lib/config";
import { getTierConfig, pricingTierSchema } from "@/lib/payments/tiers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

const checkoutRequestSchema = z.object({
  tier: pricingTierSchema,
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

    const { tier } = parsedRequest.data;
    const tierConfig = getTierConfig(tier);
    const successUrl = new URL("/dashboard", publicEnv.appUrl);
    successUrl.searchParams.set("checkout", "success");
    successUrl.searchParams.set("tier", tier);

    const cancelUrl = new URL("/dashboard", publicEnv.appUrl);
    cancelUrl.searchParams.set("checkout", "cancelled");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price: tierConfig.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        tier,
        requested_credits: `${tierConfig.requestedCredits}`,
      },
    });

    if (!session.url) {
      throw new Error("Stripe checkout session did not return a redirect URL.");
    }

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
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