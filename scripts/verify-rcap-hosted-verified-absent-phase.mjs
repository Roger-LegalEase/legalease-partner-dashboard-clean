#!/usr/bin/env node
// The narrow verified-absence phase stops where it says it stops.
//
// `HOSTED_PAYMENT_PHASE=verified_absent_session` runs the payment harness on the
// verified-account Preview to earn exactly one verdict:
// `resumed_checkout_replaces_a_verified_absent_stored_session`. Everything after
// that in the harness belongs to the full matrix — case (a) reuses the Session
// this phase just replaced, case (b) needs a deployment with NO expected Stripe
// account (the opposite of the one this phase runs on), and section 4b drives
// Stripe's hosted page in a browser and BUYS THE PACKET.
//
// A narrow phase that wandered into section 4b would not merely record evidence
// it had no business recording; it would put a card through Stripe on a run
// nobody authorized to purchase anything. So the boundary is asserted here
// rather than assumed, and it is asserted two ways:
//
//   * structurally — the narrow branch's last statement is `finish()`, and the
//     branch closes before the 4b marker; and
//   * behaviourally — the harness's REAL `finish` function is executed in a
//     sandbox and observed to terminate the process rather than return.
//
// Structure alone would prove only that the call is written. Termination alone
// would prove only that the call works. Together they prove the statements
// after it are unreachable.
//
// Nothing here contacts Vercel, Supabase or Stripe.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HARNESS = "scripts/rcap-hosted-acceptance-payment.mjs";
const source = fs.readFileSync(path.join(rootDir, HARNESS), "utf8");

let passed = 0;
const check = (condition, label) => {
  assert.ok(condition, `FAILED: ${label}`);
  console.log(`ok   ${label}`);
  passed += 1;
};

/**
 * The body of a delimited block, found by matching delimiters rather than by
 * guessing where it ends. The opener's own last character chooses the pair, so
 * an array literal is matched with brackets and a function body with braces.
 */
const PAIRS = { "{": "}", "[": "]" };
function blockAfter(text, opener) {
  const start = text.indexOf(opener);
  assert.notEqual(start, -1, `could not find ${JSON.stringify(opener)} in ${HARNESS}`);
  const open = opener.trimEnd().at(-1);
  const close = PAIRS[open];
  assert.ok(close, `${JSON.stringify(opener)} does not end in an opening delimiter`);
  let depth = 0;
  for (let i = start + opener.trimEnd().length - 1; i < text.length; i += 1) {
    if (text[i] === open) depth += 1;
    else if (text[i] === close) {
      depth -= 1;
      if (depth === 0) return { body: text.slice(start, i + 1), start, end: i + 1 };
    }
  }
  throw new Error(`unbalanced ${open}${close} after ${JSON.stringify(opener)}`);
}

const CASE_ID = "resumed_checkout_replaces_a_verified_absent_stored_session";
const PURCHASE_MARKER = "// --- 4b. The customer actually pays";

// --- the phase selector exists and is closed ----------------------------------
check(
  source.includes('const PAYMENT_PHASE = (process.env.HOSTED_PAYMENT_PHASE ?? "").trim() || "full";')
    && source.includes('if (!["full", "verified_absent_session"].includes(PAYMENT_PHASE)) {')
    && source.includes('const NARROW_VERIFIED_ABSENCE = PAYMENT_PHASE === "verified_absent_session";'),
  "the phase is chosen from a closed set, so an unknown value cannot silently run the full matrix"
);
check(
  source.includes("const REQUIRED_CASES = NARROW_VERIFIED_ABSENCE ? NARROW_REQUIRED_CASES : FULL_REQUIRED_CASES;"),
  "each phase is gated on its own required-case list"
);

{
  const narrowList = blockAfter(source, "const NARROW_REQUIRED_CASES = [").body;
  const fullList = blockAfter(source, "const FULL_REQUIRED_CASES = [").body;
  check(narrowList.includes(`"${CASE_ID}"`), "the narrow phase requires the verified-absence case");
  check(
    !fullList.includes(`"${CASE_ID}"`),
    "the full matrix does NOT require it: the ordinary Preview configures no expected Stripe account, so absence cannot be concluded there and the case could only ever fail"
  );
  check(
    fullList.includes('"resumed_checkout_refuses_an_unresolvable_stored_session_it_cannot_verify"')
      && !narrowList.includes('"resumed_checkout_refuses_an_unresolvable_stored_session_it_cannot_verify"'),
    "the refusal half stays with the full matrix, where the deployment genuinely cannot verify an account"
  );
}

// --- the narrow branch ends in a terminator ------------------------------------
const narrow = blockAfter(source, "  if (NARROW_VERIFIED_ABSENCE) {");
const purchaseAt = source.indexOf(PURCHASE_MARKER);
check(purchaseAt !== -1, "the purchase section is locatable");

{
  const statements = narrow.body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//") && line !== "}");
  check(
    statements.at(-1) === "finish();",
    `the narrow branch's last statement is the terminator (found ${JSON.stringify(statements.at(-1))})`
  );
  check(
    narrow.end < purchaseAt,
    "the narrow branch closes before the purchase section, so its terminator runs first"
  );
}

