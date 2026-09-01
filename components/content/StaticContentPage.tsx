type ContentSection = {
  title: string;
  body: readonly string[];
};

export function StaticContentPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: readonly ContentSection[];
}) {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8 rounded-[1.8rem] border border-white/10 bg-black/70 p-6 shadow-panel sm:p-8 lg:p-10">
        <div className="space-y-4 border-b border-white/10 pb-6">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{intro}</p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[1.2rem] border border-white/10 bg-[#101010] p-5">
              <h2 className="text-xl font-semibold text-white">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-300 sm:text-base">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
