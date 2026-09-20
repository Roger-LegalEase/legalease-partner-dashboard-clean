#!/usr/bin/env node
/**
 * Five specifications whose digests moved, and the question that decides them.
 *
 * WHAT HAPPENED
 *
 * On 2026-09-20 five packet specifications changed bytes, in four reviewed
 * commits. The fulfillment registry had last been regenerated the day before,
 * so every one of those routes was still pinned to the older digest, and the
 * first regeneration after the Mississippi successor unblocked the generator
 * revoked four of them and left the fifth stale.
 *
 * A changed specification digest is a real refusal and it should fail closed.
 * But "the old pin cannot prove this route" is not the same claim as "the
 * approved document set changed and the owner must approve it again", and the
 * difference is the whole of this file.
 *
 * WHAT THOSE COMMITS ACTUALLY WERE
 *
 * The composer says it, at src/lib/rcap/grade-a/composer.ts, in the branch that
 * refuses an `approved_shipping_component` section:
 *
 *   "This kind is a DESCRIPTION of an approved component -- a heading naming
 *    what it contains plus the field ids it uses. It carries no body, no
 *    assertions and no text. [...] all 8 families carrying this kind have a
 *    census-v1 build host that composed the adopted artifact. So each is the
 *    same derivation defect Nevada had -- the specification kept the
 *    description and dropped the substance -- and the fix is per family, by
 *    transcribing the adopted text."
 *
 * So the specification never held the words; the build host did. The four
 * commits transcribed the already-adopted words back into the specification.
 * Nothing about the approved document set moved. What moved was the
 * specification catching up to it.
 *
 * WHAT THIS PROVES, FROM THE TREE, EVERY RUN
 *
 *   1. The owner-approved artifacts are byte-identical to the digests the
 *      owner approval names. Read and hashed here, never restated.
 *   2. The family's build host -- the thing that actually produced those bytes
 *      -- does not read the packet specification at all. This is the load-
 *      bearing fact: if a builder read the specification, a specification
 *      change could move the artifact and only a re-render could say.
 *   3. The PRIOR specification could not produce a participant packet at all.
 *      Both layers are attempted, because the refusal does not always land in
 *      the same one: three of these families are refused by the composer, for
 *      sections that describe rather than carry text, and Illinois composes but
 *      is refused by the renderer, which will not guess a caption treatment the
 *      specification never resolved. Either way no bytes come out, and a
 *      specification that could never produce a packet cannot have had a
 *      participant-facing output that changed.
 *   4. Every substantive sentence the CURRENT specification carries already
 *      appears in the artifact the owner approved. This reads the
 *      specification's own transcribed prose rather than the composed render,
 *      because the composed render also contains caption furniture the renderer
 *      generates -- which would be measuring the renderer, not the
 *      transcription. The only strings allowed to be absent are structural
 *      labels the specification and the build host each print their own way,
 *      and each one is checked against the specification's own declared
 *      structure rather than waved through.
 *
 * WHAT IT DOES NOT DO
 *
 * It approves nothing. It does not open a route, does not establish provider or
 * publication proof, and does not approve the composed packet as a deliverable
 * artifact -- a route that later delivers a composed packet needs those exact
 * composed bytes reviewed and approved, which is separate work. All it
 * establishes is that the specification digest may be carried forward on the
 * evidence that the approved artifacts did not move.
 *
 *   node scripts/verify-specification-derivation-reconciliation.mjs [--write]
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { composeParticipantDeliveryPacket } =
  await import("../src/lib/rcap/grade-a/participant-packet.ts");
const { renderGradeAPacketPdf } = await import("../src/lib/rcap/grade-a/renderer.ts");

const OUT = "data/rcap-grade-a/legal-decisions/SPECIFICATION_DERIVATION_RECONCILIATION_2026-09-20.json";
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const read = (rel) => fs.readFileSync(path.join(rootDir, rel));
const readText = (rel) => read(rel).toString("utf8");
const failures = [];
let checks = 0;
const ok = (label, condition, detail) => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail === undefined ? "" : ` — ${detail}`}`);
  return condition;
};

/**
 * The five families, and the digest each record held before the repair.
 *
 * Pinned rather than discovered. A directory scan or a "whatever the registry
 * says" lookup would let a future specification move reconcile itself; adding a
 * family here is an edit a reviewer sees.
 */
