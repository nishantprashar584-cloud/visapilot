import { NextResponse } from "next/server";
import { z } from "zod";
import { finalizeCapturedPayment } from "@/lib/payments/paymentProcessing";
import { fetchRazorpayPayment, verifyRazorpayCheckoutSignature } from "@/lib/payments/razorpay";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const verifyPaymentSchema = z.object({
  orderId: z.string().trim().min(1),
  paymentId: z.string().trim().min(1),
  signature: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in is required to verify payment." }, { status: 401 });
    }

    const requestBody = await request.json();
    const parsedRequest = verifyPaymentSchema.safeParse(requestBody);

    if (!parsedRequest.success) {
      return NextResponse.json({ error: "Invalid payment verification payload." }, { status: 400 });
    }

    const { orderId, paymentId, signature } = parsedRequest.data;

    if (!verifyRazorpayCheckoutSignature({ orderId, paymentId, signature })) {
      return NextResponse.json({ error: "Razorpay checkout signature verification failed." }, { status: 400 });
    }

    const payment = await fetchRazorpayPayment(paymentId);

    if (payment.status !== "captured") {
      return NextResponse.json({ status: payment.status, pending: true });
    }

    const finalizedPayment = await finalizeCapturedPayment({
      providerOrderId: payment.order_id,
      providerPaymentId: payment.id,
      providerSignature: signature,
      paymentMethod: payment.method,
      eventType: "razorpay.checkout.verified",
      payload: {
        orderId,
        paymentId,
        verifiedBy: user.id,
      },
    });

    return NextResponse.json({
      status: finalizedPayment.status,
      invoiceStoragePath: finalizedPayment.invoice_storage_path,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to verify Razorpay payment.",
      },
      { status: 500 },
    );
  }
}