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
  { label: "a how-to-obtain heading", pattern: /\bHOW TO OBTAIN IT\b/i }
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