const FAMILIES = [
  {
    familyId: "dc_innocence_expungement-set",
    routeIds: ["DC:dc_actual_innocence_expungement_16_803"],
    specificationPath: "data/record-clearing/packet-specifications/DC-actual-innocence-expungement.v1.json",
    priorSpecificationSha256: "a66e9b44315db4cfcbbb103630e210c3a43ffd4bfac6d2a8049bbe208b38d0c8",
    overlay: "data/rcap-all50/overlays/census-v1/dc/dc-innocence-expungement-set--custom-pleading",
    providerPaths: [
      "scripts/build-census-v1-dc_innocence_expungement-set.mjs",
      "scripts/build-census-v1-dc_seal_nonconviction-set.mjs"
    ],
    // The DC host resolves a bound reference source out of the Master Library,
    // which is not mounted in every environment. Recorded so the evidence says
    // whether the re-render ran rather than implying it always does.
    builderNeedsMountedCorpus: true
  },
  {
    familyId: "il-prostitution-j-vacate-set",
    routeIds: ["IL:felony-prostitution-relief"],
    specificationPath: "data/record-clearing/packet-specifications/IL-felony-prostitution-relief.v1.json",
    // The digest the owner carry-forward of 2026-09-19 left current. This
    // reconciliation starts where that one ended; it does not reach behind it.
    priorSpecificationSha256: "50dfb8afa1ca0d434a9a9792ec5963299600ca291647d66343bacd96295028cb",
    overlay: "data/rcap-all50/overlays/census-v1/il/il-prostitution-j-vacate-set--custom-pleading",
    providerPaths: ["scripts/build-census-v1-il-prostitution-j-vacate-set.mjs"],
    builderNeedsMountedCorpus: false
  },
  {
    familyId: "ms-misd-addl-set",
    routeIds: [
      "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
      "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6"
    ],
    specificationPath: "data/record-clearing/packet-specifications/MS-additional-misdemeanor-relief.v1.json",
    priorSpecificationSha256: "e870e694b9170d5b136bb1a99c53bc56231e3161ad9ea4adf60927a984996064",
    overlay: "data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading",
    providerPaths: ["scripts/build-census-v1-ms-misd-addl-set.mjs"],
    builderNeedsMountedCorpus: false
  },
  {
    familyId: "wy_fel_1502-set",
    routeIds: ["WY:felony-conviction-expungement-w-s-7-13-1502"],
    specificationPath: "data/record-clearing/packet-specifications/WY-felony-conviction-expungement.v1.json",
    priorSpecificationSha256: "97572a2e564a1ae4c4ca857a90af2c6536fdd68ae1ac3ed7a2766827e1557d2f",
    overlay: "data/rcap-all50/overlays/census-v1/wy/wy-fel-1502-set--custom-pleading",
    providerPaths: ["scripts/build-census-v1-wy_fel_1502-set.mjs"],
    builderNeedsMountedCorpus: false
  }
];

/** The specification as Git holds it at a digest, found by walking its history. */
function specificationAt(specificationPath, sha256) {
  const log = execFileSync("git", ["log", "--format=%H", "--", specificationPath],
    { cwd: rootDir, encoding: "utf8", maxBuffer: 1 << 26 }).trim().split("\n").filter(Boolean);
  for (const commit of log) {
    try {
      const bytes = execFileSync("git", ["show", `${commit}:${specificationPath}`],
        { cwd: rootDir, encoding: null, maxBuffer: 1 << 28 });
      if (digest(bytes) === sha256) return { bytes, commit };
    } catch { /* the path did not exist at that commit */ }
  }
  return null;
}

/** The commits that moved this specification since the prior digest. */
function movedIn(specificationPath, priorCommit) {
  const log = execFileSync("git",
    ["log", "--format=%H%x1f%ad%x1f%s", "--date=short", `${priorCommit}..HEAD`, "--", specificationPath],
    { cwd: rootDir, encoding: "utf8", maxBuffer: 1 << 26 }).trim();
  if (!log) return [];
  return log.split("\n").map((line) => {
    const [commit, date, subject] = line.split("\x1f");
    return { commit: commit.slice(0, 9), date, subject };
  });
}

const normalise = (text) => text
  .replace(/\s+/g, " ")
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[–—]/g, "-")
  .toUpperCase()
  .trim();

/** Every string the composed packet would print. */
function* prose(value) {
  if (typeof value === "string") { yield value; return; }
  if (Array.isArray(value)) { for (const child of value) yield* prose(child); return; }
  if (value && typeof value === "object") { for (const child of Object.values(value)) yield* prose(child); }
}

