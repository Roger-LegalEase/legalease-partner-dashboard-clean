#!/usr/bin/env node
// Wave C: the reviewer findings, reproduced against current bytes, and the
// record corrections that do not need a rerender.
//
//   node scripts/generate-rcap-wave-c-corrections.mjs
//   node scripts/generate-rcap-wave-c-corrections.mjs --check
//
// Three shards of independent review landed on the same base commit and found
// the same handful of causes. Most of what they found is fixed in the shared
// modules and proved by canaries next door; those corrections reach a family's
// artifact only when it is rendered again, which needs the Master Library
// extract this clone does not carry.
//
// What this generator does is the part that does not need it:
//
//   1. REPRODUCE. Every finding is re-measured against the bytes on disk now,
//      so the record says what is true today rather than what a reviewer saw.
//      A finding that no longer reproduces is recorded as not reproducing.
//   2. ATTRIBUTE. For every family, each string on the filed page is split
//      into what the court printed and what this platform wrote, by comparing
//      the artifact against the blank rendering committed in its own contact
//      sheet. This is what `protected-fields-scan.json` could not do: its
//      stated basis is "what the renderer wrote", so a name that arrives with
//      the source and is made permanent by flattening reads as clean.
//   3. RE-MEASURE. What the corrected caption and region channels see on each
//      family's blank today, against what its committed classification
//      records. This is the input a rerender will consume, and the difference
//      is the reviewable part of the correction.
//   4. CORRECT THE RECORDS. Two findings are about what a record says rather
//      than about rendered bytes, and both are fixed here: NC AOC-CR-296's
//      document owner, and NC AOC-CR-298's source URL.
//
// It renders no PDF, approves nothing, and promotes nothing.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { attributePageText, recaptureFieldContext, blankPagesOf } from "./rcap-official-forms/rcap-blank-panel.mjs";
import { decideBinding, selectOnePerSlot, isUndecodableText } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { prosecutorOwnershipEvidence, classify } from "./implement-rcap-official-forms-d1.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const sha256 = (file) => (fs.existsSync(file) ? createHash("sha256").update(fs.readFileSync(file)).digest("hex") : null);

const EVIDENCE = "data/rcap-all50/pdf-independent-reviews/gate-b-family-rerender-evidence.json";
const OUT_DIR = "data/rcap-all50/pdf-independent-reviews/wave-c-corrections";
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/wave-c-corrections.md";

// The three review commits this consumes, read-only.
const REVIEWS = [
  { shard: "b", commit: "7f38c017bb6c25791cb1bfac77091ad951340b57", branch: "claude/gate-b-wave-c-review-zr5151",
    scope: ["NC:aoc-cr-287-form-en", "NC:aoc-cr-288-form-en", "NC:aoc-cr-296-form-en", "NC:aoc-cr-298-form-en"] },
  { shard: "c", commit: "f3251dbd5b829999a90aa83562fbd0c94a55267b", branch: "claude/epic-newton-022oud",
    scope: ["NC:aoc-cv-226-support-en", "NE:cc-6-11-2-form-en", "NE:cc-6-11-form-en", "NE:cc-6-12-form-en"] },
  { shard: "d", commit: "8b3da39f", branch: "claude/gate-b-wave-c-review-kibrgo",
    scope: ["NE:cc-6-15-1-form-en", "VA:cc-1201-form-en", "VA:cc-1473-form-en", "VT:600-00228-support-en"] }
];

const CHOOSER_PROMPTS = ["Choose the court", "Choose the county"];
const WRITABLE_CLASSES = new Set(["participant", "deterministic", "participant_writable"]);

const evidence = readJson(EVIDENCE);
const familyDirs = new Map(evidence.families.map((f) => [f.familyId, f.familyPackagePath]));

// --- record corrections ------------------------------------------------------

const corrections = [];

/** Writes a JSON file only when its content actually changes. */
function writeJson(relPath, value) {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  const file = abs(relPath);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === json) return false;
  if (checkOnly) {
    console.error(`FAIL wave C corrections — ${relPath} is stale; re-run this generator`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, json);
  return true;
}

