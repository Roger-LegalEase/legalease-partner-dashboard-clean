import type { RenderedDocument } from "@/lib/partners/onboarding/artifact-generator";

/**
 * Renders a generated artifact as a partner document rather than a form dump:
 * a titled sheet with headed sections, prose, and labelled facts. Missing
 * canonical values appear as an explicit, named gap instead of blank space.
 */
export function ArtifactDocumentView({
  document,
  versionNumber
}: {
  document: RenderedDocument;
  versionNumber: number;
}) {
  return (
    <article className="rounded-lg border border-grayWilma-200 bg-white px-6 py-7 shadow-sm sm:px-9 sm:py-10">
      <header className="border-b border-grayWilma-200 pb-5">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-orange">
          LegalEase · Record Clearing Access Program
        </p>
        <h3 className="mt-2 text-2xl font-black leading-tight text-navy sm:text-3xl">
          {document.documentTitle}
        </h3>
        <p className="mt-2 text-base font-semibold text-navy">
          {document.organizationName}
        </p>
        {document.programName ? (
          <p className="text-sm text-grayWilma-700">{document.programName}</p>
        ) : null}
        <p className="mt-3 text-xs text-grayWilma-700">Version {versionNumber}</p>
      </header>

      <div className="mt-6 space-y-7">
        {document.sections.map((section) => (
          <section key={section.key}>
            <h4 className="text-sm font-black uppercase tracking-wide text-navy">
              {section.heading}
            </h4>
            <div className="mt-3 space-y-3">
              {section.blocks.map((block, index) => {
                if (block.kind === "paragraph") {
                  return (
                    <p
                      key={index}
                      className="text-sm leading-relaxed text-grayWilma-700"
                    >
                      {block.text}
                    </p>
                  );
                }
                if (block.kind === "definitions") {
                  return (
                    <dl key={index} className="grid gap-3 sm:grid-cols-2">
                      {block.items.map((item) => (
                        <div key={item.term}>
                          <dt className="text-[0.68rem] font-bold uppercase tracking-wide text-grayWilma-700">
                            {item.term}
                          </dt>
                          <dd className="mt-1 text-sm leading-relaxed text-navy">
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  );
                }
                if (block.kind === "bullets") {
                  return (
                    <ul key={index} className="space-y-1.5">
                      {block.items.map((item, itemIndex) => (
                        <li
                          key={itemIndex}
                          className="flex gap-2 text-sm leading-relaxed text-grayWilma-700"
                        >
                          <span aria-hidden="true" className="text-teal">
                            •
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p
                    key={index}
                    className="rounded-md border border-orange/30 bg-orange/10 px-3 py-2 text-sm text-orange"
                  >
                    <span className="font-bold">Not yet provided: {block.label}.</span>{" "}
                    Set this in {block.whereToSet}.
                  </p>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
