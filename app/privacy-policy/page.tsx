import { StaticContentPage } from "@/components/content/StaticContentPage";

const sections = [
  {
    title: "What We Collect",
    body: [
      "VisaPilot processes identity details, passport metadata, travel plans, employment context, financial summaries, accommodation notes, and uploaded supporting documents that the applicant provides while building a packet.",
      "The product may also process voice intake transcripts, generated cover-letter content, and dashboard metadata such as timestamps, application status, and tracking references.",
    ],
  },
  {
    title: "Why We Collect It",
    body: [
      "The data is used to assemble a coherent Schengen tourist packet, compute rule-based financial checks, generate formal letter drafts, and keep exported artifacts aligned with the stored application record.",
      "The system is also designed to show a visible privacy countdown so stored application data is not treated like an open-ended archive.",
    ],
  },
  {
    title: "Retention and Deletion",
    body: [
      "VisaPilot operates with a 90-day privacy window for application records unless a shorter operational deletion path is applied. That window is surfaced in the dashboard so applicants can see the remaining retention period.",
      "Preview data shown in demo mode is synthetic sample data and is not tied to a live user account.",
    ],
  },
  {
    title: "Security Posture",
    body: [
      "Uploaded documents and generated artifacts are handled as application materials, not as public content. The product is designed around identity locking, scoped access, and secure packet retrieval tied to the owning account.",
    ],
  },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <StaticContentPage
      eyebrow="Privacy"
      title="Privacy policy for tourist packet generation"
      intro="This policy explains how VisaPilot handles the applicant data needed to assemble, store, and export Schengen tourism packet artifacts."
      sections={sections}
    />
  );
}