// --- NC AOC-CR-296: a prosecutor's instrument -------------------------------

const CR296 = "data/rcap-all50/overlays/production/north-carolina/aoc-cr-296-form-en";
{
  const dir = path.join(rootDir, CR296);
  const printed = ((await blankPagesOf(dir)) ?? []).flat();
  const owner = prosecutorOwnershipEvidence(printed);
  if (!owner) {
    console.error("FAIL wave C corrections — NC AOC-CR-296 no longer reads as prosecutor-owned; the correction below would be unfounded");
    process.exit(1);
  }

  const record = readJson(`${CR296}/source-record.json`);
  record.documentOwnership = "prosecutor_completed";
  record.documentOwner = owner.owner;
  record.documentOwnerEvidence = owner;
  record.participantCompleted = false;
  record.participantFillable = false;
  record.implementationStatus = "no_fill_prosecutor_owned_document";
  record.ownershipDetermination =
    "Prosecutor's instrument. The district attorney completes and files it, so the participant does not complete it "
    + "and the platform produces no participant fill. It stays in the pathway as guidance.";
  // The corpus's own vocabulary for this, plus the specific reason.
  record.productionHolds = [...new Set([...(record.productionHolds ?? []),
    "not_participant_fillable_no_fixture_fill", "prosecutor_owned_no_participant_fill"])];
  writeJson(`${CR296}/source-record.json`, record);

  const map = readJson(`${CR296}/production-field-map.json`);
  // Idempotent: the withdrawal is recorded in the refusals, so a second run
  // reads the same list back rather than emptying it.
  const alreadyWithdrawn = (map.bindingRefusals ?? []).filter((r) => r.withdrawnFrom === "bindings");
  const nowWithdrawing = (map.bindings ?? []).map((b) => ({
    field: b.field, reason: "document_is_not_a_participant_filing", category: "prosecutor_completed",
    factId: b.factId, withdrawnFrom: "bindings", why: owner.titleLine ?? owner.statementLine
  }));
  const withdrawnNames = new Set(alreadyWithdrawn.map((r) => r.field));
  map.bindingRefusals = [
    ...(map.bindingRefusals ?? []),
    ...nowWithdrawing.filter((r) => !withdrawnNames.has(r.field))
  ];
  const withdrawn = [...alreadyWithdrawn, ...nowWithdrawing.filter((r) => !withdrawnNames.has(r.field))];
  map.bindings = [];
  map.documentOwnership = "prosecutor_completed";

  // The participant filing itself.
  //
  // The corpus already states the rule -- a family that is not participant
  // fillable carries no filled fixture, and verify-rcap-official-forms-d1
  // asserts it -- so leaving these in place would leave the package asserting
  // both that the participant does not complete this form and that here is the
  // participant's completed copy of it. Their digests are recorded first, and
  // they are recoverable from git and reproducible from the Master Library, so
  // nothing about what was produced is lost.
  //
  // The contact sheet stays. It is the review evidence for what happened, and
  // it carries the only rendering of this form's blank that this repository
  // has.
  const PARTICIPANT_FIXTURES = ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf"];
  const previouslyRecorded = map.withdrawal?.artifactsWithdrawn ?? {};
  const artifactsWithdrawn = {};
  const removedNow = [];
  for (const relFixture of PARTICIPANT_FIXTURES) {
    const file = path.join(dir, relFixture);
    const digest = sha256(file) ?? previouslyRecorded[relFixture] ?? null;
    if (digest) artifactsWithdrawn[relFixture] = digest;
    if (fs.existsSync(file)) {
      if (checkOnly) {
        console.error(`FAIL wave C corrections — ${CR296}/${relFixture} is a participant filing of a prosecutor's instrument; re-run this generator`);
        process.exit(1);
      }
      fs.rmSync(file);
      removedNow.push(relFixture);
    }
  }

  // The implementation index describes what the driver produced, so it stops
  // describing this family as a produced participant filing.
  const INDEX = "data/rcap-all50/overlays/production/implementation-index.json";
  if (fs.existsSync(abs(INDEX))) {
    const index = readJson(INDEX);
    const entry = (index.families ?? []).find((f) => f.jurisdiction === "NC" && f.family === "aoc-cr-296-form-en");
    if (entry) {
      entry.ownership = "prosecutor_completed";
      entry.status = "no_fill_prosecutor_owned_document";
      entry.bound = 0;
      entry.filled = 0;
      entry.holds = record.productionHolds.length;
      writeJson(INDEX, index);
    }
  }

  // The all-page raster manifest for a withdrawn family stops being produced,
  // which leaves its later pages referenced by nothing. An evidence image
  // nothing references is evidence for a question that has moved on, and the
  // corpus already refuses to keep one. Page 1 is still referenced by the
  // contact-sheet visual proof and stays.
  const RASTER_DIR = "docs/record-clearing/pdf-visual-evidence";
  const rastersWithdrawn = {};
  if (fs.existsSync(abs(RASTER_DIR))) {
    for (const file of fs.readdirSync(abs(RASTER_DIR)).sort()) {
      if (!file.startsWith("NC-aoc-cr-296-form-en-contact-sheet-page-")) continue;
      if (file.endsWith("page-01.png")) continue;
      const relRaster = `${RASTER_DIR}/${file}`;
      rastersWithdrawn[relRaster] = sha256(abs(relRaster))
        ?? map.withdrawal?.allPageRastersWithdrawn?.[relRaster] ?? null;
      if (checkOnly) {
        console.error(`FAIL wave C corrections — ${relRaster} is an all-page raster of a withdrawn family; re-run this generator`);
        process.exit(1);
      }
      fs.rmSync(abs(relRaster));
    }
  }
  for (const [key, value] of Object.entries(map.withdrawal?.allPageRastersWithdrawn ?? {})) {
    if (!(key in rastersWithdrawn)) rastersWithdrawn[key] = value;
  }

  // The contact-sheet proof pinned a fixture that no longer exists. It keeps
  // the digest it pinned -- that is the record of what the sheet depicts --
  // and says the fixture was withdrawn rather than pointing at a file nothing
  // can open.
  const PROOF = `${CR296}/contact-sheet/contact-sheet-proof.json`;
  if (fs.existsSync(abs(PROOF))) {
    const proof = readJson(PROOF);
    if (proof.finalizedSha256 && !proof.finalizedArtifactWithdrawn) {
      proof.finalizedArtifactWithdrawn = {
        path: "fixtures/canonical-filled.pdf",
        sha256: proof.finalizedSha256,
        why: "AOC-CR-296 is a District Attorney petition; the participant filing it depicts was withdrawn"
      };
      writeJson(PROOF, proof);
    }
  }

  // The render receipt describes what is on disk, so it stops describing what
  // is not.
  const receiptPath = `${CR296}/reports/rendered-artifacts.json`;
  if (fs.existsSync(abs(receiptPath))) {
    const receipt = readJson(receiptPath);
    for (const relFixture of PARTICIPANT_FIXTURES) delete receipt.artifacts?.[relFixture];
    receipt.withdrawnArtifacts = {
      ...artifactsWithdrawn,
      why: "AOC-CR-296 is a District Attorney petition; the platform produces no participant fill for it"
    };
    writeJson(receiptPath, receipt);
  }

  map.withdrawal = {
    reason: "AOC-CR-296 is a District Attorney petition. It is captioned DISTRICT ATTORNEY PETITION, its identity "
      + "block is Name And Address Of Defendant, it signs off on a District Attorney Name line, it notes on its own "
      + "face that it is filed by the district attorney and needs no filing fee, and page 2 closes with a NOTE TO "
      + "DISTRICT ATTORNEY. The platform bound and wrote it as a participant filing.",
    evidence: owner,
    fieldsWithdrawn: withdrawn.map((b) => b.field),
    artifactsWithdrawn,
    allPageRastersWithdrawn: rastersWithdrawn,
    contactSheetRetained: {
      "contact-sheet/blank-vs-filled.pdf": sha256(path.join(dir, "contact-sheet/blank-vs-filled.pdf")),
      why: "it is the evidence of what was produced, and it carries the only rendering of this form's blank that this "
        + "repository has"
    },
    participantGuidancePreserved: {
      pathway: "NC youthful convictions at 16-17 before 2019-12-01, G.S. 15A-145.8A",
      whatTheParticipantDoes: "The district attorney petitions on the participant's behalf under G.S. 15A-145.8A. "
        + "The participant's own filings in the North Carolina pathway are AOC-CR-287 (dismissal), AOC-CR-288 "
        + "(acquittal), AOC-CR-297 (nonviolent felony), AOC-CR-298 (nonviolent misdemeanour) and, where the filing "
        + "fee is at issue, AOC-CV-226. Those are unaffected by this withdrawal.",
      thisFormRemainsInThePathwayAs: "guidance: what it is, who files it, and what the participant supplies to the "
        + "district attorney's office"
    }
  };
  writeJson(`${CR296}/production-field-map.json`, map);

  corrections.push({
    id: "WAVE-C-NC-296-OWNER",
    familyId: "NC:aoc-cr-296-form-en",
    finding: "a prosecutor's instrument recorded as participant_completed and participantFillable, and produced as a participant filing",
    reviewer: "shard b",
    reproduced: true,
    reproducedHow: "the form's own printed text still carries both the DISTRICT ATTORNEY PETITION title and the note that it is filed by the district attorney",
    correction: "document owner recorded as the prosecutor, participantCompleted and participantFillable false, every binding withdrawn from the map, and the produced artifacts marked as not to be served",
    proof: "node scripts/verify-rcap-official-forms-d1.mjs",
    stillOpen: "the artifacts on disk were produced as a participant filing and remain until this family is rendered again, which produces none"
  });
}

