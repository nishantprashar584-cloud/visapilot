import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { calculateInclusiveGstBreakdown } from "@/lib/payments/gst";
import { getTierConfig } from "@/lib/payments/tiers";
import type { PaymentRow, ServiceTrack } from "@/types";

function readPaymentTrack(payment: PaymentRow): ServiceTrack {
  const track = payment.notes?.track;
  return track === "VIP_CONCIERGE" ? "VIP_CONCIERGE" : "APPLY_MYSELF";
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function wrapText(text: string, maxWidth: number, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, fontSize: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export async function generateGstInvoicePdf(args: {
  payment: PaymentRow;
  companyName: string;
  companyEmail: string;
  companyGstin: string;
  companyAddress: string;
  paymentId: string;
  paymentMethod?: string;
  generatedAtIso: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const tierConfig = getTierConfig(args.payment.pricing_tier, readPaymentTrack(args.payment));
  const tax = calculateInclusiveGstBreakdown(args.payment.gross_amount_inr);

  page.drawRectangle({ x: 0, y: 721, width: 595.28, height: 120, color: rgb(0.08, 0.11, 0.18) });
  page.drawText("TAX INVOICE", { x: 40, y: 785, size: 22, font: headingFont, color: rgb(0.98, 0.99, 1) });
  page.drawText(args.companyName, { x: 40, y: 754, size: 13, font: bodyFont, color: rgb(0.86, 0.92, 0.98) });
  page.drawText(`GSTIN: ${args.companyGstin}`, { x: 40, y: 736, size: 10, font: bodyFont, color: rgb(0.86, 0.92, 0.98) });

  const metadata = [
    ["Invoice Number", args.payment.invoice_number ?? "Pending"],
    ["Receipt Number", args.payment.receipt_number],
    ["Invoice Date", new Date(args.generatedAtIso).toLocaleDateString("en-IN")],
    ["Payment ID", args.paymentId],
    ["Order ID", args.payment.provider_order_id],
    ["Payment Method", args.paymentMethod ?? "Captured via Razorpay"],
  ] as const;

  let metaY = 680;
  metadata.forEach(([label, value]) => {
    page.drawText(label, { x: 40, y: metaY, size: 10, font: headingFont, color: rgb(0.22, 0.26, 0.33) });
    page.drawText(value, { x: 180, y: metaY, size: 10, font: bodyFont, color: rgb(0.12, 0.16, 0.22) });
    metaY -= 22;
  });

  page.drawText("Bill To", { x: 40, y: 528, size: 12, font: headingFont, color: rgb(0.12, 0.16, 0.22) });
  const billToLines = [
    args.payment.customer_name || args.payment.customer_email || args.payment.user_id,
    args.payment.customer_email || args.payment.user_id,
    args.payment.destination_country ? `Destination packet: ${args.payment.destination_country}` : "Tourist visa packet purchase",
  ];
  billToLines.forEach((line, index) => {
    page.drawText(line, { x: 40, y: 506 - index * 18, size: 10, font: bodyFont, color: rgb(0.22, 0.26, 0.33) });
  });

  page.drawText("Seller", { x: 330, y: 528, size: 12, font: headingFont, color: rgb(0.12, 0.16, 0.22) });
  wrapText(args.companyAddress, 220, bodyFont, 10).slice(0, 3).forEach((line, index) => {
    page.drawText(line, { x: 330, y: 506 - index * 18, size: 10, font: bodyFont, color: rgb(0.22, 0.26, 0.33) });
  });
  page.drawText(args.companyEmail, { x: 330, y: 452, size: 10, font: bodyFont, color: rgb(0.22, 0.26, 0.33) });

  const rows = [
    ["Product", `${trackLabel(readPaymentTrack(args.payment))} ${tierConfig.label}`],
    ["Credits", String(args.payment.requested_credits)],
    ["Taxable value", formatInr(tax.taxableAmountInr)],
    ["CGST 9%", formatInr(tax.cgstAmountInr)],
    ["SGST 9%", formatInr(tax.sgstAmountInr)],
    ["Total paid", formatInr(args.payment.gross_amount_inr)],
  ] as const;

  let rowY = 390;
  rows.forEach(([label, value], index) => {
    const fill = index === rows.length - 1 ? rgb(0.92, 0.96, 1) : rgb(0.98, 0.99, 1);
    page.drawRectangle({ x: 40, y: rowY - 8, width: 515, height: 32, color: fill, borderColor: rgb(0.87, 0.9, 0.95), borderWidth: 1 });
    page.drawText(label, { x: 56, y: rowY + 3, size: 10, font: headingFont, color: rgb(0.12, 0.16, 0.22) });
    page.drawText(value, { x: 420, y: rowY + 3, size: 10, font: bodyFont, color: rgb(0.12, 0.16, 0.22) });
    rowY -= 36;
  });

  page.drawText("This invoice is generated automatically after Razorpay payment capture for your VisaPilot visa plan.", {
    x: 40,
    y: 126,
    size: 10,
    font: bodyFont,
    color: rgb(0.33, 0.39, 0.46),
  });

  return Uint8Array.from(await pdf.save());
}

function trackLabel(track: ServiceTrack) {
  return track === "VIP_CONCIERGE" ? "Done-For-You" : "Self-Guided";
}