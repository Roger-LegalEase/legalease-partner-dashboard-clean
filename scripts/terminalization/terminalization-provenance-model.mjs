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
 * Where a required re-review has got to.
 *
 * Exactly one of these satisfies a control, and it is the narrow one:
 * approved_current_bytes, bound to the exact digests in scope. The other four
 * exist so that "not done" can be said precisely instead of by omission —
 * a unit nobody has started and a unit counsel sent back with corrections
 * are both unsatisfied, and they are not the same situation.
 *
 * hold_correction_required is the one that matters most to get right. A
 * reviewer who finds a profile wrong must be able to say so without that
 * reading as a failure to deliver. The correct next step there is to fix the
 * profile, which moves the current digest, which retires this unit and opens
 * a new one against the corrected bytes — and that is superseded_by_new_profile.
 */
export const REVIEW_STATUSES = {
  not_started: { satisfies: false, why: "the review this disposition requires has not begun" },
  in_review: { satisfies: false, why: "the review is under way" },
  approved_current_bytes: { satisfies: true, why: "a reviewer approved the current bytes for the scope in question" },
  hold_correction_required: {
    satisfies: false,
    why: "a reviewer examined the current bytes and held them: a correction is required before they can be approved"
  },
  superseded_by_new_profile: {
    satisfies: false,
    why: "the profile moved after this unit was opened, so this unit is retired and a new one covers the corrected bytes"
  }
};

/**
 * The digest a re-review must start from.
 *
 * Normally that is the digest the record pins. Where the pin was itself
 * installed by one of the unrecorded August re-pins, it is the digest the
 * record was first committed with instead — otherwise the review covers only
 * the last leg and the earlier leg keeps a review nobody performed.
 *
 * Where a group has more than one original (its records entered at different
 * times), the widest is required. Picking among baselines would otherwise be
 * picking how much of the change to look at.
 */
export function requiredReviewBaseline({ supersession }) {
  const chain = supersession.priorChain;
  const candidates = (chain?.deltasFromOriginalCommittedDigests ?? []).filter((entry) => entry.counts);
  if (!chain?.pinnedDigestIsItselfARepin || candidates.length === 0) {
    return { sha256: supersession.reviewedSha256, why: "the pinned digest is the digest this record was first committed with" };
  }
  const widest = candidates.reduce((a, b) => (b.counts.operativeLeaves > a.counts.operativeLeaves ? b : a));
  return {
    sha256: widest.originalSha256,
    why:
      candidates.length > 1
        ? "the pinned digest was itself re-pinned, and this is the widest of the original committed digests"
        : "the pinned digest was itself re-pinned, so the review runs from the original committed digest"
  };
}

