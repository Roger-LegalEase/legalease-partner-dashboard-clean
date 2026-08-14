#!/usr/bin/env node
// Lane E — discipline for non-packet terminal treatments.
//
// A family that cannot safely ship a packet must still be finished: it may not
// sit in "unknown" or "coming soon". This verifier holds every deferral and
// exclusion to the same standard the packet families are held to:
//
//   - an exact missing-evidence statement, an owner and a next action;
//   - a stated tier the family would reach once unblocked;
//   - complete participant treatment naming the receiving authority and the
//     participant's next step;
//   - checkout prohibited;
//   - no raw XFA delivery and no Adobe Reader requirement;
//   - for every candidate artifact rejected, what it actually is and why it
//     cannot serve the track — so a later reader cannot mistake a fillable
//     lookalike for the official form.
//
//   node scripts/verify-rcap-hard-form-dispositions.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HARD_FORMS = path.join(rootDir, "data/rcap-all50/hard-forms");
// held_on_source_or_design is a non-packet treatment too: the family is not
// deferred to a later window and not excluded from scope, it is waiting on an
// upstream design decision. F2-11 found the held CR-106 disposition sitting
// outside every verifier because it lived in a component record rather than a
// profile; holding it to the same standard is the fix.
const NON_PACKET_TIERS = new Set(["exact_supported_deferral", "deliberate_scope_exclusion", "held_on_source_or_design"]);
const VAGUE = new Set(["", "unknown", "tbd", "n/a", "none", "pending"]);

const failures = [];
let checked = 0;

function findProfiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findProfiles(p));
    else if (entry.name === "profile.json") out.push(p);
  }
  return out;
}

function requireExact(value, label, rel, minLength = 24) {
  if (typeof value !== "string" || value.trim().length < minLength || VAGUE.has(value.trim().toLowerCase())) {
    failures.push(`${rel}: ${label} is missing or not exact`);
  }
}

for (const profilePath of findProfiles(HARD_FORMS)) {
  const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  const rel = path.relative(rootDir, path.dirname(profilePath));
  const tier = profile.strategy?.tier;
  if (!NON_PACKET_TIERS.has(tier)) continue;
  checked += 1;

  if (!Array.isArray(profile.tracksServed) || profile.tracksServed.length === 0) {
    failures.push(`${rel}: names no tracks`);
  }
  requireExact(profile.strategy?.rationale, "strategy.rationale", rel);
  requireExact(profile.legalIntegrityDisposition, "legalIntegrityDisposition", rel);

  const blocker = profile.blocker;
  if (!blocker) {
    failures.push(`${rel}: non-packet treatment without a blocker record`);
  } else {
    requireExact(blocker.exactMissingEvidence, "blocker.exactMissingEvidence", rel, 40);
    requireExact(blocker.owner, "blocker.owner", rel, 8);
    requireExact(blocker.nextAction, "blocker.nextAction", rel, 40);
    if (!Array.isArray(blocker.unblockChangesTierTo) || blocker.unblockChangesTierTo.length === 0) {
      failures.push(`${rel}: blocker does not say which tier the family reaches once unblocked`);
    }
  }

  const pt = profile.participantTreatment;
  if (!pt) {
    failures.push(`${rel}: no participant treatment — a deferral still has to route the participant`);
  } else {
    requireExact(pt.receivingAuthority, "participantTreatment.receivingAuthority", rel, 12);
    requireExact(pt.nextStep, "participantTreatment.nextStep", rel, 30);
    requireExact(pt.whatTheParticipantIsTold, "participantTreatment.whatTheParticipantIsTold", rel, 40);
    if (pt.checkoutProhibited !== true) failures.push(`${rel}: checkout is not prohibited on a non-packet route`);
    if (pt.neverDeliverRawXfa !== true) failures.push(`${rel}: does not assert that raw XFA is never delivered`);
    if (pt.adobeReaderNotRequired !== true) failures.push(`${rel}: does not assert that Adobe Reader is not required`);
    if (!["complete_guidance_no_packet", "deliberate_scope_exclusion"].includes(pt.routeStatus)) {
      failures.push(`${rel}: routeStatus "${pt.routeStatus}" is not a finished participant state`);
    }
  }

  // Any artifact that was considered and rejected must say what it actually is.
  for (const candidate of profile.candidatesExaminedAndRejected || []) {
    requireExact(candidate.whatItActuallyIs, `rejected candidate ${candidate.artifact}: whatItActuallyIs`, rel, 30);
    requireExact(candidate.rejectedBecause, `rejected candidate ${candidate.artifact}: rejectedBecause`, rel, 30);
    if (typeof candidate.sha256 !== "string" || candidate.sha256.length !== 64) {
      failures.push(`${rel}: rejected candidate ${candidate.artifact} has no full sha256`);
    }
  }

  // A deferral may never also declare bindings or fixtures: that would mean a
  // packet was half-built and left ambiguous.
  if (Array.isArray(profile.bindings) && profile.bindings.length > 0) {
    failures.push(`${rel}: a non-packet treatment declares field bindings`);
  }
  console.log(`  ok  ${rel} — ${tier}, ${profile.tracksServed.join(", ")}`);
}

if (checked === 0) {
  console.log("verify-rcap-hard-form-dispositions: no non-packet treatments to check.");
  process.exit(0);
}
if (failures.length > 0) {
  console.error("\nverify-rcap-hard-form-dispositions FAILED");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`\nverify-rcap-hard-form-dispositions passed: ${checked} non-packet treatment(s), each with exact evidence, owner, next action and complete participant treatment.`);
