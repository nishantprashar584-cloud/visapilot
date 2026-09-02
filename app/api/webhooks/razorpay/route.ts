import { NextResponse } from "next/server";
import { finalizeCapturedPayment } from "@/lib/payments/paymentProcessing";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Razorpay signature." }, { status: 400 });
  }

  try {
    const payload = await request.text();

    if (!verifyRazorpayWebhookSignature(payload, signature)) {
      return NextResponse.json({ error: "Razorpay webhook signature verification failed." }, { status: 400 });
    }

    const event = JSON.parse(payload) as {
      event: string;
      payload?: {
        payment?: {
          entity?: {
            id: string;
            order_id: string;
            method?: string;
          };
        };
      };
    };

    if (event.event !== "payment.captured") {
      return NextResponse.json({ received: true, ignored: event.event });
    }

    const entity = event.payload?.payment?.entity;

    if (!entity?.id || !entity.order_id) {
      return NextResponse.json({ error: "Missing Razorpay payment capture entity." }, { status: 400 });
    }

    const payment = await finalizeCapturedPayment({
      providerOrderId: entity.order_id,
      providerPaymentId: entity.id,
      providerSignature: signature,
      paymentMethod: entity.method,
      eventType: "razorpay.payment.captured",
      payload: { eventType: event.event },
    });

    return NextResponse.json({ received: true, paymentId: payment.id, status: payment.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Razorpay webhook processing failed.",
      },
      { status: 400 },
    );
  }
}