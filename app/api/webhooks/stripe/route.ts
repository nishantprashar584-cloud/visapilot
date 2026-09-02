import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Stripe webhooks have been decommissioned. Configure Razorpay webhooks at /api/webhooks/razorpay instead.",
    },
    { status: 410 },
  );
}