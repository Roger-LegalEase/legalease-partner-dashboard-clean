import "server-only";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { PDFDocument, PDFName } from "pdf-lib";
import specification from "@/../data/record-clearing/packet-specifications/drafts/CA-prop64-adult-review.v1.json";
import guideDraft from "@/../data/record-clearing/supplemental-guides/drafts/CA-prop64-adult-review.v1.json";
import { caProp64ProtectedDocumentPreparation } from "@/lib/expungement-ai/ca-prop64-document-preparation";
import { protectedPacketInformationModelFor } from "@/lib/expungement-ai/packet-information";
import type { ProtectedPacketVerificationRecord } from "@/lib/expungement-ai/verification-cas";
import { renderSupplementalGuidePdf, type GuideLocale, type GuideVariant } from "@/lib/rcap/supplemental/guide-renderer";
import type { SupplementalGuide } from "@/lib/rcap/supplemental/guide-contract";

const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
type ReadBytes = (file: string) => Uint8Array;
type Branch = typeof specification.branches[number];
type SourcePreparation = NonNullable<ReturnType<typeof caProp64ProtectedDocumentPreparation>>;
export type CaProp64ReviewPreparation = {
  schemaVersion: "ca-prop64/review-preparation/v1";
  routeKey: string; branch: Branch; facts: Record<string, string>;
  recordSection: string; revision: number; capturedAt: string; recordSha256: string;
  sourceInputs: Record<string, string>; sourcePreparation: SourcePreparation;
  generationAllowed: false; runtimeSelectable: false; filingReady: false; reviewOnly: true;
};
// An arbitrary supplied plan cannot stand in for the existing protected model.
// This is process-local review integrity, never authorization or an owner read.
const preparations = new WeakMap<CaProp64ReviewPreparation, string>();

/** The caller must already have an authorized record. The existing protected
 * model validates snapshot hashes, source identity and historical compatibility.
 * No canonical, verification, entitlement or delivery record is created here. */
export function prepareCaProp64ReviewAssembly(record: ProtectedPacketVerificationRecord, readBytes: ReadBytes): CaProp64ReviewPreparation {
  const model = protectedPacketInformationModelFor(record);
  assert(model && model.resultCode && ["packet_ready", "packet_ready_with_caution"].includes(model.resultCode), "CA review requires current qualifying protected facts");
  const preparation = caProp64ProtectedDocumentPreparation(record);
  assert(preparation, "Exact adult CA review preparation unavailable; juvenile or other procedures require their own source forms");
  assert.equal(preparation.missingCaptionFactIds.length, 0, "CA caption facts remain incomplete");
  assert.equal(preparation.missingContactFactIds.length, 0, "CA applicable contact facts remain incomplete");
  assert(preparation.recordSection, "CA record section remains unresolved");
  const branch = specification.branches.find(entry => entry.variantId === preparation.variantId && entry.pathwayId === preparation.pathwayId);
  assert(branch, "CA protected branch mismatch");
  for (const [file, expected] of Object.entries(specification.sourceInputs)) assert.equal(hash(readBytes(file)), expected, `CA review source changed: ${file}`);
  const prepared: CaProp64ReviewPreparation = {
    schemaVersion: "ca-prop64/review-preparation/v1", routeKey: `CA:${branch.pathwayId}`, branch: structuredClone(branch),
    facts: structuredClone(preparation.facts), recordSection: preparation.recordSection, revision: preparation.revision,
    capturedAt: preparation.capturedAt, recordSha256: hash(JSON.stringify(record)), sourceInputs: { ...specification.sourceInputs },
    sourcePreparation: structuredClone(preparation), generationAllowed: false, runtimeSelectable: false, filingReady: false, reviewOnly: true
  };
  preparations.set(prepared, hash(JSON.stringify(prepared)));
  return prepared;
}

type Artifact = {
  formNumber: string; outputFile: string; sha256: string; byteLength: number; pageCount: number;
  formState: { acroFormPresent: boolean; xfaPresent: boolean };
  finalizerWritten: Array<{ field: string; factId: string }>;
  finalizerRefused: unknown[];
  selectionReport: { selections: Array<{ control: string }>; selectionsRefused: unknown[] } | null;
};
type ComponentReport = {
  generationAllowed: boolean; runtimeSelectable: boolean; commercialRoutesOpened: number;
  reviewStatus: string; variantId: string; recordSection: string; inputFacts: Record<string, string>;
  knownFactsNotWritten: unknown[]; unresolved: Array<{ factId: string }>;
  sourceCodeSha256: Record<string, string>;
  sourceFidelity: Array<{ formNumber: string; sourcePath: string; sourceSha256Before: string; sourceSha256After: string; sourceUnchanged: boolean }>;
  artifacts: Artifact[];
};

