#!/usr/bin/env node
/**
 * What the clerk receives carries only filing content.
 *
 * THE DEFECT THIS EXISTS FOR
 *
 * Georgia's adopted exhibit cover sheets put four things on one page: the
 * exhibit designation, the document identification, how to obtain the record,
 * and the platform's own statement that it "never collects, inspects or
 * authenticates this record". The first two are filing content. The last two
 * are participant instruction and product copy — and the page is an
 * `attachment` whose recipient is the court, so `packetFilingDocuments` put all
 * four into the court-only download. A participant filed a page telling the
 * judge where they personally could go to get a criminal history report, under
 * a sentence about what a software platform does not do.
 *
 * Nothing refused. The component was correctly classified, correctly
 * transcribed and correctly rendered; the page simply held two documents' worth
 * of content and only one of them was a filing. Classifying it as a supporting
 * page settles its CAPTION TREATMENT. It does not make a product disclaimer
 * appropriate filing content.
 *
 * WHAT THIS CHECKS
 *
 * Two independent things, because either alone can pass while the product is
 * wrong.
 *
 *   THE RECORD. Where a component was split, `artifactBoundarySplit` says which
 *   adopted lines went to the filed half and which to the participant half. A
 *   split is the one operation that loses substance without looking like a
 *   deletion, so the record is measured against THE ADOPTED ARTIFACT — the
 *   fixture at the digest the transcription binding names — and not against
 *   itself.
 *
 *   THE OUTPUT. Every transcribed route is composed and rendered twice, court
 *   -only and full, and the drawn text is read back. Court-only must carry no
 *   participant workflow instruction and no product self-reference; full must
 *   still carry every one of them, because the participant needs to know where
 *   the exhibits come from.
 *
 * AND THE STANDING RULE. A document Expungement.ai cannot produce is never a
 * condition of anything, so neither output may demand an upload, a scan, or a
 * copy sent to us. That is checked sentence by sentence, because "you do not
 * need to send us anything" is the rule being kept, not broken.
 */
import { register } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { composeGradeAPacket } = await import("../src/lib/rcap/grade-a/composer.ts");
const { renderGradeAPacketPdf, packetFilingDocuments } = await import("../src/lib/rcap/grade-a/renderer.ts");
const { assemblePacketWithGuide, guideDocuments, guideStopConditions } =
  await import("../src/lib/rcap/supplemental/guide-renderer.ts");

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

const flat = (text) => String(text).replace(/\s+/g, " ").trim();

function textOf(pdf) {
  const file = path.join(os.tmpdir(), `boundary-${process.pid}-${pdf.length}.pdf`);
  fs.writeFileSync(file, pdf);
  try { return execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" }); }
  finally { fs.rmSync(file, { force: true }); }
}

const specDir = path.join(rootDir, "data/record-clearing/packet-specifications");
const specifications = fs.readdirSync(specDir).filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(fs.readFileSync(path.join(specDir, file), "utf8")))
  .filter((spec) => Array.isArray(spec.documents) && spec.documents.some((d) => d.transcriptionProvenance));

check(specifications.length > 0, `there are transcribed routes to check (${specifications.length})`);

// ===========================================================================
// 1. The split record, measured against the adopted artifact.
// ===========================================================================

/**
 * The adopted fixtures, by digest.
 *
 * Read from the owner adoption rather than from a path convention, and hashed
 * here: a fixture that no longer hashes to the digest the transcription
 * binding names is not the adopted artifact, whatever its filename says.
 */
const adoption = JSON.parse(fs.readFileSync(
  path.join(rootDir, "data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json"), "utf8"));
const fixtureByDigest = new Map();
for (const qualification of adoption.adoption.qualifications) {
  for (const fixtures of Object.values(qualification.digestConditionRecordedPerFamily ?? {})) {
    for (const fixture of fixtures) fixtureByDigest.set(fixture.sha256, fixture.file);
  }
}

const adoptedTextCache = new Map();
function adoptedTextFor(digest) {
  if (adoptedTextCache.has(digest)) return adoptedTextCache.get(digest);
  const relative = fixtureByDigest.get(digest);
  let value = null;
  if (relative) {
    const full = path.join(rootDir, relative);
    if (fs.existsSync(full)) {
      const onDisk = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex");
      // Only the artifact that still hashes to the adopted digest may speak for
      // the adoption. A file at the right path with the wrong bytes is not it.
      if (onDisk === digest) value = flat(execFileSync("pdftotext", ["-layout", full, "-"], { encoding: "utf8" }));
    }
  }
  adoptedTextCache.set(digest, value);
  return value;
}

/**
 * The heading the ADOPTED page printed for this component.
 *
 * The filed half keeps it; the participant half's heading is new page chrome
 * written for the page it now lives on, so it is never used to locate anything
 * in the artifact.
 */
