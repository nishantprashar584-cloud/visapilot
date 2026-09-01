import { StaticContentPage } from "@/components/content/StaticContentPage";

const sections = [
  {
    title: "Service Scope",
    body: [
      "VisaPilot provides software tooling for short-stay Schengen tourism packet preparation. It does not provide immigration representation, guarantee visa issuance, or replace embassy, VFS, TLScontact, or BLS instructions.",
    ],
  },
  {
    title: "Applicant Responsibilities",
    body: [
      "Applicants remain responsible for the truth, completeness, and legality of all submitted information, uploaded records, and downloaded materials. They must review all generated outputs before printing or submitting them.",
      "If a destination uses a flat official PDF with no interactive fields, applicants must transfer worksheet values into the required blank form where necessary and follow the official consular instructions for their jurisdiction.",
    ],
  },
  {
    title: "No Outcome Guarantee",
    body: [
      "VisaPilot can improve structure, consistency, and packet readiness, but it cannot guarantee approval, appointment availability, or processing timelines. Final adjudication always remains with the competent consular authority.",
    ],
  },
  {
    title: "Product Changes",
    body: [
      "The feature set, pricing, supported travel categories, and artifact behavior may change over time. The current public scope is short-stay tourism and leisure travel only.",
    ],
  },
] as const;

export default function TermsOfServicePage() {
  return (
    <StaticContentPage
      eyebrow="Terms"
      title="Terms of service"
      intro="These terms describe the boundaries of the product, what applicants are responsible for, and what the software does not promise."
      sections={sections}
    />
  );
}
