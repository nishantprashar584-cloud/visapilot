"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AuthenticatedAccount } from "@/lib/auth/session";
import { getAuthenticatedAccount } from "@/lib/auth/session";
import { canTransitionVipApplicationStatus, requiresVipAppointmentHandover } from "@/lib/applications/workflow";
import { buildSupportingDocumentStoragePath, inferSupportingDocumentEvidence, supportingDocumentsBucket } from "@/lib/documents/supportingDocuments";
import { sendFinalHandoverVipEmail, sendVipOtpRequestEmail } from "@/lib/email/vipNotifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationRow, ApplicationStatus } from "@/types";

const statusEnumValues = [
  "draft",
  "auditing",
  "action_required",
  "bundle_ready",
  "portal_filing_in_progress",
  "otp_pending",
  "portal_submitted",
  "appointment_pending",
  "appointment_booked",
  "completed",
  "paid",
  "expired",
  "rejected",
  "reapplied",
] as const satisfies readonly ApplicationStatus[];

const otpFormSchema = z.object({
  applicationId: z.string().uuid(),
  otpCode: z.string().trim().min(4).max(10),
});

const statusFormSchema = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(statusEnumValues),
  appointmentDate: z.string().trim().optional(),
  vfsReferenceNumber: z.string().trim().max(50).optional(),
  vfsCenterLocation: z.string().trim().max(100).optional(),
});

const otpTriggerFormSchema = z.object({
  applicationId: z.string().uuid(),
  promptMessage: z.string().trim().min(12),
  expiresInMinutes: z.coerce.number().int().min(1).max(30).default(5),
});

async function requireAdminAccount(): Promise<AuthenticatedAccount> {
  const account = await getAuthenticatedAccount();

  if (!account?.isAdmin) {
    throw new Error("Admin access is required.");
  }

  return account;
}