const headingOfAdoptedComponent = (filedHalf) => String(filedHalf.sections?.[0]?.heading ?? "");

/**
 * Every OTHER adopted heading in the route, as candidate end markers.
 *
 * Participant halves are excluded: their headings were written for the pages
 * they now live on and appear nowhere in the artifact, so one could never mark
 * the end of anything in it.
 */
const otherHeadings = (specification, filedHalf) => {
  const participantHalves = new Set(specification.documents
    .flatMap((document) => document.artifactBoundarySplit
      ? [document.artifactBoundarySplit.participantDocumentId] : []));
  return specification.documents
    .filter((document) => document !== filedHalf && !participantHalves.has(document.documentId))
    .flatMap((document) => (document.sections ?? []).map((section) => String(section.heading ?? "")))
    .filter((heading) => heading.trim().length > 8);
};

let splitsChecked = 0;
for (const specification of specifications) {
  const byId = new Map(specification.documents.map((document) => [document.documentId, document]));
  for (const document of specification.documents) {
    const split = document.artifactBoundarySplit;
    if (!split) continue;
    const where = `${specification.routeKey}|${document.documentId}`;
    splitsChecked += 1;

    const filedHalf = byId.get(split.filedDocumentId);
    const participantHalf = byId.get(split.participantDocumentId);
    check(
      Boolean(filedHalf) && Boolean(participantHalf),
      `${where}: both halves of the split are in the specification`
    );
    if (!filedHalf || !participantHalf) continue;

    // The same record on both halves. A split recorded on one side only is a
    // split one half does not know happened.
    check(
      JSON.stringify(filedHalf.artifactBoundarySplit) === JSON.stringify(participantHalf.artifactBoundarySplit),
      `${where}: both halves carry the same split record`
    );

    // The halves are on opposite sides of the boundary, by contract and not by
    // appearance: what the court receives is derived from `instrumentClass`.
    check(
      participantHalf.documentContract?.recipient === "participant"
      && participantHalf.documentContract?.instrumentClass === "participant_guidance",
      `${where}: the participant half is participant_guidance addressed to the participant`
    );
    check(
      filedHalf.documentContract?.recipient === "court",
      `${where}: and the filed half is still addressed to the court`
    );

    /*
     * The pair is selected together or not at all.
     *
     * An instruction page that outlives its exhibit tells the participant to
     * attach a record behind a cover sheet that is not in their packet; an
     * exhibit that outlives its instruction leaves them a cover sheet and no
     * way to know what goes behind it. Mirroring the requirement is what makes
     * either impossible without any new selection logic.
     */
    check(
      participantHalf.requirement === filedHalf.requirement
      && (participantHalf.includeWhen ?? null) === (filedHalf.includeWhen ?? null),
      `${where}: the two halves are selected on identical terms (${filedHalf.requirement})`
    );

    // Nothing lost and nothing added between the adopted page and the halves.
    const editedFrom = new Map((split.linesEdited ?? []).map((row) => [row.participantText, row.adoptedText]));
    const accounted = [...split.linesFiled, ...split.linesMovedToParticipant].map(flat).sort();
    const adopted = split.adoptedLines.map(flat).sort();
    check(
      JSON.stringify(accounted) === JSON.stringify(adopted),
      `${where}: every adopted line is on exactly one side of the split (${adopted.length} lines)`
    );

    /*
     * THE EVIDENCE STEP. Until here the record has only been checked against
     * itself. `adoptedLines` is now measured against the adopted PDF at the
     * digest the transcription binding names -- contiguously and in order, so a
     * line quietly reworded or a paragraph dropped from the middle shows.
     */
    const digest = document.transcriptionProvenance?.adoptedDigest;
    const adoptedText = digest ? adoptedTextFor(digest) : null;
    check(
      adoptedText !== null,
      `${where}: the adopted artifact for ${String(digest).slice(0, 12)}… is on disk at its adopted digest`
    );
    if (adoptedText) {
      /*
       * THE WHOLE COMPONENT, not a contiguous run of it.
       *
       * A first version asked only whether `adoptedLines` appeared in the
       * adopted artifact in order. Dropping the last line of a component --
       * from the record and from the page together, which is exactly how a
       * split loses substance -- still left a contiguous run that matched, and
       * the check passed on a packet that had quietly stopped saying the
       * platform does not collect the record. A prefix is contiguous too.
       *
       * So the component is BOUNDED first: the slice of the adopted page from
       * this component's heading to whatever the artifact prints next, which is
       * either the following component's heading or the build host's route
       * footer. `adoptedLines` then has to account for that slice exactly.
       */
      const heading = flat(headingOfAdoptedComponent(filedHalf));
      const start = adoptedText.indexOf(heading);
      check(start >= 0, `${where}: the adopted artifact prints this component's heading`);
      if (start >= 0) {
        const after = start + heading.length;
        const ends = [...otherHeadings(specification, filedHalf), "Route: obligation:"]
          .map((marker) => adoptedText.indexOf(flat(marker), after))
          .filter((index) => index >= 0);
        const slice = adoptedText.slice(after, ends.length ? Math.min(...ends) : undefined).trim();

        /*
         * A binding is a wildcard, not a literal: the adopted fixture is the
         * build host's render with ITS fixture participant, so where the
         * specification carries `For: {{participant_full_legal_name}}` the
         * adopted page prints a sample person's name. Everything around the
         * binding still has to match exactly, and the match is anchored.
         */
        const pattern = new RegExp(`^${split.adoptedLines.map(flat).join(" ")
          .split(/\{\{[a-z0-9_]+\}\}/i)
          .map((literal) => literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("[^\\n]{1,80}")}$`);
        check(
          pattern.test(slice),
          `${where}: and the split accounts for the whole adopted component, in order${
            pattern.test(slice) ? "" : ` (adopted page carries ${slice.length} chars, the split ${
              split.adoptedLines.map(flat).join(" ").length})`}`
        );
      }
    }

    // The documents actually carry what the record says they carry.
    const bodyOf = (half) => (half.sections ?? [])
      .flatMap((section) => String(section.body ?? "").split(/\n\s*\n/))
      .map(flat).filter(Boolean);
    check(
      JSON.stringify(bodyOf(filedHalf).sort()) === JSON.stringify(split.linesFiled.map(flat).sort()),
      `${where}: the filed page draws exactly the lines the record assigns it`
    );
    const participantExpected = split.linesMovedToParticipant
      .map((line) => flat((split.linesEdited ?? []).find((row) => row.adoptedText === line)?.participantText ?? line))
      .sort();
    check(
      JSON.stringify(bodyOf(participantHalf).sort()) === JSON.stringify(participantExpected),
      `${where}: the participant page draws exactly the lines the record moves to it`
    );

    // A relocational edit is relocational. It may change where a sentence
    // points; it may not change what it asks for.
    const substantive = (split.linesEdited ?? []).filter((row) => {
      const before = flat(row.adoptedText).replace(/\bthis page\b/gi, "").replace(/[A-Z ]{4,}:/g, "");
      const after = flat(row.participantText)
        .replace(/\bthe Exhibit [A-Z] cover page\b/gi, "").replace(/[A-Z ]{4,}:/g, "");
      return before !== after;
    });
    check(
      substantive.length === 0,
      `${where}: every recorded edit changes only where the sentence points${
        substantive.length ? `: "${substantive[0].participantText.slice(0, 70)}…"` : ""}`
    );
    const thin = (split.linesEdited ?? []).filter((row) => !row.why || row.why.length < 40);
    check(thin.length === 0, `${where}: and says why it moved${thin.length ? ` (${thin.length} do not)` : ""}`);
  }
}

