import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApplicantInfo, ApplicantLockRow } from "@/types";

function resolveApplicantSlotCapacity(credits: number | null | undefined): number {
  if (typeof credits !== "number" || !Number.isFinite(credits) || credits <= 1) {
    return 1;
  }

  if (credits >= 4) {
    return 4;
  }

  if (credits >= 2) {
    return 2;
  }

  return 1;
}

async function assertApplicantSlotCapacity(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const [{ count, error: countError }, { data: userRecord, error: userError }] = await Promise.all([
    supabase
      .from("applicants")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", userId),
    supabase
      .from("users")
      .select("credits")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (countError) {
    throw new Error(countError.message);
  }

  if (userError) {
    throw new Error(userError.message);
  }

  const slotCapacity = resolveApplicantSlotCapacity(userRecord?.credits);
  const lockedApplicants = count ?? 0;

  if (lockedApplicants >= slotCapacity) {
    throw new Error(
      `Your current VisaPilot plan allows up to ${slotCapacity} locked applicant ${slotCapacity === 1 ? "identity" : "identities"}. Upgrade to add another traveler.`,
    );
  }
}

function normalizeIdentityValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function buildApplicantFullName(applicant: ApplicantInfo): string {
  return normalizeIdentityValue(
    `${applicant.personal.firstName} ${applicant.personal.lastName}`,
  );
}

export function deriveApplicantId(userId: string, passportNumber: string): string {
  return createHash("sha256")
    .update(`${normalizeIdentityValue(userId)}:${normalizeIdentityValue(passportNumber)}`)
    .digest("hex")
    .slice(0, 32);
}

export async function verifyIdentityLock(
  supabase: SupabaseClient,
  applicantId: string,
  inputName: string,
  inputPassport: string,
): Promise<ApplicantLockRow | null> {
  const { data, error } = await supabase
    .from("applicants")
    .select("id, user_id, full_name, passport_number, created_at, updated_at")
    .eq("id", applicantId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const normalizedName = normalizeIdentityValue(inputName);
  const normalizedPassport = normalizeIdentityValue(inputPassport);

  if (
    data.full_name !== normalizedName ||
    data.passport_number !== normalizedPassport
  ) {
    throw new Error(
      "Applicant identity is locked. Name and passport number cannot be changed after initial package generation.",
    );
  }

  return data as ApplicantLockRow;
}

export async function lockApplicantIdentityFromFields(
  supabase: SupabaseClient,
  userId: string,
  fullNameInput: string,
  passportInput: string,
): Promise<string> {
  const fullName = normalizeIdentityValue(fullNameInput);
  const passportNumber = normalizeIdentityValue(passportInput);
  const applicantId = deriveApplicantId(userId, passportNumber);
  const existingLock = await verifyIdentityLock(
    supabase,
    applicantId,
    fullName,
    passportNumber,
  );

  if (existingLock) {
    return applicantId;
  }

  await assertApplicantSlotCapacity(supabase, userId);

  const { error } = await supabase.from("applicants").insert({
    id: applicantId,
    user_id: userId,
    full_name: fullName,
    passport_number: passportNumber,
  });

  if (error) {
    throw new Error(error.message);
  }

  return applicantId;
}

export async function lockApplicantIdentity(
  supabase: SupabaseClient,
  userId: string,
  applicant: ApplicantInfo,
): Promise<string> {
  return lockApplicantIdentityFromFields(
    supabase,
    userId,
    buildApplicantFullName(applicant),
    applicant.passport.number,
  );
}