async function insertApplicationAuditLog(
  supabase: SupabaseClient,
  args: {
    eventType: string;
    actorUserId: string;
    applicationId: string;
    payload: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("audit_logs").insert({
    event_type: args.eventType,
    actor_user_id: args.actorUserId,
    entity_type: "application",
    entity_id: args.applicationId,
    payload: args.payload,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function getOwnedApplication(applicationId: string) {
  const account = await getAuthenticatedAccount();

  if (!account) {
    throw new Error("Sign in is required.");
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("applications")
    .select("id, user_id, applicant_name, applicant_email, status, application_data, track")
    .eq("id", applicationId)
    .single();

  if (error || !data || data.user_id !== account.id) {
    throw new Error("Application not found.");
  }

  return data as Pick<ApplicationRow, "id" | "user_id" | "applicant_name" | "applicant_email" | "status" | "application_data" | "track">;
}

async function getAdminApplication(applicationId: string, account?: AuthenticatedAccount) {
  const adminAccount = account ?? await requireAdminAccount();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("applications")
    .select("id, user_id, applicant_name, applicant_email, status, track, appointment_date, vfs_reference_number, vfs_center_location")
    .eq("id", applicationId)
    .single();

  if (error || !data) {
    throw new Error("Application not found.");
  }

  void adminAccount;

  return data as Pick<ApplicationRow, "id" | "user_id" | "applicant_name" | "applicant_email" | "status" | "track" | "appointment_date" | "vfs_reference_number" | "vfs_center_location">;
}

export async function submitVipOtpCode(formData: FormData) {
  const parsed = otpFormSchema.safeParse({
    applicationId: formData.get("applicationId"),
    otpCode: formData.get("otpCode"),
  });

  if (!parsed.success) {
    return { success: false, message: "Enter a valid OTP code." };
  }

  try {
    const application = await getOwnedApplication(parsed.data.applicationId);
    const supabase = createSupabaseAdminClient();
    const { data: requestRow, error: requestError } = await supabase
      .from("vip_action_requests")
      .select("id")
      .eq("application_id", application.id)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (requestError || !requestRow) {
      throw new Error("No pending OTP request was found for this application.");
    }

    const { error: updateRequestError } = await supabase
      .from("vip_action_requests")
      .update({ status: "RESOLVED" })
      .eq("id", requestRow.id);

    if (updateRequestError) {
      throw new Error(updateRequestError.message);
    }

    const { error: statusError } = await supabase
      .from("applications")
      .update({ status: "portal_filing_in_progress", updated_at: new Date().toISOString() })
      .eq("id", application.id);

    if (statusError) {
      throw new Error(statusError.message);
    }

    await insertApplicationAuditLog(supabase, {
      eventType: "application.vip.otp_submitted",
      actorUserId: application.user_id,
      applicationId: application.id,
      payload: {
        requestId: requestRow.id,
        resumedStatus: "portal_filing_in_progress",
      },
    });

    revalidatePath(`/dashboard/${application.id}`);
    revalidatePath(`/dashboard/${application.id}/vault`);
    revalidatePath("/admin/applications");

    return { success: true, message: "OTP submitted. The filing status has resumed." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to submit OTP." };
  }
}

export async function reuploadApplicationDocument(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "BANK_STATEMENT").trim();
  const file = formData.get("file");

  if (!applicationId) {
    return { success: false, message: "Application ID is required." };
  }

  if (!(file instanceof File)) {
    return { success: false, message: "Select a replacement document to upload." };
  }

  try {
    const application = await getOwnedApplication(applicationId);
    const supabase = createSupabaseAdminClient();
    const documentId = crypto.randomUUID();
    const storagePath = buildSupportingDocumentStoragePath(application.user_id, documentId, file.name);

    const { error: uploadError } = await supabase.storage
      .from(supportingDocumentsBucket)
      .upload(storagePath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { error: documentInsertError } = await supabase
      .from("application_documents")
      .insert({
        application_id: application.id,
        document_type: documentType,
        file_path: storagePath,
      });

    if (documentInsertError) {
      throw new Error(documentInsertError.message);
    }

    const currentDocuments = application.application_data.supportingDocuments ?? [];
    const nextDocuments = [
      ...currentDocuments,
      {
        id: documentId,
        fileName: file.name,
        mimeType: file.type,
        kind: file.type === "application/pdf" ? "pdf" : "image",
        pageCount: 1,
        sizeBytes: file.size,
        storagePath,
        uploadedAt: new Date().toISOString(),
        evidence: inferSupportingDocumentEvidence(file.name),
      },
    ];

    const { error: updateApplicationError } = await supabase
      .from("applications")
      .update({
        status: application.track === "VIP_CONCIERGE" ? "auditing" : "bundle_ready",
        application_data: {
          ...application.application_data,
          supportingDocuments: nextDocuments,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (updateApplicationError) {
      throw new Error(updateApplicationError.message);
    }

    await insertApplicationAuditLog(supabase, {
      eventType: "application.supporting_document.reuploaded",
      actorUserId: application.user_id,
      applicationId: application.id,
      payload: {
        documentType,
        fileName: file.name,
        storagePath,
        nextStatus: application.track === "VIP_CONCIERGE" ? "auditing" : "bundle_ready",
      },
    });

    revalidatePath(`/dashboard/${application.id}`);
    revalidatePath(`/dashboard/${application.id}/vault`);
    revalidatePath("/admin/applications");

    return { success: true, message: "Replacement document uploaded and the case was moved back into review." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to upload the replacement document." };
  }
}

export async function updateVipApplicationStatus(formData: FormData) {
  const parsed = statusFormSchema.safeParse({
    applicationId: formData.get("applicationId"),
    status: formData.get("status"),
    appointmentDate: formData.get("appointmentDate")?.toString(),
    vfsReferenceNumber: formData.get("vfsReferenceNumber")?.toString(),
    vfsCenterLocation: formData.get("vfsCenterLocation")?.toString(),
  });

  if (!parsed.success) {
    return { success: false, message: "Choose a valid status update." };
  }

  try {
    const adminAccount = await requireAdminAccount();
    const application = await getAdminApplication(parsed.data.applicationId, adminAccount);

    if (application.track !== "VIP_CONCIERGE") {
      throw new Error("Only Done-For-You applications can be updated from this operator surface.");
    }

    if (!canTransitionVipApplicationStatus(application.status, parsed.data.status)) {
      throw new Error(`Invalid VIP status transition from ${application.status} to ${parsed.data.status}.`);
    }

    const effectiveAppointmentDate = parsed.data.appointmentDate || application.appointment_date;
    const effectiveReferenceNumber = parsed.data.vfsReferenceNumber || application.vfs_reference_number;
    const effectiveCenterLocation = parsed.data.vfsCenterLocation || application.vfs_center_location;

    if (
      requiresVipAppointmentHandover(parsed.data.status)
      && (!effectiveAppointmentDate || !effectiveReferenceNumber || !effectiveCenterLocation)
    ) {
      throw new Error("Appointment date, VFS reference, and VFS center are required before booking or completing handoff.");
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("applications")
      .update({
        status: parsed.data.status,
        appointment_date: parsed.data.appointmentDate || null,
        vfs_reference_number: parsed.data.vfsReferenceNumber || null,
        vfs_center_location: parsed.data.vfsCenterLocation || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (error) {
      throw new Error(error.message);
    }

    await insertApplicationAuditLog(supabase, {
      eventType: "application.vip.status_updated",
      actorUserId: adminAccount.id,
      applicationId: application.id,
      payload: {
        previousStatus: application.status,
        nextStatus: parsed.data.status,
        appointmentDate: parsed.data.appointmentDate || null,
        vfsReferenceNumber: parsed.data.vfsReferenceNumber || null,
        vfsCenterLocation: parsed.data.vfsCenterLocation || null,
      },
    });

    let message = "VIP application status updated.";

    if (parsed.data.status === "appointment_booked" || parsed.data.status === "completed") {
      const emailResult = await sendFinalHandoverVipEmail({
        to: application.applicant_email,
        applicantName: application.applicant_name,
        applicationId: application.id,
        vfsReferenceNumber: parsed.data.vfsReferenceNumber || application.vfs_reference_number,
        appointmentDate: parsed.data.appointmentDate || application.appointment_date,
        vfsCenterLocation: parsed.data.vfsCenterLocation || application.vfs_center_location,
      });
      message = emailResult.delivered
        ? "VIP application updated and final handover email sent."
        : `VIP application updated. ${emailResult.message}`;
    }

    revalidatePath(`/dashboard/${application.id}`);
    revalidatePath(`/dashboard/${application.id}/vault`);
    revalidatePath("/admin/applications");

    return { success: true, message };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to update application status." };
  }
}

export async function triggerVipOtpRequest(formData: FormData) {
  const parsed = otpTriggerFormSchema.safeParse({
    applicationId: formData.get("applicationId"),
    promptMessage: formData.get("promptMessage"),
    expiresInMinutes: formData.get("expiresInMinutes") ?? 5,
  });

  if (!parsed.success) {
    return { success: false, message: "Add a valid OTP prompt message." };
  }

  try {
    const adminAccount = await requireAdminAccount();
    const application = await getAdminApplication(parsed.data.applicationId, adminAccount);

    if (application.track !== "VIP_CONCIERGE") {
      throw new Error("Only Done-For-You applications can trigger OTP requests.");
    }

    const supabase = createSupabaseAdminClient();
    const expiresAt = new Date(Date.now() + parsed.data.expiresInMinutes * 60 * 1000).toISOString();
    const { error: requestInsertError } = await supabase
      .from("vip_action_requests")
      .insert({
        application_id: application.id,
        action_type: "OTP_REQUIRED",
        prompt_message: parsed.data.promptMessage,
        status: "PENDING",
        expires_at: expiresAt,
      });

    if (requestInsertError) {
      throw new Error(requestInsertError.message);
    }

    const { error: statusError } = await supabase
      .from("applications")
      .update({
        status: "otp_pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (statusError) {
      throw new Error(statusError.message);
    }

    await insertApplicationAuditLog(supabase, {
      eventType: "application.vip.otp_requested",
      actorUserId: adminAccount.id,
      applicationId: application.id,
      payload: {
        expiresAt,
        promptMessage: parsed.data.promptMessage,
      },
    });

    const emailResult = await sendVipOtpRequestEmail({
      to: application.applicant_email,
      applicantName: application.applicant_name,
      applicationId: application.id,
      promptMessage: parsed.data.promptMessage,
    });

    revalidatePath(`/dashboard/${application.id}`);
    revalidatePath(`/dashboard/${application.id}/vault`);
    revalidatePath("/admin/applications");

    return {
      success: true,
      message: emailResult.delivered
        ? "OTP request created and email dispatched."
        : `OTP request created. ${emailResult.message}`,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to trigger OTP request." };
  }
}