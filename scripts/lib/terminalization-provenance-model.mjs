/**
 * The provenance state model for terminalization records.
 *
 * A terminalization artifact records, in its provenance block, the compiled
 * profile it was reviewed against and the sha256 of that profile's bytes on
 * the review date. Until now the control asked one question of that pin —
 * does it equal the current digest — and that question conflates two
 * different things:
 *
 *   "this review was performed against the bytes that ship", and
 *   "this review was performed against earlier bytes, and the later delta
 *    has itself been examined and dispositioned".
 *
 * Both can be honest. Only the first was expressible, so a profile moving
 * for any reason left the record with no way to be truthful and pass. The
 * pressure that creates is to move the pin, which converts a review into a
 * digest. This module makes the second state expressible instead.
 *
 * A record satisfies the control through exactly one of:
 *
 *   CURRENT_PIN
 *     the reviewed digest equals the current profile digest.
 *
 *   SUPERSEDED_PIN_WITH_RECORDED_DELTA
 *     the reviewed digest is preserved, the current digest differs, the exact
 *     old -> new delta is recorded, and the delta carries a disposition that
 *     is itself satisfied.
 *
 * Anything else is UNSUPERSEDED_DRIFT and is refused. No record inherits a
 * review over bytes that did not exist when the review occurred.
 *
 * The machine decides what moved. It does not decide what that means: the
 * disposition is an owner record. What the machine does enforce is that a
 * disposition of NO_SUBSTANTIVE_CHANGE cannot be recorded over a delta that
 * demonstrably touches an operative dimension.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const git = (root, ...args) => execFileSync("git", args, { cwd: root, maxBuffer: 1 << 30 });

/** Every leaf of a JSON document, addressed by path. */
export function leaves(value, prefix = "", out = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of Object.keys(value)) leaves(value[key], prefix ? `${prefix}.${key}` : key, out);
  } else if (Array.isArray(value)) {
    value.forEach((entry, index) => leaves(entry, `${prefix}[${index}]`, out));
  } else {
    out[prefix] = value;
  }
  return out;
}

/**
 * The dimensions a change may not quietly touch. A delta that moves any of
 * these cannot be dispositioned NO_SUBSTANTIVE_CHANGE, because each of them
 * can change what a participant is told, what they are asked, what they
 * receive, or what they are charged.
 */