// --- it puts back what it disturbed, before it terminates -----------------------
{
  const body = narrow.body;
  const at = (needle) => {
    const i = body.indexOf(needle);
    assert.notEqual(i, -1, `FAILED: the narrow branch does not ${JSON.stringify(needle)}`);
    return i;
  };
  const verdict = at(`record(\n      "${CASE_ID}"`);
  // Specifically the REPLACEMENT's expiry. The branch also expires this run's
  // original Session before planting, so an unanchored search would find that
  // one and the ordering below would prove nothing.
  const expire = at("checkout/sessions/${encodeURIComponent(replacementId)}/expire");
  const consumption = at("delete from public.consumer_packet_payment_consumption where consumer_briefcase_item_id");
  const verifications = at("delete from public.consumer_packet_verifications where briefcase_item_id");
  const item = at("delete from public.consumer_briefcase_items where id");
  const terminator = at("\n    finish();");

  check(
    verdict < expire,
    "the verdict is recorded BEFORE the replacement Session is expired — it asserts the Session is open, so expiring first would erase the evidence it rests on"
  );
  check(
    body.includes('replacementSession?.status === "open"') && body.includes("replacementExpired = (await stripeSession(replacementId))?.status ?? null;"),
    "the replacement is expired only when Stripe still reports it open, and the expiry is read back rather than assumed"
  );
  check(
    consumption < verifications && verifications < item,
    "the matter is cleaned up in reference order: consumption rows, then the persisted verification, then the item they point at"
  );
  check(
    expire < consumption && item < terminator,
    "every teardown step runs before the terminator, so none of it is left to a section that will never execute"
  );
  // Exactly one, counted over code rather than prose: the branch's own comment
  // names finish() too. A second, earlier call would satisfy every ordering
  // check above -- the last statement would still be the terminator -- while
  // actually exiting before the teardown ran.
  const calls = (body
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
    .match(/\bfinish\(\)/g) ?? []).length;
  check(calls === 1, `the narrow branch terminates once and only once (found ${calls})`);
  check(
    body.includes("evidence.resumedVerifiedAbsence.cleanup") && body.includes("evidence.narrowPhase"),
    "the teardown and the reason for stopping are written into the evidence, not merely performed"
  );
  check(
    body.indexOf("evidence.narrowPhase") < terminator,
    "the evidence is written before finish() consumes it"
  );
}

// --- nothing between the terminator and the purchase can run in this phase ------
{
  const between = source.slice(narrow.end, purchaseAt);
  // Every remaining case block in section 4a is independently guarded. The
  // terminator already makes them unreachable; these guards mean a future edit
  // that moves or removes the terminator still cannot run a full-matrix case on
  // the narrow Preview by accident.
  const blocks = [...between.matchAll(/^ {2}(?:if \(([^)]*)\) \{|\{)$/gm)].map((m) => m[1] ?? null);
  check(
    blocks.length > 0 && blocks.every((guard) => guard !== null && guard.includes("!NARROW_VERIFIED_ABSENCE")),
    `every case block after the narrow branch is guarded by !NARROW_VERIFIED_ABSENCE (found ${JSON.stringify(blocks)})`
  );
  check(
    !/\bcompleteHostedCheckout\(/.test(between),
    "nothing between the terminator and the purchase section drives Stripe's hosted page"
  );
}
check(
  source.indexOf("completeHostedCheckout({") > purchaseAt,
  "the only place a card is put through Stripe is inside the purchase section, after the boundary"
);

// --- BEHAVIOUR: the harness's real finish() terminates rather than returns -------
//
// The function is not described here, it is executed. Everything it needs is a
// stand-in except the function itself, which is the harness's own bytes.
{
  const finishSource = blockAfter(source, "function finish() {").body;
  check(finishSource.includes("process.exit("), "finish() reaches process.exit");

  const writes = [];
  const exits = [];
  const EXITED = Symbol("exited");
  const context = {
    evidence: { },
    JURISDICTION_SCOPE: {},
    REQUIRED_CASES: [CASE_ID],
    verdicts: new Map([[CASE_ID, { passed: true, observed: "synthetic" }]]),
    fs: { writeFileSync: (file, body) => writes.push({ file, body }) },
    path,
    EVIDENCE_DIR: "/dev/null/evidence",
    PROJECT_REF: "synthetic",
    PREVIEW: "https://synthetic.invalid",
    console: { log() {}, error() {} },
    process: {
      exit: (code) => {
        exits.push(code);
        // A real process.exit does not return. Modelling it as one that does
        // would let this check pass for a finish() that falls through.
        throw EXITED;
      }
    }
  };
  vm.createContext(context);
  let threw = null;
  try {
    vm.runInContext(`${finishSource}\nfinish();`, context);
  } catch (error) {
    threw = error;
  }
  check(threw === EXITED, "calling the harness's own finish() does not return — it exits the process");
  check(exits.length === 1 && exits[0] === 0, `finish() exits once, with 0 for a complete pass (got ${JSON.stringify(exits)})`);
  check(writes.length === 1 && writes[0].file.endsWith("payment.json"), "finish() writes the evidence bundle before exiting");
  check(
    JSON.parse(writes[0].body).cases?.[CASE_ID]?.passed === true,
    "the evidence it writes carries the narrow phase's verdict"
  );

  // And it exits NON-zero when the narrow verdict is missing, so a phase that
  // terminated without earning its case cannot be read as a pass.
  const missing = { ...context, verdicts: new Map(), evidence: {} };
  vm.createContext(missing);
  let missingThrew = null;
  try {
    vm.runInContext(`${finishSource}\nfinish();`, missing);
  } catch (error) {
    missingThrew = error;
  }
  check(
    missingThrew === EXITED && exits.at(-1) === 1,
    "a narrow run that never earned the case exits non-zero"
  );
}

console.log(`verify-rcap-hosted-verified-absent-phase passed: ${passed}/${passed}`);