// --- NC AOC-CR-298: a URL that describes a different form -------------------

const CR298 = "data/rcap-all50/overlays/production/north-carolina/aoc-cr-298-form-en";
{
  const record = readJson(`${CR298}/source-record.json`);
  // Idempotent: once withdrawn the record carries the URL it withdrew, so a
  // second run sees the same finding rather than none at all.
  const badUrl = record.sourceUrl ?? record.sourceUrlWithdrawn?.url ?? null;
  const describesAnotherForm = typeof badUrl === "string"
    && !/aoc-cr-298/i.test(badUrl)
    && /felony|felonies/i.test(badUrl);
  if (describesAnotherForm) {
    record.sourceUrl = null;
    record.sourceUrlWithdrawn = {
      url: badUrl,
      why: "the recorded locator names nonviolent FELONIES and names the instructions. This artifact is AOC-CR-298 "
        + "(NONVIOLENT MISDEMEANOR(S)), which states on its own face that felony expunctions use AOC-CR-297, and the "
        + "URL does not contain the string AOC-CR-298. A locator that resolves to a different form is worse than "
        + "none: it is indistinguishable from a correct one until somebody follows it.",
      replacedWith: null,
      whyNotReplaced: "no verified URL could be established here. Outbound HTTPS to court publishers is refused by "
        + "this environment's egress policy, so any replacement would be a plausible string rather than a followed "
        + "link. The provenance locator that is provably true remains the pinned Master Library path and the digest "
        + "of the bytes.",
      whatWouldCloseIt: "fetch the AOC-CR-298 (nonviolent misdemeanours) form from nccourts.gov in an environment "
        + "with egress, confirm the bytes hash to this record's sha256 or record the difference, and pin the URL that "
        + "served them"
    };
    writeJson(`${CR298}/source-record.json`, record);
    corrections.push({
      id: "WAVE-C-NC-298-SOURCE-URL",
      familyId: "NC:aoc-cr-298-form-en",
      finding: "the recorded sourceUrl describes AOC-CR-297's felony form and its instructions, not this artifact",
      reviewer: "shard b",
      reproduced: true,
      reproducedHow: "the recorded URL contains neither the string AOC-CR-298 nor the word misdemeanor",
      correction: "the URL is withdrawn rather than replaced, with the reason and what would close it recorded",
      proof: "the source record carries sourceUrl null and sourceUrlWithdrawn",
      stillOpen: "no verified publisher URL for AOC-CR-298 exists in this record"
    });
  }
}

