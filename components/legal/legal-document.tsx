// Renders a structured legal document with consistent styling.
import type { LegalDocument } from "@/lib/legal-content";

export default function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <article className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{doc.intro}</p>
      <div className="mt-8 space-y-8">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold">{section.heading}</h2>
            <div className="mt-2 space-y-3">
              {section.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300"
                >
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}