import Link from "next/link";
import { StaticContentPage } from "@/components/content/StaticContentPage";

const sections = [
  {
    title: "General Support",
    body: [
      "Email: nishantprasharms@gmail.com",
      "Response window: usually within 1 business day for product questions about packet generation, dashboard access, and preview behavior.",
    ],
  },
  {
    title: "What To Include In A Support Request",
    body: [
      "Include the destination country, the page or download that looked wrong, whether you were in preview mode or a live application, and the artifact name you downloaded. That usually makes reproduction much faster.",
      "For PDF quality issues, mention whether the file was the master bundle, the cover letter PDF, the checklist PDF, or the application worksheet PDF.",
    ],
  },
  {
    title: "Current Product Focus",
    body: [
      "Support is prioritized around short-stay Schengen tourism cases, artifact quality, preview fidelity, and document-packet consistency.",
    ],
  },
] as const;

export default function ContactPage() {
  return (
    <>
      <StaticContentPage
        eyebrow="Contact"
        title="Reach the VisaPilot team"
        intro="Use this page for product questions, artifact-quality reports, and preview issues that affect the tourist packet workflow."
        sections={sections}
      />
      <section className="w-full px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[1.2rem] border border-white/10 bg-[#101010] p-5 text-sm leading-7 text-slate-300 sm:text-base">
          <p>
            Prefer direct email? Write to
            <Link href="mailto:nishantprasharms@gmail.com" className="ml-2 font-semibold text-white transition hover:text-brand-cyan">
              nishantprasharms@gmail.com
            </Link>
            with the relevant dashboard route or downloaded file name.
          </p>
        </div>
      </section>
    </>
  );
}
