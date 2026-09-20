#!/usr/bin/env node
/**
 * Apply the decision owner's returned batch adoption and his eight answers.
 *
 * The workbook went out asking one question over an exact list. It came back
 * with every one of the 53 families marked ADOPT, three distinct qualifications
 * on the notes, and an answer written against each of the eight questions the
 * exclusions reduced to. This turns that return into records the factory reads,
 * and it does so conservatively in one specific way: the adoption is recorded
 * with its stated limits, and every answer that WITHHOLDS something is applied,
 * while nothing here promotes any family.
 *
 * WHAT THE ADOPTION IS AND IS NOT. Fifty of the fifty-three carry the plain
 * note: adopted for the limited family-level legal-design purpose, with no
 * runtime, technical, visual, payment, sponsorship or production authority, and
 * any substantive legal change or shipping-artifact digest change requiring
 * re-review. Two are adopted as participant agency-application treatments and
 * expressly not as court petitions. One is adopted only for the composed
 * treatment named, and expressly not for the packet family that shares its
 * name, which is the sharpest thing in the return: the owner adopted a
 * treatment and refused the family beside it in the same sentence.
 *
 * WHY THE DIGEST CONDITION IS RECORDED PER FAMILY. "Any shipping-artifact
 * digest change requires re-review" is a condition the repository can actually
 * check, so each adopted family's current digests are written down here. An
 * adoption that named no bytes would silently cover a rebuild.
 *
 * WHAT THE EIGHT ANSWERS DO. Every one of them withholds. Four rule that the
 * current deliverable is the wrong thing (guidance stands, referral only,
 * records conflict) and become delivery-type refusals. Four rule that the
 * packet must change or be reconfirmed before it may ship, and become holds
 * with the exact correction named. None of them clears a family, so applying
 * them can only ever reduce what is sellable -- which is why they can be
 * applied here while the adoption itself grants nothing.
 *
 *   node scripts/grade-a-packet-factory-24h/apply-owner-batch-adoption.mjs \
 *     --decision /tmp/owner-decision.json
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const read = (rel) => JSON.parse(fs.readFileSync(path.isAbsolute(rel) ? rel : path.join(ROOT, rel), "utf8"));

const returned = read(arg("--decision", "/tmp/owner-decision.json"));
const master = read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const familyOf = new Map(master.families.map((f) => [f.familyId, f]));
const sha = (rel) => { try { return crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex"); } catch { return null; } };

const digestsOf = (familyId) => {
  const f = familyOf.get(familyId);
  if (!f?.directory) return [];
  const rel = `${f.directory}/reports/rendered-artifacts.json`;
  if (!fs.existsSync(path.join(ROOT, rel))) return [];
  try {
    return (read(rel).artifacts ?? read(rel).pdfs ?? [])
      .map((a) => ({ fixture: a.fixture ?? null, file: a.file ?? null, sha256: a.file ? sha(a.file) : null }));
  } catch { return []; }
};

/*
 * Which answers refuse the DELIVERABLE, and which hold the PACKET.
 *
 * The distinction decides what the state machine does with a family, so it is
 * taken from what each answer actually says rather than from its bucket. "The
 * guidance determination stands", "referral guidance only" and "guidance-only
 * governs" all say the packet is not the thing this route delivers — that is a
 * delivery-type refusal. "Do not publish an unconfirmed fee", "remove the
 * unsourced timing rule", "the required component must be built" and "no
 * adoption yet" all say the packet is the right shape and is not yet correct —
 * that is a hold with a named correction, and a repair lane can close it.
 */
