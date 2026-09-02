import { buildStrictDocumentSequence } from "@/lib/applications/consularPolicy";
import type { ApplicantInfo, RefusalReasonCode } from "@/types";

export function buildDocumentSequence(
  applicant: ApplicantInfo,
  refusalReasonCode: RefusalReasonCode | null,
): string[] {
  return buildStrictDocumentSequence(applicant, refusalReasonCode);
}