/** Consume the actual source-finalizer evidence, preserving official component
 * bytes. A review report is not a source/output approval or a worker admission.
 * The exact protected facts must match the ones printed by that finalizer. */
export type CaProp64ReviewAssemblyOptions = {
  variant: GuideVariant; locale: GuideLocale;
  componentReportPath: string; componentReportSha256: string; readBytes: ReadBytes;
};
export async function validateCaProp64ReviewComponents(inputPrepared: CaProp64ReviewPreparation, inputOptions: CaProp64ReviewAssemblyOptions) {
  assert.equal(preparations.get(inputPrepared), hash(JSON.stringify(inputPrepared)), "CA review preparation was not validated or was changed");
  const prepared = structuredClone(inputPrepared), options = { ...inputOptions };
  assert(["full", "court_only"].includes(options.variant), "Explicit CA assembly variant required");
  assert(["en", "es"].includes(options.locale), "Explicit CA delivery locale required");
  const raw = options.readBytes(options.componentReportPath);
  assert.equal(hash(raw), options.componentReportSha256, "CA component report changed");
  const report = JSON.parse(Buffer.from(raw).toString("utf8")) as ComponentReport;
  assert.equal(report.generationAllowed, false); assert.equal(report.runtimeSelectable, false); assert.equal(report.commercialRoutesOpened, 0);
  assert.equal(report.reviewStatus, "CANDIDATE_REQUIRES_INDEPENDENT_SOURCE_VISUAL_AND_QUALIFIED_REVIEW");
  assert.equal(report.variantId, prepared.branch.variantId); assert.equal(report.recordSection, prepared.recordSection);
  assert(isDeepStrictEqual(report.inputFacts, prepared.facts), "CA component facts do not match current protected facts");
  assert.equal(report.knownFactsNotWritten.length, 0, "Known CA facts were not printed");
  assert(report.unresolved.every(entry => prepared.sourcePreparation.unresolvedOptionalContactFactIds.includes(entry.factId)), "Required CA source field remains unresolved");
  for (const [file, expected] of Object.entries(prepared.sourceInputs)) assert.equal(hash(options.readBytes(file)), expected, `CA source changed after preparation: ${file}`);
  const rendererPaths = ["scripts/build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs", "scripts/lib/ca-prop64-caption-bindings.mjs"];
  assert.deepEqual(Object.keys(report.sourceCodeSha256).sort(), rendererPaths.sort());
  for (const [file, expected] of Object.entries(report.sourceCodeSha256)) assert.equal(expected, prepared.sourceInputs[file]);
  assert.deepEqual(report.artifacts.map(a => a.formNumber), specification.documents.map(d => d.documentId));
  assert.deepEqual(report.sourceFidelity.map(s => s.formNumber).sort(), specification.documents.map(d => d.documentId).sort());
  const role = prepared.facts["filer.representation"];
  assert(role === "self_represented" || role === "attorney");
  const mappings = specification.captionMappings[role] as Record<string, Record<string, string>>;
  const documents: Array<{ documentId: string; bytes: Uint8Array; sha256: string; pages: number }> = [];
  for (const contract of specification.documents) {
    const artifact = report.artifacts.find(a => a.formNumber === contract.documentId)!;
    const source = report.sourceFidelity.find(s => s.formNumber === contract.documentId)!;
    assert.equal(source.sourceUnchanged, true); assert.equal(source.sourceSha256Before, contract.sourceSha256); assert.equal(source.sourceSha256After, contract.sourceSha256);
    assert.equal(hash(options.readBytes(source.sourcePath)), contract.sourceSha256, "Official CA source bytes changed");
    const expectedWrites = Object.entries(mappings[contract.documentId]).filter(([, fact]) => prepared.facts[fact] !== undefined && (fact !== "court.mailing_address" || prepared.facts["court.mailing_address_relationship"] === "distinct"));
    assert.deepEqual(artifact.finalizerWritten.map(row => `${row.field}:${row.factId}`).sort(), expectedWrites.map(([field, fact]) => `${field}:${fact}`).sort(), "CA exact actor-owned caption writes required");
    assert.equal(artifact.finalizerWritten.length + artifact.finalizerRefused.length, { "CR-400": 38, "CR-401": 42, "CR-403": 72 }[contract.documentId], "Every original CA field must retain its disposition");
    const selected = artifact.selectionReport?.selections.map(selection => selection.control) ?? [];
    const expectedSelections = contract.documentId === "CR-400" ? [...prepared.branch.selectedControls, (specification.sectionControls as Record<string, string>)[prepared.recordSection]] : [];
    assert(expectedSelections.every(Boolean));
    assert.deepEqual([...selected].sort(), [...expectedSelections].sort(), "No inferred CA waiver, service act or court finding");
    assert.equal(artifact.selectionReport?.selectionsRefused.length ?? 0, 0);
    assert.equal(artifact.formState.acroFormPresent, false); assert.equal(artifact.formState.xfaPresent, false);
    const bytes = Uint8Array.from(options.readBytes(artifact.outputFile));
    assert.equal(hash(bytes), artifact.sha256); assert.equal(bytes.length, artifact.byteLength);
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    assert.equal(pdf.getPageCount(), contract.pages); assert.equal(artifact.pageCount, contract.pages);
    assert.equal(pdf.getForm().getFields().length, 0); assert(!pdf.catalog.has(PDFName.of("OpenAction")));
    assert(pdf.getPages().every(page => (page.node.Annots()?.size() ?? 0) === 0), "CA finalizer component retains annotations");
    documents.push({ documentId: contract.documentId, bytes, sha256: artifact.sha256, pages: contract.pages });
  }
  return { documents, report };
}