export const PROTECTED_DIMENSIONS = {
  eligibility: [/ruleClauses/, /orderedDecisionRules\[\d+\]\.when/, /triggerFields/, /completionRules/],
  exclusions: [/exclusionRules/, /\.exclusions\[/],
  waitingPeriods: [/waitingRules/],
  triggerDates: [/effectiveFrom/, /timing\.(kind|anchorText)/],
  filingActor: [/\.automatic$/, /filingRequired/, /routeType/, /\.stage$/, /serviceBranches/],
  filingDestination: [/deliveryGates/, /filingLocation/],
  requiredFacts: [/requiredFacts/, /screeningFactIds/],
  packetComponents: [/packetComponents/, /^packetGenerator/],
  paymentEligibility: [/paymentAuthority/, /commercialPosture/, /payment_allowed/, /packet_capable/, /creditConsum/],
  routeIdentity: [
    /^pathways\[\d+\]\.id$/,
    /pathwayId/,
    /trackId/,
    /ruleId/,
    /^orderedDecisionRules\[\d+\]\.id$/,
    /candidatePathwayIds/
  ],
  remedyIdentity: [/mechanism/, /outcomeMode/, /^pathways\[\d+\]\.(label|summary)$/],
  legalAuthority: [/legalAuthority/, /statute/, /decisionId/, /sourceRef/, /sourceEvidenceRefs/, /lawrenceRatification/],
  participantFacingConclusion: [/suggestedResultCode/, /frontendBranch/, /frontendAction/, /\.notes?$/]
};

/**
 * Leaves that carry no operative meaning. This list is deliberately short and
 * each entry has to earn its place, because every entry is permission to
 * supersede a review without redoing it.
 *
 * Note what is NOT here: the sha256 or byte length of a SOURCE document. When
 * a form's digest moves, the form moved — WV's SCA-C903 went from 112484 to
 * 23275 bytes under a path change that reads like a relocation, and treating
 * a source digest as metadata would have superseded a review of one document
 * with a different document. Only digests describing the record's own
 * provenance are non-operative here.
 */
export const NON_OPERATIVE = [
  { pattern: /^provenance\./, why: "the record's own provenance block, not the profile's operative content" },
  { pattern: /^schemaVersion$/, why: "the document's schema label" },
  { pattern: /^generatedBy$/, why: "the name of the generator that wrote the document" },
  { pattern: /^generatedAt$/, why: "generation timestamp" },
  { pattern: /^compiledAt$/, why: "compilation timestamp" },
  { pattern: /^source\.(compiledAt|generatedAt)$/, why: "compilation timestamps on the source block" }
];

/** The protected dimensions a single leaf path touches; empty means non-operative. */
export function classifyLeaf(leafPath) {
  if (NON_OPERATIVE.some((entry) => entry.pattern.test(leafPath))) return [];
  const hits = [];
  for (const [dimension, patterns] of Object.entries(PROTECTED_DIMENSIONS)) {
    if (patterns.some((pattern) => pattern.test(leafPath))) hits.push(dimension);
  }
  // A leaf nobody claims is treated as operative. The alternative — assuming
  // an unrecognised path is harmless — is the assumption that lets a review
  // be superseded by something nobody looked at.
  return hits.length > 0 ? hits : ["unclassified_operative"];
}

/** Every terminalization artifact that pins a compiled profile, with its pin. */
export function collectPins({ root }) {
  const base = path.join(root, "data/rcap-all50");
  const pins = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile() && entry.name.endsWith(".json")) {
        let doc;
        try {
          doc = JSON.parse(fs.readFileSync(abs, "utf8"));
        } catch {
          continue;
        }
        const provenance = doc?.provenance;
        if (!provenance?.profilePath) continue;
        // Two corpora pin the same thing under two names: the controlled
        // pleadings and composed routes C1 verifies use profileSha256, the
        // terminalization treatments C2 verifies use fingerprint. They are
        // the same fact and the same failure, so one mechanism covers both
        // rather than the second corpus growing a parallel one.
        const field = provenance.profileSha256 ? "profileSha256" : provenance.fingerprint ? "fingerprint" : null;
        if (!field) continue;
        const profileAbs = path.join(root, provenance.profilePath);
        if (!fs.existsSync(profileAbs)) continue;
        pins.push({
          record: path.relative(root, abs).split(path.sep).join("/"),
          pinField: field,
          profilePath: provenance.profilePath,
          reviewedSha256: provenance[field],
          reviewedAsOf: provenance.reviewedAsOf ?? null,
          currentSha256: sha256(fs.readFileSync(profileAbs))
        });
      }
    }
  };
  walk(base);
  return pins.sort((a, b) => a.record.localeCompare(b.record));
}

/** The commit whose bytes are the reviewed digest, and the commit that moved them. */
export function locateReviewedBytes({ root, profilePath, reviewedSha256 }) {
  const log = git(root, "log", "--format=%H%x09%ad%x09%s", "--date=short", "--", profilePath)
    .toString("utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [commit, date, ...subject] = line.split("\t");
      return { commit, date, subject: subject.join("\t") };
    });
  for (let i = 0; i < log.length; i += 1) {
    let digest;
    try {
      digest = sha256(git(root, "show", `${log[i].commit}:${profilePath}`));
    } catch {
      continue;
    }
    if (digest === reviewedSha256) {
      return { reviewedBytesCurrentAt: log[i], movedBy: i > 0 ? log[i - 1] : null };
    }
  }
  return { reviewedBytesCurrentAt: null, movedBy: null };
}

/**
 * The exact delta from the reviewed bytes to the bytes that ship, plus the
 * measure of whether the earlier review can still be isolated: a delta that
 * only adds routes leaves the reviewed routes' conclusions standing, while a
 * delta that rewrites most of what was reviewed does not.
 */