/**
 * Sentences the current packet composes that the approved artifact does NOT
 * contain, on purpose, each with the reason it is there.
 *
 * The check above asks whether every composed assertion is already in the
 * owner-approved build-host artifact, and that is the right question: an
 * assertion that appeared from nowhere is how a specification quietly starts
 * saying something nobody approved. But the answer is not always yes, and when
 * a repair is the reason it must be written down rather than tolerated by a
 * looser rule.
 *
 * These two are Mississippi's additional-misdemeanour pair. The approved
 * artifact printed the Code section as a dotted blank and described the
 * prosecuting authority by listing BOTH branches, because the build host had no
 * route to derive either from. The exact route does, so the packet now names
 * one section and one prosecutor. The approved artifact cannot contain those
 * words; that is the defect being fixed, not evidence of drift.
 *
 * Matched on a leading fragment, not a whole sentence, because the rest of each
 * line is the route-derived value and differs between the two routes by design.
 * Neither entry widens to anything else: a sentence that does not start with
 * these words is still unexplained and still fails.
 */
const DELIBERATELY_BEYOND_THE_APPROVED_ARTIFACT = {
  "ms-misd-addl-set": [
    {
      startsWith: "and upon the showing made in open court",
      why: "The proposed order recites the section the petition is brought under. The approved artifact printed a "
        + "run of dots there because the build host could not know which of the two sections applied; the exact "
        + "route does, so the order recites it."
    },
    {
      startsWith: "Prosecuting authority for this Court -",
      why: "The certificate of service names the prosecutor who receives prior notice. The approved artifact named "
        + "both branches in one label and left the participant to pick on a page filed with the court; the exact "
        + "route decides which, so the certificate names one."
    }
  ]
};

/**
 * The specification's own structural labels: document titles, section headings,
 * attachment titles and field ids. A composed string that is not in the
 * approved artifact is tolerated only if it is one of these -- a name for a
 * thing, which the specification and the build host each print their own way --
 * and never if it is an assertion.
 */
function structuralLabels(specification) {
  const labels = new Set();
  const add = (value) => { if (typeof value === "string" && value.trim()) labels.add(normalise(value)); };
  for (const document of specification.documents ?? []) {
    add(document.title); add(document.documentTitle); add(document.heading); add(document.documentId);
    for (const section of document.sections ?? []) {
      add(section.heading); add(section.title);
      for (const field of section.fields ?? []) add(field);
      for (const label of Object.values(section.fieldLabels ?? {})) add(label);
    }
  }
  for (const attachment of specification.attachments ?? []) add(attachment.title);
  for (const entry of specification.requiredFacts ?? []) { add(entry.factId); add(entry.label); }
  for (const [, label] of Object.entries(specification.fieldLabels ?? {})) add(label);
  return labels;
}

/** Synthetic facts covering every id either specification names. */
function factsFor(specifications) {
  const facts = {};
  for (const specification of specifications) {
    for (const entry of specification.requiredFacts ?? []) facts[entry.factId] = `DERIVATION-${entry.factId}`;
    for (const document of specification.documents ?? []) {
      for (const section of document.sections ?? []) {
        for (const field of section.fields ?? []) facts[field] = `DERIVATION-${field}`;
      }
    }
  }
  return facts;
}

const families = [];

