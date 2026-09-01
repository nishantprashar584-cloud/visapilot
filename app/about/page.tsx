import { StaticContentPage } from "@/components/content/StaticContentPage";

const sections = [
  {
    title: "What VisaPilot Is",
    body: [
      "VisaPilot is an automated Schengen tourist packet engine designed for applicants who want a faster way to prepare a clean VFS-style submission set without chasing scattered checklists or generic agent templates.",
      "The product focuses on short-stay leisure travel. It helps structure the application form data, cover letter, checklist, financial audit, itinerary logic, and bundled outputs around one tourist case record.",
    ],
  },
  {
    title: "How It Works",
    body: [
      "Applicants move through identity capture, travel details, finances, accommodation and home ties, then final document packaging. The system keeps those fields aligned so the packet tells one consistent tourism story.",
      "When an embassy PDF is a flat template with no interactive fields, VisaPilot now produces a clean worksheet instead of a misaligned fake overlay, while the master bundle remains the primary print artifact.",
    ],
  },
  {
    title: "Current Scope",
    body: [
      "Phase 1 is intentionally narrow. VisaPilot is optimized for short-stay Schengen tourism and leisure travel, with India-focused operational assumptions under the hood and geography-neutral public positioning.",
      "The platform does not currently optimize for business, study, medical, or long-stay categories, and it does not promise appointment booking or consular outcomes.",
    ],
  },
] as const;

export default function AboutPage() {
  return (
    <StaticContentPage
      eyebrow="About"
      title="Built for cleaner tourist visa packets"
      intro="VisaPilot reduces packet chaos by turning one applicant record into a more coherent Schengen tourism submission set."
      sections={sections}
    />
  );
}