check(splitsChecked > 0, `components split along the artifact boundary are audited (${splitsChecked})`);

// ---------------------------------------------------------------------------
// 1b. A sentence taken off a filed page still reaches the participant.
//
// The narrow case: not a component divided in two, but one line that instructs
// the preparer rather than stating the case. Removing it from the petition is
// half the job; the other half is that the participant still learns it. The
// record names where they read it, and that destination is checked to exist --
// recording a destination is not the same as having one.
// ---------------------------------------------------------------------------

let movedLines = 0;
for (const specification of specifications) {
  const byId = new Map(specification.documents.map((document) => [document.documentId, document]));
  for (const document of specification.documents) {
    for (const moved of document.linesMovedToParticipantGuidance ?? []) {
      movedLines += 1;
      const where = `${specification.routeKey}|${document.documentId}`;
      const destination = byId.get(moved.destinationDocumentId);
      check(
        Boolean(destination) && destination.documentContract?.recipient === "participant",
        `${where}: "${moved.text.slice(0, 40)}…" moves to a document the PARTICIPANT reads`
      );
      const body = (destination?.sections ?? []).map((section) => flat(section.body ?? "")).join(" ");
      check(
        body.includes(flat(moved.destinationText)),
        `${where}: and that document actually carries the instruction it is recorded as carrying`
      );
      check(
        !(document.sections ?? []).some((section) => flat(section.body ?? "").includes(flat(moved.text))),
        `${where}: and the filed page no longer carries it`
      );
      check(
        typeof moved.why === "string" && moved.why.length >= 60,
        `${where}: and says why it does not belong on a filed page`
      );
    }
  }
}
check(movedLines >= 0, `sentences moved off a filed page are audited (${movedLines})`);

