#!/usr/bin/env node
/**
 * South Dakota's escalation motion: obtainable, and only when it applies.
 *
 * THE DEFECT
 *
 * SDCL § 23A-27-17 ships an ordered pair. The written request goes in first;
 * the motion to enforce applies only if the record is still not corrected. The
 * motion was marked `conditional` with NO condition attached, and the planner
 * omits a conditional whose condition it cannot decide -- correctly, and from
 * every packet, permanently. The component composed and rendered perfectly and
 * no participant could ever receive it.
 *
 * Forcing it into a test packet proves the transcription renders. It proves
 * nothing about whether anyone can get it. This checks the selection instead:
 * the real planner, the real condition, the real answers.
 *
 * WHAT IT HOLDS
 *
 *   - unanswered is UNRESOLVED, not "no": the condition reports unevaluable and
 *     composition refuses rather than shipping a packet quietly missing it;
 *   - each answer selects what the recorded sequence says it should;
 *   - the guide's checklist agrees with the packet on every branch, because
 *     both read the same selected set;
 *   - the question is reachable on the participant's normal path;
 *   - it asks a FACT and never for a document.
 */
import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { planIncludedDocuments, composeGradeAPacket } = await import("../src/lib/rcap/grade-a/composer.ts");
const { renderGradeAPacketPdf, packetFilingDocuments } = await import("../src/lib/rcap/grade-a/renderer.ts");
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const SD = await import("../src/lib/rcap-engine/south-dakota-23a-27-17-escalation.ts");
const { guideDocuments } = await import("../src/lib/rcap/supplemental/guide-renderer.ts");

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

const specification = packetSpecificationFor(SD.SD_SIS_ROUTE_KEY);
const MOTION = "enforcement_motion";

const baseFacts = {
  participant_full_legal_name: "Tobias Fenwick Ashgrove",
  mailing_address: "1400 Quarry Lane, Rapid City, SD 57701",
  phone_number: "605-555-0433",
  email_address: "t.ashgrove@example.test"
};

const factsFor = (stage) => (stage ? { ...baseFacts, [SD.SD_SIS_STAGE_FACT_ID]: stage } : { ...baseFacts });

// ---------------------------------------------------- the condition is wired

const motion = specification.documents.find((document) => document.documentId === MOTION);
check(motion?.requirement === "conditional", "the escalation motion is still conditional, not promoted to required");
check(
  motion?.includeWhen === SD.SD_SIS_ESCALATION_CONDITION,
  `the motion names the recorded escalation condition (${motion?.includeWhen ?? "none"})`
);

// ------------------------------------------------- unanswered is unresolved

{
  const plan = planIncludedDocuments(specification, factsFor(null));
  check(
    !plan.included.some((document) => document.documentId === MOTION),
    "unanswered: the motion is not included"
  );
  check(
    plan.unevaluable.some((document) => document.documentId === MOTION),
    "unanswered: and the condition is reported UNEVALUABLE rather than silently decided as no"
  );
  let refused = null;
  try {
    composeGradeAPacket(specification, {
      routeKey: SD.SD_SIS_ROUTE_KEY, verificationHash: "sd-escalation-unanswered", facts: factsFor(null)
    }, {});
  } catch (error) { refused = error; }
  check(refused !== null, "unanswered: composition refuses rather than shipping an incomplete packet");
}

// ------------------------------------------------- each answer, end to end

const CASES = [
  { stage: SD.SD_SIS_STAGE_REQUEST_NOT_MADE, expectMotion: false, why: "the request has not been filed yet" },
  { stage: SD.SD_SIS_STAGE_RECORD_CORRECTED, expectMotion: false, why: "the record was corrected, so the motion does not apply" },
  { stage: SD.SD_SIS_STAGE_RECORD_NOT_CORRECTED, expectMotion: true, why: "the request was made and the record was not corrected" }
];