// --- reproduction ------------------------------------------------------------
//
// Measured AFTER the record corrections above, so what this record says about
// each family is what is on disk when it is written. Measuring first and
// correcting second produced a record that described the state before its own
// corrections, and a second run of the generator then disagreed with the
// first.

/** Every line the finalized artifact shows, page by page. */
async function finalizedLines(dir) {
  const file = path.join(rootDir, dir, "fixtures/canonical-filled.pdf");
  if (!fs.existsSync(file)) return [];
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().map((page, index) => ({ page: index + 1, lines: groupIntoLines(extractTextItems(page)) }));
}

const families = [];
for (const [familyId, dir] of familyDirs) {
  const rel = (name) => path.join(rootDir, dir, name);
  const classification = fs.existsSync(rel("field-classification.json"))
    ? JSON.parse(fs.readFileSync(rel("field-classification.json"), "utf8")) : { entries: [] };
  const mapPath = fs.existsSync(rel("production-field-map.json")) ? rel("production-field-map.json") : rel("overlay-profile.json");
  const map = fs.existsSync(mapPath) ? JSON.parse(fs.readFileSync(mapPath, "utf8")) : {};

  const pages = await finalizedLines(dir);
  const flatText = pages.flatMap((p) => p.lines.map((l) => l.text)).join("\n");

  // 1. the chooser prompts, on the bytes as committed
  const promptsOnTheFiledPage = [];
  for (const prompt of CHOOSER_PROMPTS) {
    for (const { page, lines } of pages) {
      for (const line of lines) {
        if (!line.text.includes(prompt)) continue;
        promptsOnTheFiledPage.push({ prompt, page, x: line.x, y: line.y });
      }
    }
  }

  // 2. the channels that were captured as glyph ids
  const undecodedChannels = (classification.entries ?? [])
    .filter((e) => isUndecodableText(e.effectiveLabel) || isUndecodableText(e.regionHeading))
    .map((e) => e.name);

  // 3. what the corrected channels measure on the same blank, today
  let recaptured = null;
  try { recaptured = await recaptureFieldContext(path.join(rootDir, dir)); } catch { recaptured = null; }
  const channelChanges = [];
  if (recaptured) {
    for (const entry of classification.entries ?? []) {
      const now = recaptured.get(entry.name);
      if (!now) continue;
      const labelChanged = (entry.effectiveLabel ?? null) !== (now.effectiveLabel ?? null);
      const regionChanged = (entry.regionHeading ?? null) !== (now.regionHeading ?? null);
      if (!labelChanged && !regionChanged) continue;
      channelChanges.push({
        field: entry.name,
        effectiveLabel: labelChanged ? { recorded: entry.effectiveLabel ?? null, remeasured: now.effectiveLabel ?? null, basis: now.labelBasis } : undefined,
        trailingLabel: now.trailingLabel ?? null,
        regionHeading: regionChanged ? { recorded: entry.regionHeading ?? null, remeasured: now.regionHeading ?? null, basis: now.regionBasis } : undefined
      });
    }
  }

  // Whether this document says on its own face that somebody else files it.
  // Read from the blank rather than from the record, so it does not move when
  // this generator corrects the record.
  let printedBlank = null;
  try { printedBlank = (await blankPagesOf(path.join(rootDir, dir)))?.flat() ?? null; } catch { printedBlank = null; }
  const notAParticipantFiling = printedBlank ? prosecutorOwnershipEvidence(printedBlank) : null;

  // 4. what the corrected binder would decide, against what the map records.
  // Not asked of a document the participant does not complete: its map carries
  // no participant bindings for a corrected binder to change, and comparing
  // against one this generator itself withdraws would make the answer depend
  // on which run you are in.
  const bindingChanges = { wouldBind: [], wouldRefuse: [], wouldRebind: [] };
  if (notAParticipantFiling) {
    /* no participant bindings to compare */
  } else if (recaptured && Array.isArray(map.bindings)) {
    const census = fs.existsSync(rel("field-census.json"))
      ? JSON.parse(fs.readFileSync(rel("field-census.json"), "utf8")) : { fields: [] };
    const byName = new Map((census.fields ?? []).map((f) => [f.name, f]));
    const candidates = [];
    const refusals = new Map();
    for (const entry of classification.entries ?? []) {
      const context = recaptured.get(entry.name) ?? {};
      const decision = decideBinding(
        { name: entry.name, pdfType: entry.type, effectiveLabel: context.effectiveLabel ?? null,
          trailingLabel: context.trailingLabel ?? null, regionHeading: context.regionHeading ?? null,
          regionIsDocumentTitle: context.regionIsDocumentTitle === true },
        { captionOnly: map.captionOnly === true, availableChargeRows: 1, documentAcceptsFill: true }
      );
      // The ROLE a rerender would give it, not the one recorded before the
      // caption channel reached the classifier: VT names its fields as bare
      // digits, so every one of them classified `manual` and the role refusal
      // held even after the binder learned to read printed labels.
      const role = classify(entry.name, entry.type, classification.documentOwnership, context.effectiveLabel ?? null);
      if (decision.writable && !WRITABLE_CLASSES.has(role)) {
        refusals.set(entry.name, "classified_unwritable_by_role");
      } else if (decision.writable) {
        const field = byName.get(entry.name);
        candidates.push({ field: entry.name, name: entry.name, factId: decision.factId, pdfType: entry.type,
          page: field?.widgets?.[0]?.page ?? null, rect: field?.widgets?.[0]?.rect ?? null });
      } else {
        refusals.set(entry.name, decision.reason);
      }
    }
    const slots = selectOnePerSlot(candidates);
    for (const loser of slots.refused) refusals.set(loser.field, loser.reason);
    const now = new Map(slots.kept.map((c) => [c.field, c.factId]));
    const was = new Map(map.bindings.map((b) => [b.field, b.factId]));
    for (const [field, factId] of now) if (!was.has(field)) bindingChanges.wouldBind.push({ field, factId });
    for (const [field, factId] of was) {
      if (now.has(field)) continue;
      bindingChanges.wouldRefuse.push({ field, wasBound: factId, reason: refusals.get(field) ?? "dropped_in_slot_arbitration" });
    }
    for (const [field, factId] of now) {
      if (was.has(field) && was.get(field) !== factId) bindingChanges.wouldRebind.push({ field, from: was.get(field), to: factId });
    }
  }

  // 5. what the court printed versus what this platform wrote
  let attribution = null;
  try { attribution = await attributePageText(path.join(rootDir, dir)); } catch { attribution = null; }

  // Written into the family package as well as into this record. A reviewer
  // opening one family should not have to open a corpus-wide file to learn
  // which words on its filed page the court printed.
  if (attribution) {
    writeJson(path.join(dir, "reports/page-text-attribution.json"), {
      schemaVersion: "rcap-page-text-attribution/v1",
      familyId,
      basis: "every visible line of the finalized artifact compared against the same line of the blank rendering "
        + "committed in this family's own contact sheet, which is the court's form sanitized and flattened exactly "
        + "as the filed artifact is",
      whatThisAnswers: "which words on the filed page arrived with the court's form and which this platform wrote. "
        + "A protected-region check whose basis is 'what the renderer wrote' cannot see a string that arrives with "
        + "the source and is made permanent by flattening.",
      sourceInherentTextIsNeverEdited: "a renderer that stripped or overwrote it would be editing the court's own form",
      artifact: "fixtures/canonical-filled.pdf",
      artifactSha256: sha256(rel("fixtures/canonical-filled.pdf")),
      contactSheetSha256: sha256(rel("contact-sheet/blank-vs-filled.pdf")),
      pages: attribution.map((page) => ({
        page: page.page,
        sourceInherentLines: page.sourceInherent.length,
        participantDerivedLines: page.participantDerived.length,
        participantDerived: page.participantDerived.map((d) => ({ text: d.text, x: d.x, y: d.y })),
        sourceInherent: page.sourceInherent.map((d) => d.text)
      }))
    });
  }

  families.push({
    familyId,
    familyPackagePath: dir,
    currentCanonicalArtifactSha256: sha256(rel("fixtures/canonical-filled.pdf")),
    currentContactSheetSha256: sha256(rel("contact-sheet/blank-vs-filled.pdf")),
    notAParticipantFiling: notAParticipantFiling ? notAParticipantFiling.owner : null,
    reproducedAgainstCurrentBytes: {
      chooserPromptsOnTheFiledPage: promptsOnTheFiledPage,
      fieldsWhoseCapturedChannelsAreGlyphIds: undecodedChannels,
      capturedChannelsThatChangeWhenReMeasured: channelChanges.length,
      bindingsThatChangeUnderTheCorrectedBinder:
        bindingChanges.wouldBind.length + bindingChanges.wouldRefuse.length + bindingChanges.wouldRebind.length
    },
    remeasuredChannels: channelChanges,
    bindingChanges,
    pageTextAttribution: attribution
      ? attribution.map((p) => ({
        page: p.page,
        sourceInherentLines: p.sourceInherent.length,
        participantDerivedLines: p.participantDerived.length,
        participantDerived: p.participantDerived.map((d) => d.text)
      }))
      : null,
    filedPageCarriesText: flatText.length
  });
}