// ===========================================================================
// 2. The rendered output, court-only and full.
// ===========================================================================

/**
 * What may not appear on a page the participant hands to a clerk.
 *
 * Deliberately narrow: this is not a style checker. Each entry names something
 * that is addressed to the participant rather than to the court, or that speaks
 * about the software rather than about the case.
 */
const NOT_FILING_CONTENT = [
  { label: "a product self-reference", pattern: /\bthe platform (never|does not|will not)\b/i },
  { label: "an acquisition instruction", pattern: /\bWHERE YOU GET IT\b/ },
  { label: "an assembly instruction", pattern: /\bATTACH (BEHIND|THIS ONLY|THESE ONLY)\b/i },
  { label: "a how-to-obtain heading", pattern: /\bHOW TO OBTAIN IT\b/i },
  /*
   * A DRAFTING RULE ADDRESSED TO WHOEVER FILLS THE PAGE IN.
   *
   * Illinois's relief request ended "An unknown offender name must not be
   * invented." -- true, necessary, and printed inside the relief a judge is
   * being asked to grant, where it reads as part of the request rather than as
   * the instruction it is. It is a different failure from the Georgia one: not
   * a product disclaimer and not an acquisition step, so none of the rules
   * above saw it, and it was found by reading the page.
   *
   * Deliberately narrow. It matches an instruction ABOUT filling the document
   * in -- inventing, guessing, leaving blank, completing before signing -- and
   * not a pleaded fact. "substituting the offender's name if known" is the
   * substantive limit on the request and stays.
   */
  {
    label: "a drafting instruction to the preparer",
    pattern: /\b(must not be invented|do not (invent|guess|make up)|leave (this|it) blank|before signing this)\b/i
  }
];

/**
 * The standing rule, as a demand for a record rather than as a mention of one.
 *
 * Sentence by sentence and negation-aware: a packet is allowed to say it needs
 * nothing from you, and an earlier control of this shape read exactly that
 * sentence as the violation.
 */
const RECORD_DEMAND = /\b(upload|scan (it|this|your)|send us|mail us|provide a copy to us|attach a copy for us)\b/i;

