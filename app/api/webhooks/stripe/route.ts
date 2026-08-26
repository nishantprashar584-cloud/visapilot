import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/config";
import { getTierConfig, pricingTierSchema } from "@/lib/payments/tiers";
import { stripe } from "@/lib/stripe";
import type { PricingTier } from "@/types";

function extractMetadata(session: Stripe.Checkout.Session): {
  userId: string;
  tier: PricingTier;
  requestedCredits: number;
} {
  const metadata = session.metadata ?? {};
  const userId = metadata.userId;
  const parsedTier = pricingTierSchema.safeParse(metadata.tier);
  const requestedCredits = Number(metadata.requested_credits ?? 0);

  if (!userId || !parsedTier.success || !Number.isInteger(requestedCredits) || requestedCredits <= 0) {
    throw new Error("Stripe session metadata is incomplete or invalid.");
  }

  const tier = parsedTier.data;

  if (requestedCredits !== getTierConfig(tier).requestedCredits) {
    throw new Error("Stripe session metadata credits do not match the configured pricing tier.");
  }

  return {
    userId,
    tier,
    requestedCredits,
  };
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  try {
    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      getServerEnv().stripeWebhookSecret,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, tier, requestedCredits } = extractMetadata(session);

      const { data: rpcResult, error: rpcError } = await stripeFulfillment(userId, requestedCredits, session.id, tier);

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      return NextResponse.json({ received: true, result: rpcResult });
    }

    return NextResponse.json({ received: true, ignored: event.type });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Stripe webhook processing failed.",
      },
      { status: 400 },
    );
  }
}

async function stripeFulfillment(
  userId: string,
  requestedCredits: number,
  stripeSessionId: string,
  tier: PricingTier,
) {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createSupabaseAdminClient();

  return supabase.rpc("grant_application_credits", {
    p_user_id: userId,
    p_credit_delta: requestedCredits,
    p_event_type: "stripe.checkout.session.completed",
    p_entity_id: stripeSessionId,
    p_payload: {
      tier,
      stripeSessionId,
      requestedCredits,
    },
  });
}