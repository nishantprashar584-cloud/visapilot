import Link from "next/link";

const posts = [
  {
    title: "Why flat embassy PDFs break auto-fill products",
    summary: "What actually goes wrong when a so-called official form has no AcroForm fields, and why worksheet generation is often more honest than a poor overlay.",
    href: "/blog#flat-pdf",
  },
  {
    title: "How to prepare a stronger Schengen tourist cover letter",
    summary: "The sections that matter in real tourist packets: route logic, financial sufficiency, accommodation proof, and return ties.",
    href: "/blog#cover-letter",
  },
  {
    title: "Building a packet that survives VFS desk scrutiny",
    summary: "A practical submission order for forms, passport copies, reservations, insurance, funds proof, and supporting records.",
    href: "/blog#packet-order",
  },
] as const;

export default function BlogPage() {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8 rounded-[1.8rem] border border-white/10 bg-black/70 p-6 shadow-panel sm:p-8 lg:p-10">
        <div className="space-y-4 border-b border-white/10 pb-6">
          <p className="eyebrow">Blog</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Notes on tourist packet quality</h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            A small editorial stream on Schengen tourism packet assembly, artifact quality, and the practical mechanics behind cleaner submissions.
          </p>
        </div>

        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.title} className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-5">
              <h2 className="text-xl font-semibold text-white">{post.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">{post.summary}</p>
              <Link href={post.href} className="mt-4 inline-flex items-center justify-center rounded-full border border-white/12 bg-[#161616] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30">
                Read overview
              </Link>
            </article>
          ))}
        </div>

        <div className="space-y-6 rounded-[1.2rem] border border-white/10 bg-[#101010] p-5 text-sm leading-7 text-slate-300 sm:text-base">
          <div id="flat-pdf">
            <h2 className="text-xl font-semibold text-white">Why flat embassy PDFs break auto-fill products</h2>
            <p className="mt-3">A PDF can look like a fillable government form and still expose zero interactive fields. When that happens, overlaying text by coordinates becomes fragile, country-specific, and often visually poor. A worksheet plus master bundle is the more reliable artifact until a true AcroForm version is available.</p>
          </div>
          <div id="cover-letter">
            <h2 className="text-xl font-semibold text-white">How to prepare a stronger Schengen tourist cover letter</h2>
            <p className="mt-3">A strong letter is not promotional. It states the travel window, destination logic, accommodation confirmation, funding posture, and concrete return ties in a formal, compact structure a visa officer can scan quickly.</p>
          </div>
          <div id="packet-order">
            <h2 className="text-xl font-semibold text-white">Building a packet that survives VFS desk scrutiny</h2>
            <p className="mt-3">Applicants usually lose quality through inconsistency, not missing decoration. Dates, hotel proofs, financial records, sponsor posture, and return-tie evidence should all agree across the form, letter, and supporting documents.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
