import "server-only";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { PDFDocument, PDFName } from "pdf-lib";
import specification from "@/../data/record-clearing/packet-specifications/drafts/CA-prop64-juvenile-review.v1.json";
import guideDraft from "@/../data/record-clearing/supplemental-guides/drafts/CA-prop64-juvenile-review.v1.json";
import { caProp64JuvenileDocumentPreparation } from "@/lib/expungement-ai/ca-prop64-juvenile-document-preparation";
import type { ProtectedPacketVerificationRecord } from "@/lib/expungement-ai/verification-cas";
import { renderSupplementalGuidePdf, type GuideLocale, type GuideVariant } from "@/lib/rcap/supplemental/guide-renderer";
import type { SupplementalGuide } from "@/lib/rcap/supplemental/guide-contract";

const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
type ReadBytes = (file: string) => Uint8Array;
type Mapping = NonNullable<ReturnType<typeof caProp64JuvenileDocumentPreparation>>;
type Preparation = { mapping: Mapping; recordSha256: string; sourceInputs: Record<string, string>; reviewOnly: true };
const preparations = new WeakMap<Preparation, string>();
const rendererPath = "scripts/build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs";
export const CA_JUVENILE_REVIEW_SOURCE_PATHS = [
  rendererPath, "scripts/rcap-official-forms/rcap-official-form-finalize.mjs",
  "scripts/census-v1-ca-1203-4-set/census-official-fields.py",
  "scripts/census-v1-ca-1203-4-set/compare-official-vs-rescued.py",
  "src/lib/expungement-ai/ca-prop64-juvenile-document-preparation.ts",
  "src/lib/expungement-ai/ca-prop64-juvenile-document-questions.ts",
  "data/record-clearing/packet-specifications/drafts/CA-prop64-juvenile-review.v1.json",
  "data/record-clearing/supplemental-guides/drafts/CA-prop64-juvenile-review.v1.json",
  "src/lib/rcap/render/ca-prop64-juvenile-review-assembly.ts",
  "src/lib/rcap/supplemental/guide-renderer.ts"
] as const;

/** Review integrity only. This caller consumes an existing protected snapshot;
 * it neither authorizes its retrieval nor makes prospective answers owner-saved. */
export function prepareCaProp64JuvenileReviewAssembly(record: ProtectedPacketVerificationRecord,
  officialSources: Readonly<Record<string, Uint8Array>>, readBytes: ReadBytes): Preparation {
  const mapping = caProp64JuvenileDocumentPreparation(record, officialSources);
  assert(mapping?.status === "mapped_for_review", "Juvenile source facts remain unresolved");
  assert.equal(mapping.originalResultCode, "needs_review");
  assert.equal(mapping.generationAllowed, false); assert.equal(mapping.paymentAllowed, false);
  const prepared: Preparation = { mapping: structuredClone(mapping), recordSha256: hash(JSON.stringify(record)),
    sourceInputs: Object.fromEntries(CA_JUVENILE_REVIEW_SOURCE_PATHS.map(file => [file, hash(readBytes(file))])), reviewOnly: true };
  preparations.set(prepared, hash(JSON.stringify(prepared)));
  return prepared;
}

type Source = { documentId: string; sourcePath: string; sourceSha256: string; derivedSha256: string;
  sourceUnchanged: boolean; sourceGeometryUnchanged: boolean; sourceFieldsUnchanged: boolean; sourceXfaUnchanged: boolean };
type Artifact = { documentId: string; instance: number; file: string; sha256: string; pages: number;
  written: Array<{ field: string; value: string | boolean; sourceFactId: string }>;
  reservedFields: string[]; selectedControls: string[]; sourceFieldCount: number;
  textObserved: boolean; reservedFieldsPreserved: boolean; selectionInkObserved: boolean; sourceInkOutsideWritesPreserved: boolean; sourceViewerChromeRemoved: boolean;
  finalizerOptions: { detachNestedControlFields: boolean; suppressSynthesizedAppearances: boolean } };
