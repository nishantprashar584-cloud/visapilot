import { supportingDocumentsBucket } from "@/lib/documents/supportingDocuments";
import { generateGstInvoicePdf } from "@/lib/payments/gstInvoice";
import { getRazorpayConfig } from "@/lib/payments/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PaymentRow } from "@/types";

function buildInvoiceNumber(payment: PaymentRow, generatedAt: Date) {
  const compactDate = generatedAt.toISOString().slice(0, 10).replace(/-/g, "");
  return `VP-${compactDate}-${payment.id.slice(0, 8).toUpperCase()}`;
}

export async function finalizeCapturedPayment(args: {
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature: string;
  eventType: string;
  payload: Record<string, unknown>;
  paymentMethod?: string;
}): Promise<PaymentRow> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("provider_order_id", args.providerOrderId)
    .single();

  if (error || !data) {
    throw new Error("Payment record not found for the supplied Razorpay order.");
  }

  const payment = data as PaymentRow;

  if (payment.status === "captured" && payment.invoice_storage_path) {
    return payment;
  }

  const generatedAt = new Date();
  const config = getRazorpayConfig();
  const invoiceNumber = payment.invoice_number ?? buildInvoiceNumber(payment, generatedAt);
  const invoiceBytes = await generateGstInvoicePdf({
    payment: {
      ...payment,
      invoice_number: invoiceNumber,
    },
    companyName: config.companyName,
    companyEmail: config.companyEmail,
    companyGstin: config.companyGstin,
    companyAddress: config.companyAddress,
    paymentId: args.providerPaymentId,
    paymentMethod: args.paymentMethod,
    generatedAtIso: generatedAt.toISOString(),
  });
  const invoiceStoragePath = `${payment.user_id}/system/invoices/${invoiceNumber}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(supportingDocumentsBucket)
    .upload(invoiceStoragePath, invoiceBytes, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: rpcError } = await supabase.rpc("capture_payment_and_grant_credits", {
    p_payment_id: payment.id,
    p_provider_payment_id: args.providerPaymentId,
    p_provider_signature: args.providerSignature,
    p_invoice_number: invoiceNumber,
    p_invoice_storage_path: invoiceStoragePath,
    p_event_type: args.eventType,
    p_entity_id: args.providerPaymentId,
    p_payload: {
      ...args.payload,
      invoiceNumber,
      invoiceStoragePath,
      paymentMethod: args.paymentMethod ?? null,
    },
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from("payments")
    .select("*")
    .eq("id", payment.id)
    .single();

  if (refreshError || !refreshed) {
    throw new Error(refreshError?.message ?? "Unable to refresh payment after capture.");
  }

  return refreshed as PaymentRow;
}