for (const { stage, expectMotion, why } of CASES) {
  const facts = factsFor(stage);
  const plan = planIncludedDocuments(specification, facts);
  const planned = plan.included.some((document) => document.documentId === MOTION);
  check(
    planned === expectMotion,
    `${stage}: the planner ${expectMotion ? "includes" : "omits"} the motion -- ${why}`
  );
  check(plan.unevaluable.length === 0, `${stage}: no condition is left unevaluable`);

  const packet = composeGradeAPacket(specification, {
    routeKey: SD.SD_SIS_ROUTE_KEY, verificationHash: `sd-escalation-${stage}`, facts
  }, {});
  const inPacket = packet.documents.some((document) => document.documentId === MOTION);
  check(inPacket === expectMotion, `${stage}: the composed packet agrees with the planner`);

  // The checklist and the packet read the same selected set, so they cannot
  // disagree about what the participant is holding.
  const listed = guideDocuments(packet).some((document) => document.documentId === MOTION);
  check(listed === expectMotion, `${stage}: the guide's document checklist agrees`);

  const filing = packetFilingDocuments(packet).some((document) => document.documentId === MOTION);
  check(filing === expectMotion, `${stage}: the court-only filing subset agrees`);

  const pdf = await renderGradeAPacketPdf(packet);
  check(pdf.length > 4000, `${stage}: the packet renders (${pdf.length} bytes, ${packet.documents.length} documents)`);
}

// --------------------------------------- reachable on the participant's path

{
  const profile = JSON.parse(fs.readFileSync(
    path.join(rootDir, "src/lib/rcap-engine/compiled/profiles/SD-south-dakota.json"), "utf8"));
  const question = profile.questions.find((candidate) => candidate.id === SD.SD_SIS_STAGE_FACT_ID);
  check(Boolean(question), "the question exists in the compiled South Dakota engine profile");
  if (question) {
    const stage = profile.flowStages.find((candidate) => candidate.id === question.stage);
    check(
      Boolean(stage) && stage.questionIds.includes(question.id),
      `and is sequenced into the "${question.stage}" stage the participant actually walks`
    );
    check(
      question.required === true,
      "and is required, so the branch cannot be left undecided by skipping it"
    );
    check(
      question.lifecyclePhase === "postpay_packet_field",
      "and is a packet field, not a route splitter -- the route and price are identical at either stage"
    );
    check(
      Array.isArray(question.options) && question.options.length === 3,
      `and offers all three stages of the recorded sequence (${question.options?.length ?? 0})`
    );
  }

  const frontend = JSON.parse(fs.readFileSync(
    path.join(rootDir, "src/lib/expungement-ai/frontend/profiles/all51.json"), "utf8"));
  const sd = Array.isArray(frontend)
    ? frontend.find((candidate) => candidate.jurisdiction?.code === "SD" || candidate.jurisdiction === "SD")
    : frontend.SD;
  const localized = sd?.questions?.find((candidate) => candidate.id === SD.SD_SIS_STAGE_FACT_ID);
  check(Boolean(localized?.translations?.es?.prompt), "the question carries Spanish on the participant surface");
  check(
    (localized?.options ?? []).every((option) => option.translations?.es),
    "and every one of its options does too"
  );
}

/*
 * It asks a fact, never a record.
 *
 * The controlling rule: a document Expungement.ai cannot produce is never a
 * condition of eligibility, completion, checkout, generation or delivery. The
 * tempting version of this question -- "do you have a copy of your written
 * request?" -- would have made an escalation instrument conditional on the
 * participant possessing paperwork. It asks what happened instead.
 */
{
  const text = [
    SD.SD_SIS_STAGE_QUESTION.prompt,
    SD.SD_SIS_STAGE_QUESTION.helperText,
    ...SD.SD_SIS_STAGE_QUESTION.options.map((option) => option.label)
  ].join(" ");
  const asksForARecord = /\b(upload|scan|attach|send us|provide a copy|do you have (a|your|the) (copy|document|paperwork|letter))\b/i;
  // Sentence by sentence, and a negated mention is not an ask: this question's
  // helper text says "You do not need to send us anything", which is the
  // reassurance, not the demand. A first version of this check read that as a
  // request for a document and reported the rule broken by the sentence
  // upholding it.
  const demands = text.split(/(?<=[.?!])\s+/)
    .filter((sentence) => asksForARecord.test(sentence))
    .filter((sentence) => !/\b(do not|don't|never|no need|not need|without)\b/i.test(sentence));
  check(
    demands.length === 0,
    `the question asks a fact about what happened, never for a document${
      demands.length ? `: "${demands[0].slice(0, 70)}"` : ""}`
  );
}

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