export function measureDelta({ root, profilePath, reviewedBytesCurrentAt }) {
  if (!reviewedBytesCurrentAt) return null;
  const before = JSON.parse(git(root, "show", `${reviewedBytesCurrentAt.commit}:${profilePath}`).toString("utf8"));
  const after = JSON.parse(fs.readFileSync(path.join(root, profilePath), "utf8"));

  const a = leaves(before);
  const b = leaves(after);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const added = [];
  const removed = [];
  const changed = [];
  const dimensions = new Set();
  let operativeLeaves = 0;
  for (const key of keys) {
    const inA = key in a;
    const inB = key in b;
    if (inA && inB && a[key] === b[key]) continue;
    if (!inA) added.push(key);
    else if (!inB) removed.push(key);
    else changed.push(key);
    const hits = classifyLeaf(key);
    if (hits.length > 0) {
      operativeLeaves += 1;
      for (const hit of hits) dimensions.add(hit);
    }
  }

  const byId = (doc) => new Map((doc.pathways ?? []).map((p) => [p.id, p]));
  const A = byId(before);
  const B = byId(after);
  const disturbed = [];
  for (const [id, pathwayA] of A) {
    const pathwayB = B.get(id);
    if (!pathwayB) continue;
    const la = leaves(pathwayA);
    const lb = leaves(pathwayB);
    const pathwayKeys = new Set([...Object.keys(la), ...Object.keys(lb)]);
    let moved = 0;
    for (const key of pathwayKeys) {
      if (!(key in la) || !(key in lb) || la[key] !== lb[key]) moved += 1;
    }
    if (moved > 0) disturbed.push({ pathwayId: id, leavesMoved: moved });
  }
  const stripPathways = (doc) => {
    const copy = JSON.parse(JSON.stringify(doc));
    delete copy.pathways;
    return copy;
  };
  const outsideA = leaves(stripPathways(before));
  const outsideB = leaves(stripPathways(after));
  const outsideKeys = new Set([...Object.keys(outsideA), ...Object.keys(outsideB)]);
  let leavesOutsidePathways = 0;
  for (const key of outsideKeys) {
    if (!(key in outsideA) || !(key in outsideB) || outsideA[key] !== outsideB[key]) leavesOutsidePathways += 1;
  }

  const totalMoved = added.length + removed.length + changed.length;
  return {
    counts: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      totalMoved,
      operativeLeaves,
      nonOperativeLeaves: totalMoved - operativeLeaves
    },
    dimensionsTouched: [...dimensions].sort(),
    changedPaths: { added, removed, changed },
    isolation: {
      pathwaysAtReview: A.size,
      pathwaysNow: B.size,
      pathwaysGained: [...B.keys()].filter((id) => !A.has(id)).sort(),
      pathwaysLost: [...A.keys()].filter((id) => !B.has(id)).sort(),
      reviewedPathwaysDisturbed: disturbed.sort((x, y) => x.pathwayId.localeCompare(y.pathwayId)),
      reviewedPathwaysDisturbedFraction: A.size === 0 ? 0 : Number((disturbed.length / A.size).toFixed(4)),
      leavesOutsidePathways
    }
  };
}

/**
 * Every time a record's provenance digest changed in committed history, with
 * the commit that changed it and whether the review date moved with it.
 *
 * This is the movement the supersession mechanism exists to replace, and it
 * has to be measurable because it already happened: four commits in August
 * 2026 moved pins across the corpus, none of them moving reviewedAsOf, and
 * one of them says so in its subject line. Those events are history and stay
 * history. What they must not be is invisible — a record whose pin has been
 * moved before is a record whose pinned digest is not reliably the digest the
 * review saw, and whoever dispositions the delta needs to know that.
 */
