import Link from "next/link";
import { Metadata } from "next";
import { PROPAGATION_SECTIONS, propagationSlug } from "@/src/lib/propagation";

export const metadata: Metadata = {
  title: "Propagation techniques",
  description:
    "Step-by-step guidance for the propagation methods referenced throughout the Gardenit plant library, rewritten from horticultural best practice.",
};

export default function PropagationGuidePage() {
  return (
    <div className="space-y-8" id="top">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">Propagation reference</h1>
        <p className="max-w-3xl text-slate-600">
          These concise guides explain the propagation techniques you&apos;ll see across the Gardenit plant database. They distil the
          cultural notes provided by Perenual into practical, field-tested steps so you can decide which method suits your
          plants and conditions.
        </p>
        <nav className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Jump to a method</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PROPAGATION_SECTIONS.map((section) => (
              <li key={section.title}>
                <Link href={`#${propagationSlug(section.title)}`} className="text-primary hover:underline">
                  {section.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {PROPAGATION_SECTIONS.map((section) => (
        <article
          key={section.title}
          id={propagationSlug(section.title)}
          className="scroll-mt-24 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-800">{section.title}</h2>
            <p className="text-slate-600">{section.summary}</p>
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-600">Best suited to:</span> {section.bestFor}
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Steps</h3>
            <ol className="list-decimal space-y-2 pl-5 text-slate-700">
              {section.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
          {section.aftercare ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Aftercare</h3>
              <ul className="list-disc space-y-1 pl-5 text-slate-700">
                {section.aftercare.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {section.tips ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tips</h3>
              <ul className="list-disc space-y-1 pl-5 text-slate-700">
                {section.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Link href="#top" className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline">
              Back to top
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
