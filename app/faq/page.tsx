import { StaticContentPage } from "@/components/content/StaticContentPage";

const sections = [
  {
    title: "Does VisaPilot support all Schengen visa categories?",
    body: [
      "No. VisaPilot is currently optimized for short-stay tourism and leisure travel only. The workflow, prompts, packet summaries, and generated outputs are all pinned to that scope.",
    ],
  },
  {
    title: "Why does the form download say worksheet for some destinations?",
    body: [
      "Some embassy PDFs are flat templates without interactive AcroForm fields. In those cases, VisaPilot generates a clean application worksheet PDF instead of a visually broken overlay, and points applicants to the master VFS bundle plus official blank-form guidance.",
    ],
  },
  {
    title: "What is included in the master bundle?",
    body: [
      "The master bundle includes the normalized application artifact, cover letter, checklist, insurance slip, interview brief, refusal decoder, and saved supporting documents so the printed packet stays consistent across outputs.",
    ],
  },
  {
    title: "Does VisaPilot review my documents manually?",
    body: [
      "No human handoff is part of the current product model. The product uses rule-based checks, OCR inputs, document sequencing, and AI-assisted narrative generation without a manual review lane in phase 1.",
    ],
  },
  {
    title: "How long is my data kept?",
    body: [
      "VisaPilot is designed around a 90-day privacy window for application records. The dashboard keeps that countdown visible so applicants can see when stored data will age out.",
    ],
  },
] as const;

export default function FaqPage() {
  return (
    <StaticContentPage
      eyebrow="FAQ"
      title="Questions applicants ask before generating a packet"
      intro="These answers explain the current product scope, artifact behavior, and privacy model without marketing filler."
      sections={sections}
    />
  );
}