const REFUSES_THE_DELIVERABLE = new Set([
  "Q1-route-treatment-guidance-or-packet",
  "Q2-composed-petition-or-attorney-referral",
  "Q8-records-disagree-on-whether-this-family-carries-a-filing-instrument"
]);
const CORRECTION_OF = {
  "Q3-official-form-supersedes-composed-instrument": "Resolve whether a mandatory official form governs this filing. If one is located it governs and the composed instrument is retained only as a legally appropriate cover or support document, or withdrawn. No commercial approval until form status is resolved.",
  "Q4-publishing-a-filing-fee-the-design-declines-to-publish": "Remove the published figure and carry the controlling design's own refusal, directing the participant to the specific clerk or agency for the current amount. A figure may be added only when current primary authority or the official form supports it.",
  "Q5-timing-rule-with-no-source-in-the-design": "Remove the unsourced timing rule from the participant deliverable. It may not appear until supported by controlling authority, and the family stays unapproved until corrected and independently re-verified.",
  "Q6-corrected-wait-anchor-and-gates-not-reconfirmed": "Obtain and record route-specific counsel reconfirmation of the corrected waiting period, anchor and gates. The family stays blocked and checkout disabled until that reconfirmation is recorded.",
  "Q7-required-component-deliberately-absent": "Build the component the family's own record declares required. The alternative is a new legal-design decision expressly removing or changing that requirement."
};

const adopted = returned.rows.filter((r) => String(r.decision).trim().toUpperCase() === "ADOPT");
const notAdopted = returned.rows.filter((r) => String(r.decision).trim().toUpperCase() !== "ADOPT");

const noteClasses = new Map();
for (const r of adopted) {
  if (!noteClasses.has(r.ownerNote)) noteClasses.set(r.ownerNote, []);
  noteClasses.get(r.ownerNote).push(r.familyId);
}

const decision = {
  schemaVersion: "rcap-owner-batch-adoption/v1",
  recordId: "OWN-ADOPT-2026-09-02-BATCH-53",
  decisionOwner: "Roger Roman",
  decidedOn: "2026-09-02",
  instrument: "the decision owner's returned batch-adoption workbook",
  requiresSignature: false,
  appliedBy: "scripts/grade-a-packet-factory-24h/apply-owner-batch-adoption.mjs",
  appliedAtCommit: (() => { try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return null; } })(),

  whatWasAsked: "One family-level owner adoption over an exact list of 53 proven families outside the August 2026 approval, each shipping a completed output faithful to a legal design already settled, on the ground that the difference from that approval's family list is which generator built the packet rather than anything about its legal treatment.",
  whatWasReturned: `All ${adopted.length} families marked ADOPT, under ${noteClasses.size} distinct qualifications, with an answer written against each of the ${returned.answers.length} open questions.`,

  adoption: {
    familiesAdopted: adopted.length,
    familiesNotAdopted: notAdopted.length,
    qualifications: [...noteClasses.entries()].map(([note, families]) => ({
      ownerNote: note,
      familyCount: families.length,
      families,
      digestConditionRecordedPerFamily: Object.fromEntries(families.map((f) => [f, digestsOf(f)]))
    }))
  },

  whatTheAdoptionGrants: [
    "The legal-design question for the adopted families, at family level, and nothing else."
  ],
  whatTheAdoptionExpresslyDoesNotGrant: [
    "runtime representation", "technical approval", "visual review",
    "payment eligibility", "sponsorship eligibility", "production authority"
  ],
  theConditionThatTravelsWithIt: "Any substantive legal change, or any change to a family's shipping-artifact digest, requires re-review. The digests as at this application are recorded per family above, so a rebuild is checkable rather than silent.",

  answers: returned.answers.map((a) => ({
    id: a.id,
    question: a.question,
    ownerDecision: a.ownerDecision,
    families: a.families,
    effect: REFUSES_THE_DELIVERABLE.has(a.id) ? "DELIVERY_TYPE_REFUSED" : "HELD_PENDING_A_NAMED_CORRECTION",
    correctionRequired: CORRECTION_OF[a.id] ?? null
  })),

  everyAnswerWithholds: "Not one of the eight answers clears a family. Four rule the current deliverable is not what the route delivers; four rule the packet must change or be reconfirmed before it may ship. So applying them can only reduce what is sellable, which is why they are applied here while the adoption itself grants nothing.",
  grantsNothing: "This record settles a legal-design question and applies the owner's withholdings. It opens no route, sets no price, and creates no commercial authority."
};