/** The demands in a passage, negations excluded. Used by the route pass and by the fixtures below. */
const recordDemands = (text) => text.split(/(?<=[.?!])\s+/)
  .filter((sentence) => RECORD_DEMAND.test(sentence))
  .filter((sentence) => !/\b(do not|don't|never|no need|not need|without)\b/i.test(sentence));

/** The rules a passage breaks, if any. */
const notFilingContent = (text) => NOT_FILING_CONTENT.filter((rule) => rule.pattern.test(text));

const PEOPLE = {
  participant_full_legal_name: "Marisol Okonkwo-Baptiste",
  date_of_birth: "1984-11-02",
  mailing_address: "9 Larkspur Row, Atlanta, GA 30303",
  phone_number: "404-555-0188",
  email_address: "m.okonkwo@example.test"
};

for (const specification of specifications) {
  const where = specification.routeKey;

  // Every component the route can ship, so a conditional page is audited too.
  const everyComponent = structuredClone(specification);
  for (const document of everyComponent.documents) {
    if (document.requirement === "conditional") document.requirement = "required";
  }

  const facts = { ...PEOPLE };
  for (const required of everyComponent.requiredFacts ?? []) {
    if (facts[required.factId]) continue;
    facts[required.factId] = /date/i.test(required.factId) ? "2019-03-14" : `${required.factId.replace(/_/g, " ")}`;
  }

  let packet;
  try {
    packet = composeGradeAPacket(everyComponent, {
      routeKey: where, verificationHash: "filed-artifact-boundary", facts
    }, {});
  } catch (error) {
    check(false, `${where}: composes (${error.message.slice(0, 110)})`);
    continue;
  }

  const filing = packetFilingDocuments(packet);
  if (filing.length === 0) {
    // A guidance-only matter has no filed artifact, so there is no boundary to
    // cross. The court-only refusal is its own control's subject, not this one's.
    check(true, `${where}: composes only guidance, so nothing is filed`);
    continue;
  }

  const full = textOf(await renderGradeAPacketPdf(packet, { variant: "full" }));
  const courtOnly = textOf(await renderGradeAPacketPdf(packet, { variant: "court_only" }));

  const leaked = notFilingContent(courtOnly);
  check(
    leaked.length === 0,
    `${where}: the court-only download carries no participant instruction or product copy${
      leaked.length ? ` (${leaked.map((rule) => rule.label).join(", ")})` : ""}`
  );

  /*
   * And the other direction, which matters just as much: moving a line off the
   * filed page must not delete it. A participant who is never told where the
   * final disposition comes from cannot file the petition at all.
   */
  const split = specification.documents.flatMap((document) =>
    document.artifactBoundarySplit ? [document.artifactBoundarySplit] : []);
  if (split.length > 0) {
    const expected = [...new Set(split.flatMap((record) => record.linesMovedToParticipant.map((line) =>
      flat((record.linesEdited ?? []).find((row) => row.adoptedText === line)?.participantText ?? line))))];
    const missing = expected.filter((line) => !flat(full).includes(line));
    check(
      missing.length === 0,
      `${where}: the full packet still carries every line moved off a filed page (${expected.length})${
        missing.length ? `; missing: "${missing[0].slice(0, 60)}…"` : ""}`
    );

    /*
     * And no filed exhibit cover ships without its instructions.
     *
     * Checked on the COMPOSED PACKET rather than by looking for text, because
     * the question is about what the participant received: a cover sheet in
     * their hands with no page saying what goes behind it is the same defect as
     * the disclaimer on the filed page, reached from the other direction.
     *
     * An earlier version compared `attachments[].obtainedFrom` against the
     * drawn text and demanded the same words. It failed on "Clerk of the court
     * that handled the case" against "the clerk of the convicting court" --
     * the same office, named twice by two authors. A prose-identity test
     * between a structured field and a page is not evidence about the product.
     */
    const composed = new Set(packet.documents.map((document) => document.documentId));
    const orphaned = split
      .filter((record) => composed.has(record.filedDocumentId) && !composed.has(record.participantDocumentId))
      .map((record) => record.filedDocumentId);
    check(
      orphaned.length === 0,
      `${where}: every filed exhibit cover in the packet ships with its instruction page (${split.length} split)${
        orphaned.length ? `; orphaned: ${orphaned.join(", ")}` : ""}`
    );
  }

  for (const [variant, text] of [["court-only", courtOnly], ["full", full]]) {
    const demands = recordDemands(text);
    check(
      demands.length === 0,
      `${where}: the ${variant} output demands no record of the participant${
        demands.length ? `: "${flat(demands[0]).slice(0, 70)}…"` : ""}`
    );
  }
}

// ===========================================================================
// 2b. SELECTION. Nothing the route ships is permanently unreachable.
//
// THE DEFECT THIS EXISTS FOR
//
// A component marked `conditional` with no `includeWhen` is not conditional --
// it is unreachable. The planner cannot decide a condition that was never
// written, so it omits the component, correctly, from every packet, for every
// participant, permanently. Nothing refuses and nothing reports it: the
// component composes, renders, and is never selected.
//
// It has now happened twice. South Dakota's motion to enforce SDCL § 23A-27-17
// sat that way, so a participant whose record was never corrected had no
// supported way to obtain the second instrument at all. Georgia's four
// participant-supplied exhibits sat that way, so the covers and the acquisition
// instructions for a criminal history report, proof of sentence completion and
// the participant's own supporting exhibits reached nobody.
//
// Mirrored metadata does not catch it. Two halves can agree perfectly while
// both are permanently unreachable, which is exactly what the artifact-boundary
// repair produced before this check existed. So reachability is measured
// against the planner, on the route's own facts, with nothing forced.
// ===========================================================================

const { planIncludedDocuments } = await import("../src/lib/rcap/grade-a/composer.ts");

for (const specification of specifications) {
  const where = specification.routeKey;

  // The route's own facts, with nothing promoted and no condition answered:
  // the state a participant is in before any branch question is asked.
  const plainFacts = { ...PEOPLE };
  for (const required of specification.requiredFacts ?? []) {
    if (plainFacts[required.factId]) continue;
    plainFacts[required.factId] = /date/i.test(required.factId) ? "2019-03-14" : required.factId.replace(/_/g, " ");
  }
  const plan = planIncludedDocuments(specification, plainFacts);
  const seen = new Set([
    ...plan.included.map((document) => document.documentId),
    ...plan.unevaluable.map((document) => document.documentId)
  ]);

  /*
   * Every component is INCLUDED or REPORTED. There is no third outcome.
   *
   * "Reported" means the planner returned it as unevaluable, which is what a
   * real condition does before it is answered -- visible, and refused on by the
   * composer rather than silently decided as no. A component in neither list is
   * one nobody will ever see and nobody will ever be told about.
   */
  const invisible = specification.documents.filter((document) => !seen.has(document.documentId));
  check(
    invisible.length === 0,
    `${where}: every component is selected or reported unevaluable, never silently dropped${
      invisible.length ? ` (${invisible.length} unreachable: ${invisible.map((d) => d.documentId).join(", ")})` : ""}`
  );

  // The shape that causes it, named directly so the diagnosis is in the failure.
  const conditionless = specification.documents.filter((document) =>
    document.requirement === "conditional" && !document.includeWhen);
  check(
    conditionless.length === 0,
    `${where}: no component is conditional on a condition nobody wrote${
      conditionless.length ? ` (${conditionless.map((d) => d.documentId).join(", ")})` : ""}`
  );

  /*
   * An OPTIONAL classification says why, citing its source.
   *
   * This is the step that stops the fix from being "mark everything required".
   * Georgia's four are optional because the legal-design memorandum carries
   * them at requiredBeforeFiling false, and two of them appear in no source at
   * all beyond the adopted separator -- which is a different thing from
   * optional because nobody has decided yet, and a reviewer has to be able to
   * see which one it is.
   *
   * SCOPE. Only `optional`. A conditional component already says what decides
   * it, in the condition it names and the description beside it; demanding a
   * second justification from Nevada's and South Dakota's real conditions
   * would be a new requirement imposed on work that is already correct, not a
   * finding about it. `optional` is the classification with no condition to
   * point at, which is exactly why it has to point somewhere else.
   */
  const unjustified = specification.documents.filter((document) =>
    document.requirement === "optional"
    && (typeof document.requirementBasis !== "string" || document.requirementBasis.length < 80));
  check(
    unjustified.length === 0,
    `${where}: every optional component cites the source that makes it optional${
      unjustified.length ? ` (${unjustified.map((d) => d.documentId).join(", ")})` : ""}`
  );

  /*
   * A COVER MAY NOT OUTRANK THE RECORD IT COVERS.
   *
   * The other half of "do not mark every exhibit required", and the one that
   * has to be measured rather than promised. Reverting an exhibit to
   * `conditional` with no condition, deleting it, or inventing a possession
   * condition are all visible above; quietly marking it `required` is one word
   * and looks identical from every angle -- it selects, it renders, it pairs
   * with its instructions -- while telling a participant that a record the
   * source calls optional is one they must produce before they can file.
   *
   * So the exhibit names its `attachments[]` entry and the two are compared.
   * `requiredBeforeFiling` is the source's own answer, and the component's
   * requirement may not exceed it in either direction.
   */
  const attachments = new Map((specification.attachments ?? []).map((row) => [row.attachmentId, row]));
  const covers = specification.documents.filter((document) => document.attachmentId);
  const unlinked = covers.filter((document) => !attachments.has(document.attachmentId));
  check(
    unlinked.length === 0,
    `${where}: every component naming an attachment names one the route has${
      unlinked.length ? ` (${unlinked.map((d) => d.documentId).join(", ")})` : ""}`
  );
  const overstated = covers.filter((document) => {
    const attachment = attachments.get(document.attachmentId);
    if (!attachment) return false;
    return attachment.requiredBeforeFiling === true
      ? document.requirement !== "required"
      : document.requirement === "required";
  });
  check(
    overstated.length === 0,
    `${where}: no exhibit claims a requirement its attachment record does not support (${covers.length} linked)${
      overstated.length ? `: ${overstated.map((d) =>
        `${d.documentId} is ${d.requirement} for an attachment at requiredBeforeFiling ${
          attachments.get(d.attachmentId).requiredBeforeFiling}`).join("; ")}` : ""}`
  );

  // An optional component is a provision, not a condition. It never carries one.
  const optionalWithCondition = specification.documents.filter((document) =>
    document.requirement === "optional" && document.includeWhen);
  check(
    optionalWithCondition.length === 0,
    `${where}: no optional component carries an includeWhen${
      optionalWithCondition.length ? ` (${optionalWithCondition.map((d) => d.documentId).join(", ")})` : ""}`
  );

  /*
   * AND THE INAPPLICABLE CASE, on real route data rather than a fixture.
   *
   * Making optional components reachable must not have made the planner
   * permissive. A component with a REAL condition, before the participant has
   * answered it, still has to come back unevaluable -- unresolved, never "no".
   * South Dakota's escalation motion is the live instance.
   */
  const realConditionals = specification.documents.filter((document) =>
    document.requirement === "conditional" && document.includeWhen);
  if (realConditionals.length > 0) {
    const decided = realConditionals.filter((document) =>
      plan.included.some((entry) => entry.documentId === document.documentId));
    const reported = realConditionals.filter((document) =>
      plan.unevaluable.some((entry) => entry.documentId === document.documentId));
    check(
      decided.length + reported.length === realConditionals.length,
      `${where}: each of its ${realConditionals.length} real conditional(s) is decided or reported, unanswered`
    );
    check(
      reported.length > 0 || decided.length === realConditionals.length,
      `${where}: and an unanswered condition is reported unevaluable rather than read as no`
    );
  }

  /*
   * The standing rule where it would actually be broken: a question that SHAPES
   * THE PACKET.
   *
   * Making an exhibit reachable is one sentence away from making it reachable
   * by asking "do you have it?" -- which is precisely the wording the Georgia
   * memorandum uses for two of these components, and precisely what this
   * product may never make anything turn on. The rule is that a document
   * Expungement.ai cannot produce is never a CONDITION of eligibility, packet
   * completion, Checkout, generation or delivery.
   *
   * SCOPE, and why it is not every question on the surface.
   *
   * A first version read every compiled question in the jurisdiction and
   * reported DC's `record_documents` -- "Do you have your court paperwork
   * handy?", helper text "No worries if not", carried by 45 of the 51 profiles,
   * whose own resume copy tells the participant "you don't need them all in
   * front of you to keep going". Whether that nationwide screening convenience
   * gates anything is a real question and an open one; what is certain is that
   * it is not this repair, and a check that fails on it is the "within 30 days"
   * mistake again -- far broader than the defect, and a false gate on 45
   * jurisdictions.
   *
   * So the domain is the questions that decide what goes in the packet.
   */
  const profilePath = path.join(rootDir, "src/lib/rcap-engine/compiled/profiles");
  const profileFile = fs.existsSync(profilePath)
    ? fs.readdirSync(profilePath).find((name) => name.startsWith(`${specification.jurisdiction}-`))
    : null;
  if (profileFile) {
    const profile = JSON.parse(fs.readFileSync(path.join(profilePath, profileFile), "utf8"));
    const packetShaping = (profile.questions ?? []).filter((question) =>
      question.lifecyclePhase === "postpay_packet_field");
    const asked = packetShaping.flatMap((question) => [
      question.prompt, question.helperText, ...(question.options ?? []).map((option) => option.label ?? option)
    ].filter((value) => typeof value === "string"));
    const possession = /\b(do you have|have you attached|did you attach|upload|scan a copy|send us)\b/i;
    const demands = asked.filter((text) => possession.test(text))
      .filter((text) => !/\b(do not|don't|never|no need|not need|without)\b/i.test(text));
    check(
      demands.length === 0,
      `${where}: no packet-shaping question in ${profileFile} asks whether the participant possesses or has `
      + `attached an outside record (${packetShaping.length} checked)${
        demands.length ? `: "${flat(demands[0]).slice(0, 70)}…"` : ""}`
    );
  }
}

// ===========================================================================
// 2c. GEORGIA'S FOUR, NAMED.
//
// The generic checks above would pass on a route that had simply deleted the
// four components. These name them, because "reachable" for these four is what
// the repair was for, and an optional exhibit that quietly disappeared would
// read as a fix.
// ===========================================================================

const GEORGIA_OPTIONAL = {
  "GA:restriction-and-sealing-of-a-pardoned-felony": ["exhibit_c_supporting_exhibits"],
  "GA:sb-288-misdemeanor-conviction-restriction-and-sealing": [
    "exhibit_b_criminal_history", "exhibit_c_sentence_completion", "exhibit_d_supporting_exhibits"
  ]
};

const guideDir = path.join(rootDir, "data/record-clearing/supplemental-guides");
const guidesByRoute = new Map((fs.existsSync(guideDir) ? fs.readdirSync(guideDir) : [])
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(fs.readFileSync(path.join(guideDir, file), "utf8")))
  .map((guide) => [guide.routeKey, guide]));

for (const [routeKey, documentIds] of Object.entries(GEORGIA_OPTIONAL)) {
  const specification = specifications.find((candidate) => candidate.routeKey === routeKey);
  check(Boolean(specification), `${routeKey}: the route is still registered`);
  if (!specification) continue;

  const facts = { ...PEOPLE };
  for (const required of specification.requiredFacts ?? []) {
    if (facts[required.factId]) continue;
    facts[required.factId] = /date/i.test(required.factId) ? "2019-03-14" : required.factId.replace(/_/g, " ");
  }
  const included = new Set(planIncludedDocuments(specification, facts).included.map((d) => d.documentId));

  for (const documentId of documentIds) {
    check(included.has(documentId), `${routeKey}: ${documentId} reaches a real participant's packet`);
    check(
      included.has(`${documentId}_instructions`),
      `${routeKey}: and so does the page telling them where the record comes from`
    );
  }

  /*
   * LEGITIMATE OMISSION STILL EXPLAINS ITSELF.
   *
   * A participant who supplies nothing takes the separator out of their
   * filing, which is the correct outcome and the one the packet cannot decide
   * for them. What must survive that is the explanation, and the §7 guide is
   * where it lives -- so every optional cover has a checklist entry that says
   * it is optional, independent of whether the cover ends up filed.
   */
  const guide = guidesByRoute.get(routeKey);
  check(Boolean(guide), `${routeKey}: the route has §7 guide data carrying the separated instructions`);
  if (!guide) continue;
  const details = new Map((guide.documentDetails ?? []).map((detail) => [detail.documentId, detail]));
  const courtFacing = specification.documents.filter((d) => d.documentContract?.recipient === "court");
  const undescribed = courtFacing.filter((document) => !details.get(document.documentId)?.instruction?.text);
  check(
    undescribed.length === 0,
    `${routeKey}: the guide's checklist carries a filing instruction for every court-facing component (${
      courtFacing.length})${undescribed.length ? `; missing ${undescribed[0].documentId}` : ""}`
  );
  for (const documentId of documentIds) {
    const text = details.get(documentId)?.instruction?.text ?? "";
    check(
      /^Only if you /.test(text),
      `${routeKey}: and says in terms that ${documentId} is the participant's choice`
    );
    check(
      /take this cover page out of your filing/i.test(text),
      `${routeKey}: and what to do with the separator when they supply nothing`
    );
  }

  /*
   * THE HANDOVER, MEASURED ON THE DELIVERED ARTIFACT.
   *
   * Everything above is about data. This is the fact the participant actually
   * experiences: assemble the packet the way it ships, with the guide, and the
   * standalone instruction pages are gone while their substance is on the page.
   *
   * Both halves matter and neither implies the other. Retiring a page whose
   * replacement had not landed would take the only instructions the
   * participant has; shipping both would hand them two sets for one filing,
   * free to drift apart. The rule is "do not retire an instruction page before
   * its replacement is actually included", and this is where it is true or not.
   */
  const packet = composeGradeAPacket(specification, {
    routeKey, verificationHash: "boundary-assembly", facts
  }, {});
  const assembled = flat(textOf(await assemblePacketWithGuide(packet, guide, {
    stops: guideStopConditions(specification),
    documents: guideDocuments(packet),
    matter: { preparedFor: facts.participant_full_legal_name, packetId: "PKT-BOUNDARY" },
    variant: "full",
    routeKey
  })));

  const retired = packet.documents.filter((document) => document.supersededByGuide);
  check(retired.length > 0, `${routeKey}: the packet carries pages the guide replaces (${retired.length})`);
  const stillShipped = retired.filter((document) => assembled.includes(flat(document.title)));
  check(
    stillShipped.length === 0,
    `${routeKey}: none of them ships beside its replacement${
      stillShipped.length ? ` (${stillShipped[0].documentId})` : ""}`
  );

  const explained = documentIds.filter((documentId) => {
    const exhibit = specification.documents.find((d) => d.documentId === documentId);
    return assembled.includes(flat(exhibit.title)) && assembled.includes("Only if you");
  });
  check(
    explained.length === documentIds.length,
    `${routeKey}: and the delivered packet still explains every optional exhibit (${
      explained.length}/${documentIds.length})`
  );
}

// ===========================================================================
// 3. Both rules, proven in both directions on fixtures.
//
// A rule that only refuses is satisfied by refusing everything, and one that
// only accepts is satisfied by accepting everything. Each pair below is ONE
// passage differing in ONE line, so nothing but the line under test can carry
// the result -- and neither fixture touches a real route's data.
// ===========================================================================

const FILED_COVER =
  "EXHIBIT A - FINAL DISPOSITION\n\nFor: Marisol Okonkwo-Baptiste\n\n"
  + "Filing: the Petition to Restrict Access to Criminal History Record Information Following Pardon in this packet.";
const ACQUISITION_LINE = "WHERE YOU GET IT: the clerk of the convicting court.";

check(
  notFilingContent(FILED_COVER).length === 0,
  "POSITIVE control: a cover carrying only the designation and the document identification is filing content"
);
check(
  notFilingContent(`${FILED_COVER}\n\n${ACQUISITION_LINE}`).length === 1,
  "NEGATIVE control: the same cover plus one acquisition line is refused, and the pair differs in nothing else"
);
check(
  notFilingContent(
    `${FILED_COVER}\n\nThe platform never collects, inspects or authenticates this record.`).length === 1,
  "NEGATIVE control: and so is the same cover plus the product disclaimer"
);

/*
 * The standing rule, and the sentence that upholds it.
 *
 * These two say the same thing about the same record and differ only in whether
 * the verb is negated. An earlier control of this shape read the reassurance as
 * the violation, which is why the pair is controlled rather than merely a
 * violating example.
 */
const DEMANDED = "Send us a copy of the final disposition before we generate your packet.";
const REFUSED = "You do not need to send us a copy of the final disposition before we generate your packet.";
check(
  recordDemands(DEMANDED).length === 1,
  "NEGATIVE control: a sentence asking the participant to send us a record is a demand"
);
check(
  recordDemands(REFUSED).length === 0,
  "POSITIVE control: the same sentence negated is the rule being kept, not broken"
);

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