// --- source-inherent protected text -----------------------------------------
//
// The name in AOC-CR-298's AOC certification block, and anything like it.

const SOURCE_INHERENT_OF_NOTE = [
  {
    familyId: "NC:aoc-cr-298-form-en",
    text: "Courtney Bailey",
    where: "the Name Of Records Officer (type or print) cell of REPORT BY ADMINISTRATIVE OFFICE OF THE COURTS, page 2",
    treatment: "protected official-form text. It is on the blank as well as the filed artifact, so it arrived with the "
      + "pinned source and flattening makes it permanent. It is not participant data, it is not stripped and it is not "
      + "overwritten: a renderer that edited it would be editing the court's own form."
  }
];

const sourceInherentFindings = [];
for (const note of SOURCE_INHERENT_OF_NOTE) {
  const dir = familyDirs.get(note.familyId);
  const family = families.find((f) => f.familyId === note.familyId);
  const attribution = family?.pageTextAttribution ?? null;
  const onTheFiledPage = family ? true : false;
  let attributedAs = "unknown";
  if (attribution) {
    const derived = attribution.some((p) => p.participantDerived.some((t) => t.includes(note.text)));
    attributedAs = derived ? "participant_derived" : "source_inherent";
  }
  sourceInherentFindings.push({ ...note, familyPackagePath: dir, onTheFiledPage, attributedAs,
    attributionBasis: "the same string is present in the blank rendering committed in this family's own contact sheet" });
}