type ComponentReport = { reviewOnly: boolean; generationAllowed: boolean; runtimeSelectable: boolean;
  protectedGenerationEstablished: boolean; recordSha256: string; mappingSha256: string;
  sourceInputs: Record<string, string>; sources: Source[]; artifacts: Artifact[] };
type Options = { variant: GuideVariant; locale: GuideLocale; reportPath: string; reportSha256: string; readBytes: ReadBytes };

export async function validateCaProp64JuvenileReviewComponents(inputPrepared: Preparation, inputOptions: Options) {
  assert.equal(preparations.get(inputPrepared), hash(JSON.stringify(inputPrepared)), "Juvenile preparation changed or was not validated");
  const prepared = structuredClone(inputPrepared), options = { ...inputOptions };
  assert(["full", "court_only"].includes(options.variant), "Explicit juvenile assembly variant required");
  assert(["en", "es"].includes(options.locale), "Explicit juvenile assembly locale required");
  for (const [file, sha] of Object.entries(prepared.sourceInputs)) assert.equal(hash(options.readBytes(file)), sha, "Juvenile source changed: " + file);
  const raw = options.readBytes(options.reportPath); assert.equal(hash(raw), options.reportSha256);
  const report = JSON.parse(Buffer.from(raw).toString("utf8")) as ComponentReport;
  assert.equal(report.reviewOnly, true); assert.equal(report.generationAllowed, false); assert.equal(report.runtimeSelectable, false);
  assert.equal(report.protectedGenerationEstablished, false); assert.equal(report.recordSha256, prepared.recordSha256);
  assert.equal(report.mappingSha256, hash(JSON.stringify(prepared.mapping)));
  assert(isDeepStrictEqual(report.sourceInputs, prepared.sourceInputs), "Juvenile source report input mismatch");
  assert.deepEqual(report.sources.map(s => s.documentId).sort(), specification.documents.map(s => s.documentId).sort());
  for (const source of report.sources) {
    const spec = specification.documents.find(s => s.documentId === source.documentId)!;
    assert.equal(source.sourceSha256, spec.sourceSha256); assert.equal(hash(options.readBytes(source.sourcePath)), spec.sourceSha256);
    assert(source.sourceUnchanged && source.sourceGeometryUnchanged && source.sourceFieldsUnchanged && source.sourceXfaUnchanged,
      "Exact juvenile source transport fidelity required");
  }
  const expected = [{ documentId: "JV-744", instance: 0 },
    ...Array.from({ length: prepared.mapping.attachmentCount }, (_, instance) => ({ documentId: "JV-744A", instance })),
    { documentId: "JV-746", instance: 0 }];
  assert.deepEqual(report.artifacts.map(({ documentId, instance }) => ({ documentId, instance })), expected,
    "Exact juvenile components required; no adult form or prosecutor response substitution");
  const documents = [];
  for (const artifact of report.artifacts) {
    const spec = specification.documents.find(s => s.documentId === artifact.documentId)!;
    const writes = prepared.mapping.sourceWrites.filter(w => w.documentId === artifact.documentId && w.instance === artifact.instance)
      .map(({ field, value, sourceFactId }) => ({ field, value, sourceFactId }));
    assert(isDeepStrictEqual(artifact.written, writes), "Juvenile component does not match exact prospective protected facts");
    const written = new Set(writes.map(w => w.field));
    assert.deepEqual(artifact.reservedFields, spec.fields.filter(f => !written.has(f.field)).map(f => f.field));
    assert.equal(artifact.sourceFieldCount, spec.fields.length);
    assert.deepEqual([...artifact.selectedControls].sort(), writes.filter(w => w.value === true).map(w => w.field).sort());
    assert(artifact.textObserved && artifact.reservedFieldsPreserved && artifact.selectionInkObserved && artifact.sourceInkOutsideWritesPreserved && artifact.sourceViewerChromeRemoved);
    assert.deepEqual(artifact.finalizerOptions, { detachNestedControlFields: true, suppressSynthesizedAppearances: true });
    const bytes = Uint8Array.from(options.readBytes(artifact.file)); assert.equal(hash(bytes), artifact.sha256);
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    assert.equal(pdf.getPageCount(), spec.pages); assert.equal(artifact.pages, spec.pages);
    assert(!pdf.catalog.has(PDFName.of("OpenAction")));
    assert(!pdf.catalog.get(PDFName.of("AcroForm")) && !pdf.catalog.get(PDFName.of("NeedsRendering")));
    assert(pdf.getPages().every(page => (page.node.Annots()?.size() ?? 0) === 0));
    documents.push({ documentId: artifact.documentId, instance: artifact.instance, bytes, sha256: artifact.sha256 });
  }
  return documents;
}