for (const family of FAMILIES) {
  const label = family.familyId;
  const currentBytes = read(family.specificationPath);
  const currentSpecificationSha256 = digest(currentBytes);
  const current = JSON.parse(currentBytes.toString("utf8"));
  const priorHeld = specificationAt(family.specificationPath, family.priorSpecificationSha256);

  ok(`${label}: the specification actually moved`,
    currentSpecificationSha256 !== family.priorSpecificationSha256,
    "prior and current digests are the same");
  if (!ok(`${label}: the prior specification is in this history at the digest the record holds`, Boolean(priorHeld))) {
    continue;
  }
  const prior = JSON.parse(priorHeld.bytes.toString("utf8"));

  // 1. The approved artifacts, read from disk and hashed here.
  const rendered = JSON.parse(readText(`${family.overlay}/reports/rendered-artifacts.json`));
  const approvedArtifacts = [];
  for (const fixture of ["canonical", "boundary"]) {
    const rel = `${family.overlay}/fixtures/${fixture}.pdf`;
    const bytes = read(rel);
    const sha256 = digest(bytes);
    const receipt = (rendered.artifacts ?? []).find((entry) => entry.fixture === fixture);
    ok(`${label}: the ${fixture} render receipt binds the artifact on disk`,
      receipt?.sha256 === sha256 && receipt.byteLength === bytes.length,
      `${receipt?.sha256?.slice(0, 12)} vs ${sha256.slice(0, 12)}`);
    approvedArtifacts.push({
      fixture, path: rel, sha256, byteLength: bytes.length,
      pageCount: receipt?.pageCount ?? null, bytesUnchanged: receipt?.sha256 === sha256
    });
  }

  // 2. The build host does not read the specification. Scanned, not asserted.
  const readsSpecification = family.providerPaths.filter((rel) =>
    readText(rel).includes("packet-specifications"));
  ok(`${label}: the build host does not read the packet specification`,
    readsSpecification.length === 0,
    readsSpecification.join(", "));

  // 3. The prior specification could not compose a participant packet.
  const facts = factsFor([prior, current]);
  const matterFor = (specification, routeId) => ({
    routeKey: routeId, generationPurpose: "internal_review", facts,
    verifiedAt: "2026-09-03T15:00:00.000Z", verificationHash: "specification-derivation-reconciliation"
  });
  const routeId = family.routeIds[0];
  const producePacket = async (specification) => {
    try {
      const composed = composeParticipantDeliveryPacket(specification, matterFor(specification, routeId));
      await renderGradeAPacketPdf(composed);
      return { produced: true, refusal: null, packet: composed };
    } catch (error) { return { produced: false, refusal: String(error.message ?? error), packet: null }; }
  };
  const priorAttempt = await producePacket(prior);
  ok(`${label}: the prior specification cannot produce a participant packet`,
    !priorAttempt.produced,
    "it produced one, so its participant-facing output could have changed and only a byte comparison can say");

  // 4. The current specification produces a packet, and its transcribed prose
  //    is the approved artifact's prose.
  const currentAttempt = await producePacket(current);
  ok(`${label}: the current specification produces a participant packet`,
    currentAttempt.produced, currentAttempt.refusal?.slice(0, 160));

  /*
   * Read from the COMPOSED packet's body blocks.
   *
   * Not from the specification document objects, which also carry prose about
   * themselves -- a document contract's unresolved-reason sentences, the
   * caption-treatment authority note, provenance naming the build host and its
   * digest. None of that is printed for a participant, and matching it against
   * the artifact would be measuring the specification's own bookkeeping.
   *
   * And not from the caption block either. A `pleading_caption` is a structured
   * object the renderer lays out from the caption contract -- court, parties,
   * case number, title -- and flattening it yields a string that exists on no
   * page, because `pdftotext -layout` returns those fields from different
   * places on the sheet. It is composed furniture, not transcribed text.
   *
   * What is left is the body a participant reads, which is what the repair
   * transcribed and therefore what is checked.
   */
  const canonical = path.join(rootDir, `${family.overlay}/fixtures/canonical.pdf`);
  const approvedText = normalise(execFileSync("pdftotext", ["-layout", canonical, "-"],
    { encoding: "utf8", maxBuffer: 1 << 26 }));
  const labels = structuralLabels(current);
  const bodyBlocks = (currentAttempt.packet?.documents ?? [])
    .flatMap((document) => document.blocks ?? [])
    .filter((block) => !/caption/i.test(String(block.kind ?? "")));
  const sentences = [...new Set([...prose(bodyBlocks)]
    .flatMap((text) => normalise(text).split(/(?<=[.;:])\s+/))
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 45 && !sentence.includes("DERIVATION-")))];
  /*
   * A sentence counts as carried when the approved artifact holds it whole,
   * or -- where the transcription grouped two caption annotations into one
   * paragraph that the artifact lays out in different places on the sheet --
   * when it holds every segment of it. Segment-wise still requires every word
   * group to exist in the approved bytes; only the grouping may differ.
   */
  const regrouped = new Set();
  const absent = sentences.filter((sentence) => {
    if (approvedText.includes(sentence)) return false;
    const parts = sentence.split(/(?<=\))\s+/).map((part) => part.trim()).filter(Boolean);
    // Every segment, down to a short label, must still be in the approved
    // bytes. A part that vanished is a changed assertion, not a regrouping.
    if (parts.length > 1 && parts.every((part) => approvedText.includes(part))) {
      regrouped.add(sentence);
      return false;
    }
    return true;
  });
  const unexplained = absent.filter((sentence) => {
    // A structural label, in full or as the head of a longer printed line.
    for (const structural of labels) {
      if (structural === sentence || structural.startsWith(sentence) || sentence.startsWith(structural)) return false;
    }
    // Or a sentence the product composes DELIBERATELY and the approved artifact
    // does not contain, named one at a time with its reason below.
    for (const deliberate of DELIBERATELY_BEYOND_THE_APPROVED_ARTIFACT[family.familyId] ?? []) {
      if (sentence.includes(normalise(deliberate.startsWith))) return false;
    }
    return true;
  });
  ok(`${label}: every composed assertion is already in the owner-approved artifact`,
    unexplained.length === 0,
    unexplained.map((s) => `"${s.slice(0, 110)}"`).join("; "));
  const fidelity = {
    measuredOver: "the composed participant packet's body blocks, excluding renderer-composed captions",
    substantiveSentences: sentences.length,
    presentInApprovedArtifact: sentences.length - absent.length,
    regroupedButPresent: [...regrouped].map((sentence) => ({
      text: sentence,
      why: "the transcription carries two caption annotations in one paragraph; the approved artifact lays them "
        + "out in different places on the sheet. Every segment is present in the approved bytes, so the words "
        + "are the approved words and only the grouping differs."
    })),
    notFoundVerbatim: absent.map((sentence) => ({
      text: sentence,
      classification: unexplained.includes(sentence) ? "UNEXPLAINED" : "structural_label",
      why: unexplained.includes(sentence)
        ? "not found in the approved artifact and not a label the specification declares"
        : "a document title, section heading or field label; the specification and the build host each print it their own way"
    }))
  };

  families.push({
    familyId: family.familyId,
    routeIds: family.routeIds,
    specificationPath: family.specificationPath,
    priorSpecificationSha256: family.priorSpecificationSha256,
    priorSpecificationCommit: priorHeld.commit.slice(0, 9),
    currentSpecificationSha256,
    movedIn: movedIn(family.specificationPath, priorHeld.commit),
    providerPaths: family.providerPaths,
    buildHostReadsSpecification: readsSpecification.length > 0,
    buildHostNeedsMountedCorpus: family.builderNeedsMountedCorpus,
    approvedArtifacts,
    priorSpecificationProducesAPacket: priorAttempt.produced,
    priorSpecificationRefusal: priorAttempt.refusal?.slice(0, 400) ?? null,
    currentSpecificationProducesAPacket: currentAttempt.produced,
    transcriptionFidelity: fidelity
  });
}