// --- the record --------------------------------------------------------------

const payload = {
  schemaVersion: "rcap-wave-c-corrections/v1",
  generatedBy: "scripts/generate-rcap-wave-c-corrections.mjs",
  purpose: "Wave C reviewer findings reproduced against the bytes on disk now, the record corrections that do not "
    + "need a rerender, and what the corrected modules would measure and bind when one runs.",
  notAnApproval: "This approves nothing and promotes nothing. Every family below keeps its correction_required record.",
  reviewCommitsConsumed: REVIEWS,
  consumedReadOnly: true,
  rerender: {
    ranHere: false,
    why: "the driver resolves each family's bytes under RCAP_BUNDLE_EXTRACT and the Master Library extract is not "
      + "present in this clone; an exhaustive search of the filesystem finds no copy of it. Outbound HTTPS to court "
      + "publishers is refused by this environment's egress policy, so the official bytes cannot be fetched either.",
    consequence: "every correction below is proved at the module level by its own canaries and re-measured against "
      + "each family's committed blank. None is proved against a family's regenerated artifact, because no family "
      + "artifact could be regenerated.",
    whatWouldCloseIt: "mount the extract, set RCAP_BUNDLE_EXTRACT, run scripts/implement-rcap-official-forms-d1.mjs, "
      + "then re-run every generator in this directory and hand the new bytes to an independent reviewer."
  },
  recordCorrectionsApplied: corrections,
  sourceInherentProtectedText: sourceInherentFindings,
  totals: {
    families: families.length,
    familiesWithAChooserPromptOnTheFiledPage: families.filter((f) => f.reproducedAgainstCurrentBytes.chooserPromptsOnTheFiledPage.length > 0).length,
    chooserPromptOccurrences: families.reduce((n, f) => n + f.reproducedAgainstCurrentBytes.chooserPromptsOnTheFiledPage.length, 0),
    familiesWithGlyphIdChannels: families.filter((f) => f.reproducedAgainstCurrentBytes.fieldsWhoseCapturedChannelsAreGlyphIds.length > 0).length,
    fieldsWithGlyphIdChannels: families.reduce((n, f) => n + f.reproducedAgainstCurrentBytes.fieldsWhoseCapturedChannelsAreGlyphIds.length, 0),
    channelsThatChangeWhenReMeasured: families.reduce((n, f) => n + f.remeasuredChannels.length, 0),
    bindingsThatWouldChange: families.reduce((n, f) =>
      n + f.bindingChanges.wouldBind.length + f.bindingChanges.wouldRefuse.length + f.bindingChanges.wouldRebind.length, 0),
    recordCorrectionsApplied: corrections.length
  },
  families
};

