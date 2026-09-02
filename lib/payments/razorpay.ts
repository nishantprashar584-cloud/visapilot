import crypto from "node:crypto";
import type { PricingTier } from "@/types";

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  notes: Record<string, string>;
};

type RazorpayPaymentResponse = {
  id: string;
  amount: number;
  currency: string;
  email?: string;
  contact?: string;
  method?: string;
  order_id: string;
  status: string;
  notes?: Record<string, string>;
  created_at?: number;
};

function readRequiredPaymentEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required payment environment variable: ${name}`);
  }

  return value;
}

export function getRazorpayConfig() {
  return {
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || readRequiredPaymentEnv("RAZORPAY_KEY_ID"),
    keySecret: readRequiredPaymentEnv("RAZORPAY_KEY_SECRET"),
    webhookSecret: readRequiredPaymentEnv("RAZORPAY_WEBHOOK_SECRET"),
    companyName: process.env.BUSINESS_LEGAL_NAME?.trim() || "VisaPilot",
    companyEmail: process.env.BUSINESS_SUPPORT_EMAIL?.trim() || "support@visapilot.app",
    companyGstin: process.env.BUSINESS_GSTIN?.trim() || "GSTIN_PENDING_CONFIGURATION",
    companyAddress: process.env.BUSINESS_ADDRESS?.trim() || "India",
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
  };
}

function buildBasicAuthHeader(keyId: string, keySecret: string) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function razorpayFetch<T>(path: string, init: RequestInit): Promise<T> {
  const config = getRazorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: buildBasicAuthHeader(config.keyId, config.keySecret),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Razorpay API request failed (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<T>;
}

export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrderResponse> {
  return razorpayFetch<RazorpayOrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
}

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPaymentResponse> {
  return razorpayFetch<RazorpayPaymentResponse>(`/payments/${paymentId}`, {
    method: "GET",
  });
}

export function verifyRazorpayWebhookSignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", getRazorpayConfig().webhookSecret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
}

export function verifyRazorpayCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", getRazorpayConfig().keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(input.signature));
}

export function buildRazorpayCheckoutOptions(args: {
  orderId: string;
  amountPaise: number;
  tier: PricingTier;
  checkoutLabel: string;
  customerName?: string | null;
  customerEmail?: string | null;
}) {
  const config = getRazorpayConfig();

  return {
    key: config.keyId,
    amount: args.amountPaise,
    currency: "INR",
    name: config.companyName,
    description: args.checkoutLabel,
    order_id: args.orderId,
    prefill: {
      name: args.customerName ?? undefined,
      email: args.customerEmail ?? undefined,
    },
    notes: {
      pricingTier: args.tier,
    },
    theme: {
      color: "#4f46e5",
    },
    config: {
      display: {
        sequence: ["block.upi", "block.cards", "block.other"],
        blocks: {
          upi: {
            name: "Pay by UPI",
            instruments: [{ method: "upi" }],
          },
          cards: {
            name: "Cards",
            instruments: [{ method: "card" }],
          },
          other: {
            name: "Netbanking and wallets",
            instruments: [{ method: "netbanking" }, { method: "wallet" }],
          },
        },
      },
    },
  };
}