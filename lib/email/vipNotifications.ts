import { publicEnv } from "@/lib/config";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

function getEmailFromAddress() {
  return process.env.BUSINESS_SUPPORT_EMAIL?.trim() || "support@visapilot.app";
}

async function sendEmail(payload: EmailPayload) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const sendGridApiKey = process.env.SENDGRID_API_KEY?.trim();

  if (!resendApiKey && !sendGridApiKey) {
    return {
      delivered: false,
      provider: "none",
      message: "No email provider configured. Notification was skipped.",
    };
  }

  if (resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `VisaPilot <${getEmailFromAddress()}>`,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend email delivery failed with status ${response.status}.`);
    }

    return {
      delivered: true,
      provider: "resend",
      message: "Email delivered via Resend.",
    };
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendGridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: payload.to }] }],
      from: { email: getEmailFromAddress(), name: "VisaPilot" },
      subject: payload.subject,
      content: [{ type: "text/html", value: payload.html }],
    }),
  });

  if (!response.ok) {
    throw new Error(`SendGrid email delivery failed with status ${response.status}.`);
  }

  return {
    delivered: true,
    provider: "sendgrid",
    message: "Email delivered via SendGrid.",
  };
}

function buildBaseTemplate(title: string, body: string) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:32px;">
        <p style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#475569;margin:0 0 12px;">VisaPilot</p>
        <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;">${title}</h1>
        <div style="font-size:15px;line-height:1.7;color:#334155;">${body}</div>
      </div>
    </div>
  `;
}

export async function sendBundleReadyEmail(args: {
  to: string;
  applicantName: string;
  applicationId: string;
}) {
  const vaultUrl = `${publicEnv.appUrl}/dashboard/${args.applicationId}/vault`;
  const submissionGuideUrl = `${publicEnv.appUrl}/dashboard/${args.applicationId}/submission-guide`;

  return sendEmail({
    to: args.to,
    subject: "Your visa packet is ready",
    html: buildBaseTemplate(
      "Your VisaPilot packet is ready",
      `<p>${args.applicantName}, your print-ready visa packet is ready for review.</p><p>Open your dashboard: <a href="${vaultUrl}">${vaultUrl}</a></p><p>Open the Smart Form Helper: <a href="${submissionGuideUrl}">${submissionGuideUrl}</a></p>`,
    ),
  });
}

export async function sendVipOtpRequestEmail(args: {
  to: string;
  applicantName: string;
  applicationId: string;
  promptMessage: string;
}) {
  const vaultUrl = `${publicEnv.appUrl}/dashboard/${args.applicationId}/vault`;

  return sendEmail({
    to: args.to,
    subject: "VisaPilot OTP required",
    html: buildBaseTemplate(
      "OTP required for your visa filing",
      `<p>${args.applicantName},</p><p>${args.promptMessage}</p><p>Submit the code in your vault: <a href="${vaultUrl}">${vaultUrl}</a></p>`,
    ),
  });
}

export async function sendFinalHandoverVipEmail(args: {
  to: string;
  applicantName: string;
  applicationId: string;
  vfsReferenceNumber?: string | null;
  appointmentDate?: string | null;
  vfsCenterLocation?: string | null;
}) {
  const vaultUrl = `${publicEnv.appUrl}/dashboard/${args.applicationId}/vault`;
  const appointmentLine = args.appointmentDate
    ? `Appointment: ${new Date(args.appointmentDate).toLocaleString("en-IN", { hour12: false })}`
    : "Appointment details will appear in your vault.";

  return sendEmail({
    to: args.to,
    subject: "VisaPilot final VIP handover",
    html: buildBaseTemplate(
      "Your VIP filing handover is ready",
      `<p>${args.applicantName}, your operator has finished the official filing workflow.</p><p>${appointmentLine}</p><p>Reference: ${args.vfsReferenceNumber ?? "Pending"}</p><p>Center: ${args.vfsCenterLocation ?? "Pending"}</p><p>Review the vault: <a href="${vaultUrl}">${vaultUrl}</a></p>`,
    ),
  });
}