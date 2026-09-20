#!/usr/bin/env node
/**
 * The §7 supplemental-guide control.
 *
 * WHAT THIS CHECKS, STATED PRECISELY
 *
 * This is a PROVENANCE-METADATA control. It establishes that every entry
 * declares a recognised kind, that anything beyond product copy names a source,
 * that an instruction is not carried as product copy, and that no adopted line
 * is silently dropped. It does NOT read the cited authority and it does NOT
 * establish that the cited passage supports the sentence.
 *
 * That distinction is not pedantry, and it was earned. An earlier version of
 * this file's positive example asserted "File the petition with the clerk
 * within 30 days" against Wyo. Stat. Ann. 7-13-1502(c). Every check here
 * passed it, and the sentence was false: (c) is the PROSECUTOR's obligation to
 * notify identifiable victims within thirty days after service upon the
 * prosecutor, and the statute prescribes no deadline by which the participant
 * must file at all. A citation string satisfied the control while the sentence
 * assigned the wrong action to the wrong person.
 *
 * The number itself was never the defect, and saying so would be its own error.
 * Wyoming carries three distinct clocks: the thirty days in 7-13-1502(c) above;
 * a ninety-day objection window in 7-13-1502(e)-(f), running from the same
 * service, before which no expungement order may issue; and a separate
 * thirty-day objection window on the misdemeanour route at 7-13-1501(e)-(f).
 * All three are real and a guide may state any of them. What none of them is,
 * is a participant filing deadline.
 *
 * So: a green run here means the metadata is well-formed and an instruction is
 * not masquerading as product copy. Whether a cited source actually says what
 * the entry claims is decided by the §7 content review — actor, action,
 * recipient, trigger, deadline and applicability read against the cited
 * passage — which is human work and is not automated here.
 *
 * Two things it exists to prevent.
 *
 * The first is an UNSOURCED INSTRUCTION. Not an authored sentence — the two are
 * different, and confusing them would break this system nationwide. Most routes
 * have no legacy approved guidance page to copy, so a rule of "it must have
 * appeared in an old PDF" would leave them with no guide at all. A newly
 * written "File the petition with the clerk of the court that handled your
 * case" is fine where the route's source says so; asserting it where nothing
 * does is not. So every entry names what supports it, and an entry that carries
 * a legal or procedural instruction must name something more than product copy.
 *
 * The second is a silent drop. A migration that loses a line looks exactly like
 * a migration that never had it, so every line of the adopted guidance page has
 * to arrive somewhere — in one of the four sections, or in `carriedElsewhere`
 * with its destination and the reason.
 *
 * It also holds the line the whole §7 lane exists for: the shared guide replaces
 * the family's own filing-instructions page, it does not accompany it. While
 * both exist, the packet component is marked superseded-pending and the two are
 * required to agree; once the guide ships, the component retires.
 */

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { SUPPLEMENTAL_GUIDE_SECTIONS, GUIDE_PROVENANCE_KINDS, allGuideEntries } =
  await import("../src/lib/rcap/supplemental/guide-contract.ts");
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

const guideDir = path.join(rootDir, "data/record-clearing/supplemental-guides");
check(fs.existsSync(guideDir), "the supplemental-guide route data exists");
const guides = fs.existsSync(guideDir)
  ? fs.readdirSync(guideDir).filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(guideDir, f), "utf8")))
  : [];
check(guides.length > 0, `there are route guides to verify (${guides.length})`);

check(
  SUPPLEMENTAL_GUIDE_SECTIONS.map((section) => section.heading).join(" · ")
    === "Overview · Next Steps · Filing Checklist · Fees & Costs",
  "the guide's sections are the four the plan names, in order"
);

/*
 * The schema stays a schema.
 *
 * The failure mode is gradual and comfortable: one route's wording gets a
 * special case, then another, and the shared contract becomes a content
 * warehouse that every future route has to read around. Route substance lives
 * in the route's own data file; this module holds the shape.
 */
const contractSource = fs.readFileSync(
  path.join(rootDir, "src/lib/rcap/supplemental/guide-contract.ts"), "utf8");
const jurisdictionNames = contractSource
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("*") && !line.trimStart().startsWith("//"))
  .join("\n")
  .match(/\b(Wyoming|Nevada|Mississippi|Illinois|Georgia|Florida|Kansas|Iowa|Maine|Maryland)\b/g);