/** The isolation measurement taken from a given baseline, or null. */
export function isolationForBaseline({ supersession, baselineSha256 }) {
  if (baselineSha256 === supersession.reviewedSha256) return supersession.delta?.isolation ?? null;
  const match = (supersession.priorChain?.deltasFromOriginalCommittedDigests ?? []).find(
    (entry) => entry.originalSha256 === baselineSha256
  );
  return match?.isolation ?? null;
}

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
  // problems: the document is inconsistent with what is measurable.
  // outstanding: the document is honest and the work it names is not done.
  const outstanding = [];
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
      problems,
      outstanding
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
    // The review has to be scoped from the right baseline. Where the pinned
    // digest was itself installed by one of the August re-pins, reviewing from
    // it would re-review only the later half of the change and leave the
    // earlier half carrying a review nobody performed — which is the
    // laundering this mechanism exists to stop. So the baseline is forced to
    // the original committed digest, and where a group has more than one, to
    // the widest of them: you cannot pick the narrow baseline.
    const required = requiredReviewBaseline({ supersession });
    const scope = disposition.reviewScope;
    if (!scope?.baselineSha256) {
      problems.push(`${disposition.bucket} without a review baseline`);
    } else if (scope.baselineSha256 !== required.sha256) {
      problems.push(
        `${disposition.bucket} is scoped from ${String(scope.baselineSha256).slice(0, 12)}; the review must run from ${required.sha256.slice(0, 12)} (${required.why})`
      );
    }

    const isolation = isolationForBaseline({ supersession, baselineSha256: required.sha256 });
    if (disposition.bucket === "TARGETED_REREVIEW_REQUIRED") {
      if (scope?.scope !== "named_pathways_only") {
        problems.push("TARGETED_REREVIEW_REQUIRED must scope to named pathways only");
      }
      const mustReview = isolation
        ? [...isolation.reviewedPathwaysDisturbed.map((p) => p.pathwayId), ...isolation.pathwaysGained].sort()
        : null;
      const named = [...(scope?.pathways ?? [])].sort();
      if (!mustReview) {
        problems.push("TARGETED_REREVIEW_REQUIRED cannot be checked: no isolation measured for the required baseline");
      } else if (JSON.stringify(named) !== JSON.stringify(mustReview)) {
        const missing = mustReview.filter((id) => !named.includes(id));
        problems.push(
          missing.length > 0
            ? `TARGETED_REREVIEW_REQUIRED omits ${missing.length} pathway(s) the delta disturbed or added, starting with ${missing[0]}`
            : `TARGETED_REREVIEW_REQUIRED names ${named.length} pathway(s); the delta disturbed or added ${mustReview.length}`
        );
      }
      // An exclusion is a claim, so it has to be stated rather than implied by
      // the absence of a pathway from a list.
      if (!String(scope?.excludedBecause ?? "").trim()) {
        problems.push("TARGETED_REREVIEW_REQUIRED does not say why the untouched pathways were excluded");
      }
    } else if (disposition.bucket === "FULL_REREVIEW_REQUIRED") {
      if (scope?.scope !== "entire_current_profile") {
        problems.push("FULL_REREVIEW_REQUIRED must scope to the entire current profile");
      }
      if (scope?.carriesForwardPriorReviewAsAuthority !== false) {
        problems.push("FULL_REREVIEW_REQUIRED must record that the prior review is not carried forward as substantive authority");
      }
    }

    // A required review that has not happened yet is an honest, recorded
    // state -- not a defect in the document. It keeps the pin unsatisfied, so
    // C1 and C2 go on refusing, but it must not make the supersession record
    // itself look corrupt: conflating the two would mean the only way to a
    // clean integrity check is to claim reviews that did not happen.
    const status = String(disposition.reviewStatus ?? "");
    const known = REVIEW_STATUSES[status];
    if (!known) {
      problems.push(`${disposition.bucket} carries reviewStatus ${JSON.stringify(status)}, which is not one of ${Object.keys(REVIEW_STATUSES).join(", ")}`);
    }

    const review = disposition.reviewRecord;
    if (!review) {
      // Only approved_current_bytes may carry a review record, and it must.
      if (known?.satisfies) {
        problems.push(`${disposition.bucket} is ${status} but carries no review record`);
      } else if (known) {
        outstanding.push(`${disposition.bucket} recorded; ${known.why}`);
      }
    } else if (!known?.satisfies) {
      // A record attached to a status that does not satisfy is either a
      // mislabelled approval or an approval somebody is holding back. Either
      // way the document is saying two things at once.
      problems.push(`${disposition.bucket} carries a review record while its status is ${status}`);
    } else if (!review.path) {
      problems.push(`${disposition.bucket} names a review record with no path`);
    } else if (!review.sha256) {
      problems.push(`${disposition.bucket} names a review record with no digest`);
    } else if (review.bindsBaselineSha256 !== required.sha256 || review.bindsCurrentSha256 !== supersession.currentSha256) {
      // A review record that does not bind both ends is a document about some
      // other pair of digests.
      problems.push(
        `${disposition.bucket}: the review record does not bind ${required.sha256.slice(0, 10)} -> ${String(supersession.currentSha256).slice(0, 10)}`
      );
    }
  }

  if (problems.length > 0) {
    return { state: "SUPERSEDED_PIN_WITH_RECORDED_DELTA", satisfied: false, reason: problems[0], problems, outstanding };
  }
  if (outstanding.length > 0) {
    return {
      state: "SUPERSEDED_PIN_AWAITING_REREVIEW",
      satisfied: false,
      reason: outstanding[0],
      problems: [],
      outstanding
    };
  }
  return { state: "SUPERSEDED_PIN_WITH_RECORDED_DELTA", satisfied: true, reason: null, problems: [], outstanding: [] };
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

