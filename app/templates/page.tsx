export default function TemplatesPage() {
  return (
    <section className="w-full space-y-8 px-4 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand.blue">
          Template Workflow
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-brand.navy sm:text-5xl">
          Official PDF inspection and fill infrastructure is wired in.
        </h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-600">
          The repository now contains a reusable inspection script, an external field-mapping config for France, and risk rules for the main Schengen destinations requested in this phase.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-panel">
          <h2 className="text-xl font-semibold text-brand.navy">Inspection flow</h2>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            <li>1. Add the official PDFs to public/templates/schengen_france.pdf, public/templates/schengen_spain.pdf, and public/templates/schengen_germany.pdf.</li>
            <li>2. Run npm run inspect:pdf to extract exact field names and field types.</li>
            <li>3. Align the country map in config/pdf-maps where vendor-specific field names differ.</li>
            <li>4. Pass the resulting config into the fill utility to produce a flattened final PDF.</li>
          </ol>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-brand.slate p-6 shadow-panel">
          <h2 className="text-xl font-semibold text-brand.navy">Current country rules</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            <p>France: EUR 65/day baseline, accommodation proof, return travel, EUR 30,000 insurance.</p>
            <p>Spain: EUR 113/day baseline, accommodation proof, return travel, EUR 30,000 insurance.</p>
            <p>Germany: EUR 45/day baseline, itinerary proof, return travel, EUR 30,000 insurance.</p>
          </div>
        </div>
      </div>
    </section>
  );
}