export async function renderCaProp64JuvenileReviewAssembly(inputPrepared: Preparation, inputOptions: Options) {
  assert.equal(preparations.get(inputPrepared), hash(JSON.stringify(inputPrepared)), "Juvenile preparation changed or was not validated");
  const prepared = structuredClone(inputPrepared), options = { ...inputOptions };
  const documents = await validateCaProp64JuvenileReviewComponents(inputPrepared, options), packet = await PDFDocument.create();
  const coverage: Array<{ documentId: string; instance: number; fromPage: number; throughPage: number; filedWithCourt: boolean; sha256: string }> = [];
  async function append(documentId: string, instance: number, bytes: Uint8Array, filedWithCourt: boolean) {
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false }), fromPage = packet.getPageCount() + 1;
    for (const page of await packet.copyPages(pdf, pdf.getPageIndices())) packet.addPage(page);
    coverage.push({ documentId, instance, fromPage, throughPage: packet.getPageCount(), filedWithCourt, sha256: hash(bytes) });
  }
  if (options.variant === "full") {
    const m = prepared.mapping, guide = { ...guideDraft, routeKey: `CA:${m.pathwayId}` } as SupplementalGuide;
    const date = new Date(m.capturedAt); assert(Number.isFinite(date.getTime()));
    const guideBytes = await renderSupplementalGuidePdf(guide, { locale: options.locale, variant: "full", verifiedAt: m.capturedAt,
      keepFilingChecklistItemsTogether: true, keepStopConditionsTogether: true,
      matter: { preparedFor: m.facts["participant.full_legal_name"], preparedOn: date.toLocaleDateString(options.locale === "es" ? "es-US" : "en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }),
        jurisdiction: "CA", courtOrAgency: `Superior Court of California, County of ${m.facts["matter.county"]}`,
        caseOrMatter: m.facts["matter.case_number"], remedy: options.locale === "es" ? "Solicitud de reducción de delito de marihuana de menores" : "Request to reduce juvenile marijuana offense" },
      documents: documents.map(d => ({ documentId: d.documentId, title: d.documentId === "JV-744" ? "Request to Reduce Juvenile Marijuana Offense" : d.documentId === "JV-744A" ? "Attachment to Request" : "Order (court completes findings)" })),
      stops: [], stopsEs: {} });
    await append("participant-guide", 0, guideBytes, false);
  }
  for (const d of documents) await append(d.documentId, d.instance, d.bytes, true);
  const timestamp = new Date(prepared.mapping.capturedAt); packet.setCreationDate(timestamp); packet.setModificationDate(timestamp);
  packet.setTitle("California juvenile Proposition 64 review packet"); packet.setProducer("LegalEase source-bound held review");
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false }));
  return { bytes, sha256: hash(bytes), pages: packet.getPageCount(), coverage, locale: options.locale, variant: options.variant,
    reviewOnly: true, generationAllowed: false, runtimeSelectable: false, protectedGenerationEstablished: false, authorizedDeliveryEstablished: false,
    translationProvenance: guideDraft.translationProvenance };
}