check(
  jurisdictionNames === null,
  `the guide contract is route-agnostic -- no jurisdiction appears in its code${
    jurisdictionNames ? ` (found ${[...new Set(jurisdictionNames)].join(", ")})` : ""}`
);

/**
 * The packet components a guide supersedes, always as a list.
 *
 * The field takes one id or several because a route's participant guidance is
 * not always on one page: Georgia keeps an instruction page per exhibit, each
 * separated from a filed cover that had been carrying acquisition instructions
 * to the clerk. Reading it as a list in one place is what stops the
 * completeness check below from measuring the first component and silently
 * ignoring the rest.
 */
const superseded = (guide) => {
  const value = guide.supersedesPacketComponent;
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

// Stop conditions are derived from the specification, never copied into a guide.
for (const guide of guides) {
  const specification = superseded(guide).length > 0 ? packetSpecificationFor(guide.routeKey) : null;
  const stops = (specification?.hearingAndObjectionStops ?? []).map((stop) =>
    (typeof stop === "string" ? stop : stop?.text ?? "").trim()).filter(Boolean);
  if (stops.length === 0) continue;
  const duplicated = allGuideEntries(guide).filter((entry) => stops.includes(entry.text.trim()));
  check(
    duplicated.length === 0,
    `${guide.routeKey}: no guide section duplicates a stop condition -- the renderer derives them from hearingAndObjectionStops${
      duplicated.length ? ` (${duplicated.length} duplicated)` : ""}`
  );
}

// What counts as a legal or procedural instruction. Used both to police the
// route data and to build the control fixtures below, so the fixtures cannot
// drift away from the rule they are proving.
const INSTRUCTION = /\b(file|serve|mail|deliver|submit|pay|sign|notari[sz]e|ask the clerk|must|shall|required|requires|deadline|within \d+|\d+ days?|do not|cannot|may not|entitled|statute|Sec\.|section \d|§)\b/i;

for (const guide of guides) {
  const where = guide.routeKey;

  check(guide.schemaVersion === "rcap-supplemental-guide/v1", `${where}: the guide states its schema`);

  const entries = allGuideEntries(guide);
  check(entries.length > 0, `${where}: the guide carries substance (${entries.length} entries)`);

  // Only a route that actually carried substance from an adopted artifact needs
  // to name its digest. Most routes have no legacy guidance page at all.
  const carriedFromAdopted = entries.some((entry) => entry.provenance?.kind === "adopted_artifact");
  check(
    !carriedFromAdopted || (typeof guide.adoptedDigest === "string" && /^[0-9a-f]{64}$/.test(guide.adoptedDigest)),
    `${where}: a guide carrying adopted text names the artifact digest it came from`
  );
  check(
    SUPPLEMENTAL_GUIDE_SECTIONS.every((section) => Array.isArray(guide[section.id])),
    `${where}: every one of the four sections is present, even where empty`
  );

  // Every entry declares a provenance kind from the contract's fixed set.
  const badKind = entries.filter((entry) => !GUIDE_PROVENANCE_KINDS.includes(entry.provenance?.kind));
  check(
    badKind.length === 0,
    `${where}: every guide entry declares a provenance kind the contract recognises${
      badKind.length ? ` (${badKind.length} do not)` : ""}`
  );

  // Anything but product copy has to say what supports it.
  const uncited = entries.filter((entry) =>
    entry.provenance?.kind !== "product_copy"
    && (typeof entry.provenance?.cite !== "string" || entry.provenance.cite.trim().length < 8));
  check(
    uncited.length === 0,
    `${where}: every entry beyond product copy cites its source${uncited.length ? ` (${uncited.length} do not)` : ""}`
  );

  // The invariant: no unsourced legal or procedural instruction. An entry that
  // tells the participant to do something, or states what the law requires,
  // cannot be carried by product copy — which by definition asserts nothing
  // about the law. This is a text test rather than a trusted label, because the
  // label is the thing most likely to be wrong.
  const unsupportedInstruction = entries.filter((entry) =>
    entry.provenance?.kind === "product_copy" && INSTRUCTION.test(entry.text));
  check(
    unsupportedInstruction.length === 0,
    `${where}: no legal or procedural instruction is carried as product copy${
      unsupportedInstruction.length ? `: "${unsupportedInstruction[0].text.slice(0, 70)}…"` : ""}`
  );

  // Nothing dropped: the component the guide supersedes must still be readable,
  // and every line of it must arrive somewhere.
  //
  // A route may keep its participant guidance on more than one page -- Georgia
  // has one per exhibit -- so the field is read as a list either way and every
  // named component is measured, not just the first.
  const supersededIds = superseded(guide);
  if (supersededIds.length > 0) {
    const specification = packetSpecificationFor(guide.routeKey);
    const components = supersededIds
      .map((id) => specification.documents.find((document) => document.documentId === id))
      .filter(Boolean);
    check(
      components.length === supersededIds.length,
      `${where}: every component this guide supersedes is still in the specification (${
        components.length}/${supersededIds.length})`
    );
    for (const component of components) {
      const adoptedLines = component.sections
        .flatMap((section) => String(section.body ?? "").split("\n"))
        .map((line) => line.trim())
        .filter(Boolean);
      const carried = new Set([
        ...entries.map((entry) => entry.text.trim()),
        ...(guide.carriedElsewhere ?? []).map((row) => row.text.trim()),
        // An edited line is accounted for by its RECORD, which names the
        // adopted original. Recorded, never inferred.
        ...(guide.editedFromAdopted ?? []).map((row) => row.adoptedText.trim())
      ]);
      const dropped = adoptedLines.filter((line) => !carried.has(line));
      check(
        dropped.length === 0,
        `${where}: every line of ${component.documentId} arrives somewhere${
          dropped.length ? ` (${dropped.length} dropped, first: "${dropped[0].slice(0, 60)}…")` : ""}`
      );
      const vagueEdits = (guide.editedFromAdopted ?? []).filter((row) =>
        !row.why || row.why.length < 40 || !row.supportMovedTo);
      check(
        vagueEdits.length === 0,
        `${where}: every edited adopted line says why and where its support went${
          vagueEdits.length ? ` (${vagueEdits.length} do not)` : ""}`
      );
      check(
        adoptedLines.length > 0 && carried.size >= adoptedLines.length,
        `${where}: ${component.documentId} has ${adoptedLines.length} adopted lines, ${carried.size} accounted for`
      );

      // The supersession is declared on the component too, so the packet side
      // cannot forget that this page is on its way out.
      check(
        component.supersededBy === "supplemental_guide",
        `${where}: the packet component records that the shared guide supersedes it`
      );
      check(
        typeof component.supersessionNote === "string" && component.supersessionNote.length > 40,
        `${where}: and says what happens to it when the guide ships`
      );
    }
  }

  /*
   * Participant text is for the participant.
   *
   * "The committed Wyoming record and the compiled Wyoming profile both state
   * this" describes our evidence chain; someone at the clerk's counter needs
   * the instruction, not the software's reasoning about where it came from.
   * Worse in translation: "committed record" became "registro comprometido",
   * which means nothing to a Spanish reader.
   *
   * The support does not disappear -- it belongs in `provenance.cite`, which is
   * exactly why this check looks only at what is drawn.
   */
  const INTERNAL_TERMS = /(committed (Wyoming )?record|compiled [A-Z][a-z]+ profile|compiled profile|legal-design record|registro comprometido|perfil compilado)/i;
  const internal = entries.filter((entry) =>
    INTERNAL_TERMS.test(entry.text) || INTERNAL_TERMS.test(entry.textEs ?? ""));
  check(
    internal.length === 0,
    `${where}: no participant-facing entry carries internal software or evidence terminology${
      internal.length ? `: "${internal[0].text.slice(0, 60)}…"` : ""}`
  );

  // Every diverted line says where it went and why. "Dropped" is not a
  // destination, and neither is silence.
  const vagueDiversions = (guide.carriedElsewhere ?? []).filter((row) =>
    !row.destination || !row.why || row.why.length < 25);
  check(
    vagueDiversions.length === 0,
    `${where}: every line carried out of the guide names its destination and the reason${
      vagueDiversions.length ? ` (${vagueDiversions.length} do not)` : ""}`
  );
}

/*
 * The provenance rule, proven in both directions on fixtures rather than by
 * mutating a real route's data.
 *
 * An invariant that only refuses is satisfied by refusing everything, and one
 * that only accepts is satisfied by accepting everything. So the two fixtures
 * carry the SAME sentence and differ in exactly one field: the provenance. An
 * earlier version used two different sentences while claiming they differed
 * only in provenance, which is not a controlled comparison -- a wording
 * difference could have carried the result.
 *
 * The sentence states a proposition Wyo. Stat. Ann. 7-13-1502(c) genuinely
 * carries: the prosecuting attorney, not the participant, notifies identifiable
 * victims after service on the prosecutor. It is deliberately the same
 * subsection the earlier bad example misused, put to the proposition it
 * actually supports, and it is newly authored rather than carried verbatim --
 * which is the whole point, since a source-backed new sentence has to pass.
 */
const CONTROL_SENTENCE =
  "The prosecuting attorney, not you, notifies any identifiable victims after you serve the petition.";

const instructionCarriedByProductCopy = {
  text: CONTROL_SENTENCE,
  provenance: { kind: "product_copy" }
};
const instructionProperlySourced = {
  text: CONTROL_SENTENCE,
  provenance: {
    kind: "authoritative_source",
    cite: "Wyo. Stat. Ann. 7-13-1502(c) — the prosecuting attorney must notify identifiable victims within thirty days after service upon the prosecutor; stated in the same terms on the adopted wy_fel_1502-set filing-instructions page, line 8"
  }
};

const carriesInstruction = (entry) => INSTRUCTION.test(entry.text);
const refusedAsProductCopy = (entry) => entry.provenance.kind === "product_copy" && carriesInstruction(entry);
const citesASource = (entry) =>
  entry.provenance.kind === "product_copy"
  || (typeof entry.provenance.cite === "string" && entry.provenance.cite.trim().length >= 8);

check(
  instructionCarriedByProductCopy.text === instructionProperlySourced.text
  && carriesInstruction(instructionProperlySourced),
  "control fixtures: one instruction, two provenances -- the pair differs in nothing else"
);
check(
  refusedAsProductCopy(instructionCarriedByProductCopy),
  "NEGATIVE control: the instruction carried as product copy is refused"
);
check(
  !refusedAsProductCopy(instructionProperlySourced) && citesASource(instructionProperlySourced),
  "POSITIVE control: the same instruction, cited to the source that supports it, is accepted"
);

/*
 * A NAMED REGRESSION, NOT A DEADLINE VALIDATOR.
 *
 * The defect this guards was one false sentence on one route: a participant
 * filing deadline asserted for WY 7-13-1502, which prescribes none.
 *
 * An earlier version of this guard banned "within 30 days" across every loaded
 * guide. That is far broader than the defect and would have become a false
 * gate, because thirty days is a real figure in this very statute and in
 * others. Wyoming alone carries three distinct clocks:
 *
 *   7-13-1502(c)      the prosecutor notifies identifiable victims within
 *                     THIRTY days after service upon the prosecutor;
 *   7-13-1502(e)-(f)  a NINETY-day objection window measured from that same
 *                     service, before which no expungement order may issue;
 *   7-13-1501(e)-(f)  the misdemeanour route's separate THIRTY-day objection
 *                     window.
 *
 * All three are legitimate and a guide may state any of them. What none of
 * them is, is a deadline by which the participant must file. So the guard is
 * scoped to the route and to the false proposition, and whether a stated
 * deadline is correct is a content-review question, not this file's.
 */
const KNOWN_FALSE_ASSERTIONS = [
  {
    routeKey: "WY:felony-conviction-expungement-w-s-7-13-1502",
    pattern: /\bfil(?:e|ing)\b[^.]{0,80}\bwithin\s+(?:\d+|thirty|sixty|ninety)\s+days/i,
    why: "7-13-1502 prescribes no deadline by which the participant must file. Its thirty-day clock is the prosecutor's victim notice under (c) and its ninety-day clock is the objection window under (e)-(f), both running from service on the prosecutor."
  }
];

for (const guard of KNOWN_FALSE_ASSERTIONS) {
  const guide = guides.find((candidate) => candidate.routeKey === guard.routeKey);
  if (!guide) continue;
  const offending = allGuideEntries(guide).filter((entry) => guard.pattern.test(entry.text));
  check(
    offending.length === 0,
    `${guard.routeKey}: no entry asserts a participant filing deadline${
      offending.length ? `: "${offending[0].text.slice(0, 70)}…"` : ""}`
  );
}

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