/**
 * The supersession document's own integrity, checked from inside whichever
 * control is running.
 *
 * C1 and C2 are already canonical. Registering a separate verifier in the
 * npm test string would change package.json, which the render worker image
 * takes as an input — a publication for a test-script edit. So the controls
 * that already depend on this document also police it.
 *
 * Deliberately mid-weight: it recomputes the orphan check and every recorded
 * delta, which is what a control needs to know it is being told the truth
 * about the pins it is reading. The full history sweep — every record's
 * committed provenance digest, every re-pin event — stays in
 * verify-rcap-terminalization-provenance-supersessions.mjs, which is the
 * evidence verifier and can afford the minute it costs.
 */
export function verifySupersessionDocumentIntegrity({ root }) {
  const problems = [];
  const { document, byKey } = loadSupersessions({ root });
  if (!document) return ["the supersession record is missing"];

  const pins = collectPins({ root });
  const drifted = pins.filter((pin) => pin.reviewedSha256 !== pin.currentSha256);
  const liveKeys = new Set(drifted.map((pin) => `${pin.profilePath}|${pin.reviewedSha256}`));

  for (const key of byKey.keys()) {
    if (!liveKeys.has(key)) {
      problems.push(`the supersession record supersedes ${key.split("|")[1].slice(0, 10)}, which is not a drifted pin`);
    }
  }
  for (const pin of drifted) {
    if (!byKey.has(`${pin.profilePath}|${pin.reviewedSha256}`)) {
      problems.push(`${pin.record}: its profile moved and no supersession record covers it`);
    }
  }

  if (document.totals?.recordsCarryingAProfilePin !== pins.length) {
    problems.push(
      `the supersession record counts ${document.totals?.recordsCarryingAProfilePin} pinned records; the corpus has ${pins.length}`
    );
  }
  if (document.totals?.pinsSuperseded !== drifted.length) {
    problems.push(`the supersession record counts ${document.totals?.pinsSuperseded} superseded pins; ${drifted.length} have drifted`);
  }

  // Every recorded delta recomputed. An understated count or a dropped path is
  // the cheapest way to make a substantive change look like a small one, and
  // the disposition rules are all downstream of these numbers.
  for (const entry of document.supersessions ?? []) {
    const { reviewedBytesCurrentAt } = locateReviewedBytes({
      root,
      profilePath: entry.profilePath,
      reviewedSha256: entry.reviewedSha256
    });
    const label = `${entry.profilePath.split("/").pop()} @ ${entry.reviewedSha256.slice(0, 10)}`;
    if (!reviewedBytesCurrentAt) {
      problems.push(`${label}: no commit in the profile's history has the reviewed bytes`);
      continue;
    }
    const measured = measureDelta({ root, profilePath: entry.profilePath, reviewedBytesCurrentAt });
    for (const field of ["added", "removed", "changed", "totalMoved", "operativeLeaves"]) {
      if (entry.delta?.counts?.[field] !== measured.counts[field]) {
        problems.push(`${label}: delta counts.${field} records ${entry.delta?.counts?.[field]}, measured ${measured.counts[field]}`);
        break;
      }
    }
    for (const kind of ["added", "removed", "changed"]) {
      if ((entry.delta?.changedPaths?.[kind] ?? []).length !== measured.changedPaths[kind].length) {
        problems.push(
          `${label}: delta changedPaths.${kind} records ${(entry.delta?.changedPaths?.[kind] ?? []).length}, measured ${measured.changedPaths[kind].length}`
        );
        break;
      }
    }
    if (JSON.stringify(entry.delta?.dimensionsTouched ?? []) !== JSON.stringify(measured.dimensionsTouched)) {
      problems.push(`${label}: dimensionsTouched does not match the recomputed delta`);
    }
  }
  return problems;
}