export function repinHistory({ root, record }) {
  const commits = git(root, "log", "--format=%H%x09%ad%x09%s", "--date=short", "--", record)
    .toString("utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .reverse();
  const events = [];
  let previous = null;
  let original = null;
  for (const line of commits) {
    const [commit, date, ...subjectParts] = line.split("\t");
    let doc;
    try {
      doc = JSON.parse(git(root, "show", `${commit}:${record}`).toString("utf8"));
    } catch {
      continue;
    }
    const digest = doc?.provenance?.profileSha256 ?? doc?.provenance?.fingerprint;
    const reviewedAsOf = doc?.provenance?.reviewedAsOf ?? null;
    if (!digest) continue;
    if (original === null) original = { digest, reviewedAsOf, commit, date };
    if (previous && previous.digest !== digest) {
      events.push({
        commit,
        date,
        subject: subjectParts.join("\t"),
        fromSha256: previous.digest,
        toSha256: digest,
        reviewedAsOfMovedWithIt: previous.reviewedAsOf !== reviewedAsOf,
        reviewedAsOfBefore: previous.reviewedAsOf,
        reviewedAsOfAfter: reviewedAsOf
      });
    }
    previous = { digest, reviewedAsOf };
  }
  return { original, events };
}

export const DISPOSITIONS = ["NO_SUBSTANTIVE_CHANGE", "TARGETED_REREVIEW_REQUIRED", "FULL_REREVIEW_REQUIRED"];

/**
 * Whether a supersession record actually discharges the drift it describes,
 * and why not when it does not. This is the single place the two-state model
 * is decided, so the C1 verifier and the supersession verifier cannot drift
 * apart on what "satisfied" means.
 */
export function evaluateSupersession({ pin, supersession }) {
  if (!supersession) {
    return { state: "UNSUPERSEDED_DRIFT", satisfied: false, reason: "no supersession record covers this drifted pin" };
  }
  const problems = [];
  if (supersession.reviewedSha256 !== pin.reviewedSha256) {
    problems.push(
      `the supersession records reviewed digest ${String(supersession.reviewedSha256).slice(0, 12)}, the record was reviewed against ${pin.reviewedSha256.slice(0, 12)}`
    );
  }
  if (supersession.currentSha256 !== pin.currentSha256) {
    problems.push(
      `the supersession records current digest ${String(supersession.currentSha256).slice(0, 12)}, the profile now hashes to ${pin.currentSha256.slice(0, 12)}`
    );
  }
  if (pin.reviewedAsOf && supersession.reviewedAsOf && supersession.reviewedAsOf !== pin.reviewedAsOf) {
    problems.push(`the supersession restates reviewedAsOf as ${supersession.reviewedAsOf}, the record says ${pin.reviewedAsOf}`);
  }
  if (!supersession.delta || typeof supersession.delta.counts?.totalMoved !== "number") {
    problems.push("the supersession does not record the delta");
  }

  const disposition = supersession.disposition;
  if (!disposition || !disposition.bucket) {
    return {
      state: "SUPERSEDED_PIN_AWAITING_DISPOSITION",
      satisfied: false,
      reason: problems[0] ?? "the delta is recorded but carries no disposition",
      problems
    };
  }
  if (!DISPOSITIONS.includes(disposition.bucket)) {
    problems.push(`disposition bucket ${JSON.stringify(disposition.bucket)} is not one of ${DISPOSITIONS.join(", ")}`);
  }
  if (!String(disposition.recordedBy ?? "").trim()) problems.push("the disposition names nobody who recorded it");
  if (!String(disposition.recordedOn ?? "").trim()) problems.push("the disposition carries no date");
  if (!String(disposition.rationale ?? "").trim()) problems.push("the disposition carries no rationale");

  if (disposition.bucket === "NO_SUBSTANTIVE_CHANGE") {
    const touched = supersession.delta?.dimensionsTouched ?? [];
    if (touched.length > 0) {
      problems.push(
        `disposed NO_SUBSTANTIVE_CHANGE, but the delta moves ${touched.join(", ")}`
      );
    }
    if (!String(disposition.immaterialityDetermination ?? "").trim()) {
      problems.push("NO_SUBSTANTIVE_CHANGE without a recorded immateriality determination");
    }
  } else {
    const review = disposition.reviewRecord;
    if (!review?.path) {
      problems.push(`${disposition.bucket} without a review record`);
    } else if (!review.sha256) {
      problems.push(`${disposition.bucket} names a review record with no digest`);
    }
  }

  if (problems.length > 0) {
    return { state: "SUPERSEDED_PIN_WITH_RECORDED_DELTA", satisfied: false, reason: problems[0], problems };
  }
  return { state: "SUPERSEDED_PIN_WITH_RECORDED_DELTA", satisfied: true, reason: null, problems: [] };
}

/** The provenance state of one record, under the two-state model. */
export function provenanceState({ pin, supersessionsByKey }) {
  if (pin.reviewedSha256 === pin.currentSha256) {
    return { state: "CURRENT_PIN", satisfied: true, reason: null };
  }
  const key = `${pin.profilePath}|${pin.reviewedSha256}`;
  return evaluateSupersession({ pin, supersession: supersessionsByKey.get(key) });
}

/** Load the supersession record, keyed the way provenanceState looks it up. */
export function loadSupersessions({ root, relPath = "data/rcap-all50/terminalization-provenance-supersessions.json" }) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) return { document: null, byKey: new Map() };
  const document = JSON.parse(fs.readFileSync(abs, "utf8"));
  const byKey = new Map();
  for (const entry of document.supersessions ?? []) {
    byKey.set(`${entry.profilePath}|${entry.reviewedSha256}`, entry);
  }
  return { document, byKey };
}