export async function renderCaProp64ReviewAssembly(inputPrepared: CaProp64ReviewPreparation, inputOptions: CaProp64ReviewAssemblyOptions) {
  assert.equal(preparations.get(inputPrepared), hash(JSON.stringify(inputPrepared)), "CA review preparation was not validated or was changed");
  const prepared = structuredClone(inputPrepared), options = { ...inputOptions };
  const { documents } = await validateCaProp64ReviewComponents(inputPrepared, options);
  const packet = await PDFDocument.create(), coverage: Array<{ documentId: string; fromPage: number; throughPage: number; filedWithCourt: boolean; sha256: string }> = [];
  async function append(documentId: string, bytes: Uint8Array, filedWithCourt: boolean) {
    const component = await PDFDocument.load(bytes, { updateMetadata: false });
    const start = packet.getPageCount() + 1;
    for (const page of await packet.copyPages(component, component.getPageIndices())) packet.addPage(page);
    coverage.push({ documentId, fromPage: start, throughPage: packet.getPageCount(), filedWithCourt, sha256: hash(bytes) });
  }
  if (options.variant === "full") {
    const guide = { ...guideDraft, routeKey: prepared.routeKey } as SupplementalGuide;
    const date = new Date(prepared.capturedAt); assert(Number.isFinite(date.getTime()));
    const guideBytes = await renderSupplementalGuidePdf(guide, {
      locale: options.locale, variant: "full", verifiedAt: prepared.capturedAt,
      keepFilingChecklistItemsTogether: true,
      matter: { preparedFor: prepared.facts["participant.full_legal_name"], preparedOn: date.toLocaleDateString(options.locale === "es" ? "es-US" : "en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }),
        jurisdiction: "CA", courtOrAgency: `Superior Court of California, County of ${prepared.facts["matter.county"]}`,
        caseOrMatter: prepared.facts["matter.case_number"], remedy: options.locale === "es" ? prepared.branch.titleEs : prepared.branch.title },
      documents: specification.documents.map(({ documentId, title }) => ({ documentId, title })),
      stops: specification.hearingAndObjectionStops, stopsEs: guide.stopConditionsEs
    });
    await append("participant-guide", guideBytes, false);
  }
  for (const document of documents) await append(document.documentId, document.bytes, true);
  const timestamp = new Date(prepared.capturedAt);
  packet.setCreationDate(timestamp); packet.setModificationDate(timestamp);
  packet.setTitle("California Proposition 64 adult review packet"); packet.setProducer("LegalEase CA source-bound review assembly");
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false }));
  return { bytes, sha256: hash(bytes), pages: packet.getPageCount(), variant: options.variant, locale: options.locale, coverage,
    sourcePreparation: prepared, componentReport: { path: options.componentReportPath, sha256: options.componentReportSha256 },
    translationProvenance: guideDraft.translationProvenance,
    reviewOnly: true as const, generationAllowed: false as const, runtimeSelectable: false as const, filingReady: false as const,
    protectedGenerationEstablished: false as const, authorizedDeliveryEstablished: false as const };
}