const reconciliation = {
  schemaVersion: "rcap-specification-derivation-reconciliation/v1",
  recordId: "SPEC-DERIVATION-RECONCILIATION-2026-09-20",
  generatedBy: "scripts/verify-specification-derivation-reconciliation.mjs",
  reconciledOn: "2026-09-20",
  /*
   * Stated at the top, because a reconciliation file is exactly where a
   * measurement quietly becomes a permission.
   */
  createsApproval: false,
  changesApprovedArtifacts: false,
  approvesComposedOutput: false,
  opensAnyRoute: false,
  establishesProviderOrPublicationProof: false,
  rule: "A specification digest may be carried forward on the evidence that the owner-approved artifacts did not "
    + "move and that the build host which produced them never reads the specification. This is evidence "
    + "reconciliation, not a new owner decision. It carries forward a digest and nothing else: a route that "
    + "delivers a packet composed FROM the specification still needs those exact composed bytes reviewed and "
    + "approved, which this file does not do and must never be read as doing.",
  whatMoved: "Four reviewed commits on 2026-09-20 repaired a derivation defect the composer names in terms: the "
    + "specifications had kept a DESCRIPTION of each approved component and dropped its substance, and the repair "
    + "transcribed the adopted text back in from each family's census-v1 build host. The approved artifacts are "
    + "byte-identical throughout.",
  families
};

if (process.argv.includes("--write") && failures.length === 0) {
  fs.writeFileSync(path.join(rootDir, OUT), `${JSON.stringify(reconciliation, null, 2)}\n`);
}

for (const family of families) {
  const fidelity = family.transcriptionFidelity;
  console.log(`${family.familyId.padEnd(32)} ${family.priorSpecificationSha256.slice(0, 12)} -> ${family.currentSpecificationSha256.slice(0, 12)}`);
  console.log(`  approved artifacts unchanged: ${family.approvedArtifacts.every((a) => a.bytesUnchanged)}`
    + `   build host reads specification: ${family.buildHostReadsSpecification}`);
  console.log(`  prior produces a packet: ${family.priorSpecificationProducesAPacket}   current produces a packet: ${family.currentSpecificationProducesAPacket}`);
  if (fidelity) {
    console.log(`  composed assertions in the approved artifact: ${fidelity.presentInApprovedArtifact}/${fidelity.substantiveSentences}`
      + `   regrouped: ${fidelity.regroupedButPresent.length}`
      + `   structural labels printed differently: ${fidelity.notFoundVerbatim.length}`);
  }
}

if (failures.length > 0) {
  console.error(`\nSPECIFICATION DERIVATION RECONCILIATION FAILED — ${failures.length} of ${checks} checks:`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`\nSpecification derivation reconciliation — ${checks} checks across ${families.length} families.`);
console.log(process.argv.includes("--write") ? `Wrote ${OUT}` : "Not written (pass --write).");
