import assert from "node:assert/strict";
import test from "node:test";
import { SPEC } from "./build-census-v1-ks-22-4908-registration-relief-set.mjs";

const instructions = JSON.stringify([
  SPEC.instructionsIntro, SPEC.obligationTable, SPEC.documentsToObtain, SPEC.steps,
]);
const guide = JSON.stringify(SPEC.guidance);

test("registration guidance states the held poverty-affidavit practice and preserves combined-fee uncertainty", () => {
  for (const text of [instructions, guide]) {
    assert.match(text, /K\.S\.A\. 60-2001 poverty affidavit practice applies to the civil docket fee by its own terms/);
    assert.match(text, /reach over the combined expungement fee is unresolved/);
  }
  assert.doesNotMatch(instructions, /Do not assume a single fee or a fee waiver/);
  assert.match(instructions, /confirm the current amount with the clerk/);
  assert.match(instructions, /\$176/);
});

test("both guidance surfaces recommend attorney review and explain the actual reasons", () => {
  for (const text of [instructions, guide]) {
    assert.match(text, /recommend attorney review before filing/);
    for (const reason of [
      "clear and convincing evidence", "county or district attorney is notified",
      "victims may be notified and may participate", "court may order a risk assessment",
    ]) assert.ok(text.includes(reason), reason);
  }
  assert.deepEqual(SPEC.routeGuards, { currentlyRequiredToRegister: true },
    "a recommendation does not add an attorney-review generation gate");
});

test("both guidance surfaces state the victim protection while preserving court-controlled notice", () => {
  for (const text of [instructions, guide]) {
    assert.match(text, /victim or the victim's family cannot be compelled to testify or to provide discovery to the offender/);
    assert.match(text, /court causes notice/);
  }
});

test("an ordered risk assessment ends self-help in the action sequence", () => {
  const step = SPEC.steps.find(text => text.includes("court orders a risk assessment"));
  assert.match(step, /stop self-help and get attorney help/);
  assert.doesNotMatch(step, /arrange and pay for it as directed/);
  assert.ok(SPEC.stopConditions.includes("The court orders a risk assessment."));
  assert.ok(SPEC.stopConditions.some(text => text.includes("immigration")));
  assert.ok(SPEC.stopConditions.some(text => text.includes("sex offender or violent offender")));
});