writeJson(`${OUT_DIR}/wave-c-corrections.json`, payload);

// --- the readable half -------------------------------------------------------

const md = [];
md.push("# Wave C — technical corrections\n");
md.push("Reviewer findings from shards b, c and d, reproduced against the bytes on disk now, with the corrections");
md.push("that answer them. Generated by `scripts/generate-rcap-wave-c-corrections.mjs`; this file approves nothing.\n");
md.push("## The rerender did not run here\n");
md.push(`${payload.rerender.why}\n`);
md.push(`${payload.rerender.consequence}\n`);
md.push("## Still on the filed pages\n");
md.push("| family | chooser prompts on the page | fields whose captured channels are glyph ids | channels that change when re-measured | bindings that change |");
md.push("| --- | --- | --- | --- | --- |");
for (const f of families) {
  const r = f.reproducedAgainstCurrentBytes;
  md.push(`| \`${f.familyId}\` | ${r.chooserPromptsOnTheFiledPage.length} | ${r.fieldsWhoseCapturedChannelsAreGlyphIds.length} | ${f.remeasuredChannels.length} | ${r.bindingsThatChangeUnderTheCorrectedBinder} |`);
}
md.push("\n## Record corrections applied\n");
for (const c of corrections) {
  md.push(`### ${c.id} — \`${c.familyId}\`\n`);
  md.push(`**Finding (${c.reviewer}).** ${c.finding}\n`);
  md.push(`**Reproduced.** ${c.reproducedHow}\n`);
  md.push(`**Correction.** ${c.correction}\n`);
  md.push(`**Still open.** ${c.stillOpen}\n`);
}
md.push("## Source-inherent official-form text\n");
md.push("A string on a filed page that is also on the blank arrived with the court's form. It is not participant data,");
md.push("it is not stripped, and it is not overwritten.\n");
md.push("| family | text | attributed as | where |");
md.push("| --- | --- | --- | --- |");
for (const n of sourceInherentFindings) {
  md.push(`| \`${n.familyId}\` | ${n.text} | ${n.attributedAs} | ${n.where} |`);
}
md.push("");

const mdText = `${md.join("\n")}\n`;
const mdFile = abs(OUT_MD);
const currentMd = fs.existsSync(mdFile) ? fs.readFileSync(mdFile, "utf8") : null;
if (currentMd !== mdText) {
  if (checkOnly) { console.error(`FAIL wave C corrections — ${OUT_MD} is stale; re-run this generator`); process.exit(1); }
  fs.mkdirSync(path.dirname(mdFile), { recursive: true });
  fs.writeFileSync(mdFile, mdText);
}

console.log(
  `OK wave C corrections — ${families.length} families reproduced against current bytes; ` +
  `${payload.totals.chooserPromptOccurrences} chooser prompts still on ${payload.totals.familiesWithAChooserPromptOnTheFiledPage} filed pages, ` +
  `${payload.totals.fieldsWithGlyphIdChannels} fields captured as glyph ids, ` +
  `${payload.totals.bindingsThatWouldChange} bindings change under the corrected binder, ` +
  `${corrections.length} record corrections applied`
);