const OUT = "data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json";
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(decision, null, 2)}\n`);

/* The delivery-type refusals join the record the state machine already reads. */
const DT = "data/rcap-grade-a/legal-decisions/OWNER_DELIVERY_TYPE_DECISIONS.json";
const dt = read(DT);
const already = new Set(dt.decisions.map((d) => d.familyId));
let added = 0;
for (const a of decision.answers) {
  if (a.effect !== "DELIVERY_TYPE_REFUSED") continue;
  for (const familyId of a.families) {
    if (already.has(familyId)) continue;
    dt.decisions.push({
      decisionId: `OWN-DT-2026-09-02-${a.id}-${familyId}`.slice(0, 120),
      decidedOn: "2026-09-02",
      decisionOwner: "Roger Roman",
      familyId,
      refused: true,
      decision: a.ownerDecision,
      classification: "WRONG_DELIVERY_TYPE",
      fromQuestion: a.id,
      theQuestionAsked: a.question,
      consequences: [
        "removed from any route cohort",
        "not COMPLETE_PACKET_PROVEN; the family is WRONG_DELIVERY_TYPE",
        "commercially ineligible",
        "checkout stays disabled"
      ],
      whatWouldReopenIt: "A later route-specific owner or counsel approval expressly authorising packet delivery on this route. Nothing the factory measures reopens it."
    });
    added += 1;
  }
}
fs.writeFileSync(path.join(ROOT, DT), `${JSON.stringify(dt, null, 2)}\n`);

/*
 * The holds. Every answer that did not refuse the deliverable still withheld
 * approval, and each named what would lift it -- so these become holds with the
 * correction attached, not merely notes. A family here is not wrongly shaped;
 * it is the right shape and not yet correct, and a repair lane can close it.
 */
const CORR = "data/rcap-grade-a/legal-decisions/OWNER_CORRECTIONS_REQUIRED.json";
const corrections = {
  schemaVersion: "rcap-owner-corrections-required/v1",
  producedBy: "scripts/grade-a-packet-factory-24h/apply-owner-batch-adoption.mjs",
  fromDecision: decision.recordId,
  decidedOn: "2026-09-02",
  decisionOwner: "Roger Roman",
  whatThisIs: "Families the decision owner held pending a specific correction. Each is unapproved until the named correction is made and, where the owner said so, independently re-verified. The packet shape is not in question; its content or its confirmation is.",
  howItIsApplied: "generate.mjs reads this file and treats a live correction as an open legal input, so the family cannot be COMPLETE_PACKET_PROVEN and cannot enter a route cohort. Payment was already fail-closed and stays so.",
  liftedHow: "The named correction is made, the family is rebuilt, and an independent verifier who is neither its builder nor its repairer reads it again. Removing the entry without that is how an owner withholding gets lost.",
  corrections: decision.answers
    .filter((a) => a.effect === "HELD_PENDING_A_NAMED_CORRECTION")
    .flatMap((a) => a.families.map((familyId) => ({
      familyId,
      fromQuestion: a.id,
      theQuestionAsked: a.question,
      ownerDecision: a.ownerDecision,
      correctionRequired: a.correctionRequired,
      live: true
    })))
};
fs.writeFileSync(path.join(ROOT, CORR), `${JSON.stringify(corrections, null, 2)}\n`);

console.log(`wrote ${OUT}`);
console.log(`  ${corrections.corrections.length} famil(ies) held pending a named correction -> ${CORR}`);
console.log(`  adopted ${adopted.length} famil(ies) under ${noteClasses.size} qualification(s); ${notAdopted.length} not adopted`);
for (const q of decision.adoption.qualifications) console.log(`    ${String(q.familyCount).padStart(2)}  ${q.ownerNote.slice(0, 96)}…`);
console.log(`  ${decision.answers.filter((a) => a.effect === "DELIVERY_TYPE_REFUSED").length} answer(s) refuse the deliverable, ${decision.answers.filter((a) => a.effect !== "DELIVERY_TYPE_REFUSED").length} hold pending a named correction`);
console.log(`  ${added} famil(ies) added to ${DT}`);
