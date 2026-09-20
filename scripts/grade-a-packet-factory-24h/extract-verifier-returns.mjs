#!/usr/bin/env node
/**
 * What the independent verifiers actually returned, read from their own diffs.
 *
 * P2V01-P2V03 returned nine Washington families FAIL_REPAIR_REQUIRED. All nine
 * stayed in VERIFYING, because the state machine reads VERIFYING off the
 * presence of an active independent-verification owner and never asks whether
 * that owner has returned. A lane that has returned is not still verifying, and
 * a family a verifier has failed is not a family awaiting a verdict: it is a
 * family with one. Left alone it would have gone to Lawrence review as
 * in-flight rather than as failed.
 *
 * This sweeps every return directory, reads the verdicts, and writes them where
 * the generator can see them.
 *
 * TWO RESULT VOCABULARIES, which is why this fails closed on a third.
 *
 * The P2V rows record thirteen obligations as the strings "PASS" and "FAIL" and
 * two -- routeOptions and repeatingRows -- as the boolean `true`. Reading the
 * strings alone counted those two booleans as failures and made four defect
 * classes out of two. Both spellings are accepted here and named explicitly;
 * anything else refuses, because a verdict nobody can read is not a verdict and
 * guessing at it is how a passing obligation becomes a repair lane.
 */
import { chatReviewInputs, chatRowProblem, normalizeBoundedChatFailure, attachChatReviewAddenda, supersededChatEvidencePath, supersededChatEvidencePaths } from "./chat-review-inputs.mjs";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETURNS = "data/rcap-grade-a/codex-cloud";
/*
 * The factory's own verification lanes return verdicts as
 * data/rcap-grade-a/packet-factory-24h/vf<NN>/rows.json. This sweep read only
 * the codex-cloud directory, so every factory-lane verdict — including the
 * first genuine PASS_COMPLETE_INDEPENDENT rows this sprint produced — was
 * invisible to the generator and the families sat in VERIFY_PENDING forever.
 * Only alphanumeric vf-prefixed directories are read here: builder and repair lanes are not
 * verdict sources, and vf-src-a is source verification, not packet
 * verification.
 */
const FACTORY_RETURNS = "data/rcap-grade-a/packet-factory-24h";
const OUT = "data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json";
const LEGAL_HOLD_RECLASSIFICATION = "data/rcap-grade-a/legal-decisions/LEGAL_HOLD_RECLASSIFICATION_2026-09-04.json";
const CHECK = process.argv.includes("--check");

const VERDICTS = ["PASS_COMPLETE_INDEPENDENT", "PASS", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT", "PRODUCT_PATH_PENDING", "BLOCKED_BEFORE_CLAIM", "STOPPED", "COMPLETED"];
/*
 * A LANE THAT COULD NOT LOOK IS NOT A VERDICT ABOUT THE PACKET.
 *
 * BLOCKED_BEFORE_CLAIM says the claim gate refused, so the lane opened no
 * artifact. It is a true statement about the LANE and says nothing about the
 * family — and every other verdict here is a statement about the family.
 *
 * The supersession rule cannot tell them apart, and FABLE-VB found what that
 * costs: eight of its items sat at FAIL_REPAIR_REQUIRED at bases its own base
 * descends from, so eight refusal rows would have superseded eight real
 * failures and dropped them off the repair queue on the strength of a read
 * that never happened. VB saw it coming and kept its refusals out of `rows`
 * entirely, which was right and should not have been necessary.
 *
 * So a non-reading verdict is excluded from the current-verdict contest. It is
 * still carried in `rows` as history — a lane refused at the gate is worth
 * knowing about — and it is counted separately below, because a family whose
 * only recent return is a refusal is a family nobody has read.
 */
const NON_READING = new Set(["BLOCKED_BEFORE_CLAIM"]);
const FAILING = new Set(["FAIL_REPAIR_REQUIRED"]);
const PASSING = new Set(["PASS_COMPLETE_INDEPENDENT", "PASS"]);

// An obligation result is PASS, FAIL, NOT_MEASURABLE_HERE, or a refusal to
// read it. NOT_MEASURABLE_HERE is what the pre-corpus-mount verification lanes
// recorded when an obligation (usually SOURCE_IDENTITY) could not be measured
// in their environment: it is not a packet defect, and it is not a pass — a
// row claiming PASS_COMPLETE_INDEPENDENT while carrying one is refused below.
const UNMEASURED = new Set(["NOT_MEASURABLE_HERE", "BLOCKED_LEGAL_INPUT"]);
/*
 * Spellings of "no measurement exists here" that lanes actually wrote.
 *
 * This is a reading aid, not an extension of the vocabulary: the canonical
 * token this file emits is still NOT_MEASURABLE_HERE, and a token outside both
 * sets is still unreadable. Seven rows across VF02 and VF03 recorded
 * "UNMEASURED" -- FABLE-VA3's Alaska row, for one, where CLIPPING_AND_OVERLAP
 * cannot be scored because the family is RASTER_PENDING and nobody has
 * rendered it yet. The distinction that matters is the one both spellings
 * keep: it is NOT a pass, and the PASS_COMPLETE_INDEPENDENT guard below
 * refuses any verdict resting on one.
 */
const UNMEASURED_SPELLINGS = new Map([["UNMEASURED", "NOT_MEASURABLE_HERE"], ["NOT_MEASURED", "NOT_MEASURABLE_HERE"]]);
const canonicalResult = (r) => UNMEASURED_SPELLINGS.get(r) ?? r;

/* The factory's canonical proof obligations, kept identical to the list lane
 * contract L9 enforces in verify-lane-contracts.mjs. The strongest verdict is
 * a claim about all fifteen; a lane that scored fewer is downgraded below. */
const PROOF_OBLIGATIONS = [
  "ROUTE_IDENTITY", "SOURCE_IDENTITY", "COMPONENT_SET", "KNOWN_PREFILLS",
  "REQUIRED_BEFORE_FILING", "ROUTE_OPTIONS", "REPEATING_ROWS", "PROTECTED_FIELDS",
  "ARTIFACTS", "PAGE_ORDER", "CLIPPING_AND_OVERLAP", "FILING_DESTINATION",
  "FEE_AND_WAIVER", "SERVICE", "SELF_HELP_STOP",
];
const obligationFailed = (raw) => {
  const r = canonicalResult(raw);
  if (r === "PASS" || r === true || r === "PRODUCT_PATH_PENDING" || UNMEASURED.has(r)) return false;
  if (r === "FAIL" || r === false) return true;
  throw new Error(`unreadable obligation result ${JSON.stringify(r)}; the vocabulary is "PASS"/"FAIL"/"NOT_MEASURABLE_HERE"/"BLOCKED_LEGAL_INPUT" or a boolean and nothing else`);
};
const obligationUnmeasured = (r) => UNMEASURED.has(canonicalResult(r));
const obligationBlockedLegal = (r) => canonicalResult(r) === "BLOCKED_LEGAL_INPUT";

/*
 * A failing verdict that names no obligation is a verdict no repairer can act
 * on. Five Washington families sat in VERIFY_PENDING for exactly that reason:
 * VF16 recorded their four failing obligations inside a Captain adjudication
 * block instead of in `proofObligations`, and this extractor read only the one
 * field. The findings were in the bytes; the queue showed an empty list and
 * the families became unassignable.
 *
 * So when `proofObligations` yields nothing for a FAILING row, the obligations
 * are harvested from anywhere in that row: any key that IS one of the fifteen
 * canonical obligations, spelled either way, carrying a value that reads PASS
 * or FAIL. It keys on the factory's own vocabulary rather than on a lane's
 * field name, so it reads any lane that names an obligation somewhere, and it
 * never overrides an explicit `proofObligations` reading. It stays fail-closed
 * in the same sense the strict reader does: a value outside the vocabulary is
 * not guessed at, it is simply not harvested.
 */
const OBLIGATION_BY_SHAPE = new Map(PROOF_OBLIGATIONS.map((o) => [o.replace(/_/g, "").toLowerCase(), o]));
const canonicalObligation = (k) => OBLIGATION_BY_SHAPE.get(String(k).replace(/[^A-Za-z]/g, "").toLowerCase()) ?? null;
const readsAsFail = (v) => v === false || (typeof v === "string" && /^FAIL\b/i.test(v.trim()));
const harvestNamedObligations = (node, found = new Map(), depth = 0) => {
  if (depth > 8 || node === null || typeof node !== "object") return found;
  if (Array.isArray(node)) { for (const v of node) harvestNamedObligations(v, found, depth + 1); return found; }
  for (const [k, v] of Object.entries(node)) {
    const o = canonicalObligation(k);
    if (o && readsAsFail(v) && !found.has(o))
      /* Same provenance key as the proofObligations path, so one field answers
       * "which field said this" for every obligation however it was found. The
       * older prose `readFrom` stays for its existing readers. */
      found.set(o, { obligation: o, finding: typeof v === "string" ? v : null, evidence: null,
        findingReadFrom: typeof v === "string" && v.trim() ? "named-obligation-block" : null,
        readFrom: "a named-obligation block outside proofObligations" });
    harvestNamedObligations(v, found, depth + 1);
  }
  return found;
};

const problems = [];
/* Failing rows that name no obligation even after the harvest above. This is
 * reported, not refused: refusing would drop every other lane's verdicts over
 * one lane's silence, and the silence is itself the finding — a family here
 * cannot be repaired, only re-read. */
const unactionableFailures = [];
const rows = [];
const dirsUnder = (base, keep) => fs.existsSync(path.join(ROOT, base))
  ? fs.readdirSync(path.join(ROOT, base), { withFileTypes: true })
      .filter((d) => d.isDirectory() && keep(d.name)).map((d) => ({ base, name: d.name })).sort((a, b) => a.name.localeCompare(b.name))
  : [];
/*
 * A VERIFICATION RETURN IS NOT ALWAYS CALLED rows.json.
 *
 * This read `${lane}/rows.json` and nothing else. The packet-build side fixed
 * exactly this once already -- two New Hampshire families and a Michigan one
 * were held at SOURCE_READY because a newer return sat under a different name
 * -- and the fix was never applied here.
 *
 * It became systematic today. Two verification lanes had collided by appending
 * to one shared rows.json, so every lane brief since tells the lane to write
 * ALONGSIDE under a distinct name and leave the existing file byte-for-byte
 * intact. Both instructions are right, and together they made every return that
 * obeyed them invisible: VF05 delivered a FAIL_REPAIR_REQUIRED on
 * il-seal-3yr-set with three measured defects, into
 * `vf05/rows-vf05-20260909b.json`, and nothing read it.
 *
 * So the lane's returns are found by SHAPE, as they are on the build side: any
 * JSON in the lane directory that is a non-empty array of row objects, or an
 * object whose `rows` is one, where every row names a family and carries a
 * verdict. That admits a return under any filename and excludes the
 * repair-assignment lists, checkpoints and gate notes that also live in these
 * directories, none of which carry a verdict per family.
 */
const returnFilesIn = (base, dir) => {
  const abs = path.join(ROOT, base, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const file of fs.readdirSync(abs).sort()) {
    if (!file.endsWith(".json")) continue;
    let doc;
    try { doc = JSON.parse(fs.readFileSync(path.join(abs, file), "utf8")); }
    catch { continue; }
    const list = Array.isArray(doc) ? doc : doc?.rows;
    if (!Array.isArray(list) || list.length === 0) continue;
    if (!list.every((r) => r && typeof r === "object" && (r.itemId ?? r.familyId) && r.verdict)) continue;
    out.push({ base, name: dir, file: `${base}/${dir}/${file}` });
  }
  return out;
};
const sweep = [
  ...dirsUnder(RETURNS, () => true).flatMap((s) => {
    const found = returnFilesIn(s.base, s.name);
    /* A directory whose only return is the canonical name keeps its original
     * shape, so a lane that never wrote one is still reported as silent
     * rather than quietly dropped from the sweep. */
    return found.length ? found : [s];
  }),
  ...dirsUnder(FACTORY_RETURNS, (n) => /^vf[a-z0-9]+$/i.test(n)).flatMap((s) => {
    const found = returnFilesIn(s.base, s.name);
    return found.length ? found : [s];
  }),
  ...chatReviewInputs(ROOT)
];
const dirs = sweep.map((s) => s.name);

for (const { base, name: d, file, chat, inputSha256 } of sweep) {
  const evidencePath = file ?? `${base}/${d}/rows.json`;
  const p = path.join(ROOT, evidencePath);
  if (!fs.existsSync(p)) continue;
  let doc;
  try { doc = JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { problems.push(`${d}/rows.json is unreadable: ${e.message}`); continue; }
  const list = Array.isArray(doc) ? doc : doc.rows ?? [];
  /*
   * A SINGLE-LANE FILE'S DECLARED BASE IS ITS ROWS' BASE.
   *
   * The refusal to inherit a document-level base below is right, and the hazard
   * it names is real: files appended to by successive lanes would stamp a later
   * team's baseSha onto older rows it never read, which is how a stale vf11
   * FAIL came to wear a fresh base.
   *
   * But that hazard needs more than one lane in the file. VF31 wrote a
   * single-lane file declaring `lane`, `laneKind` and one `verifiedAtBase` at
   * the top -- every row in it is that lane's, read at that commit -- and its
   * rows therefore carried no base of their own. The extractor read them as
   * declaring none, so a complete PASS_COMPLETE_INDEPENDENT lost supersession
   * to that same lane's older FAIL, which did carry a per-row base. A correct
   * later read was discarded in favour of the stale one it replaced.
   *
   * Measured before changing it: of 313 row files, 61 carry a document-level
   * base with at least one row lacking one. 50 of those declare a single lane
   * and every row belongs to it -- the hazard cannot arise. 11 are multi-lane
   * or declare no lane at all, and those keep the refusal.
   *
   * So the inheritance is allowed exactly where the file proves it is safe: the
   * document names a lane, and no row names a different one.
   */
  const documentDeclaredLane = typeof doc?.lane === "string" ? doc.lane : null;
  const everyRowIsThatLane = documentDeclaredLane !== null
    && list.every((r) => !r?.lane || r.lane === documentDeclaredLane);
  const inheritableBase = documentDeclaredLane && everyRowIsThatLane
    ? (doc.verifiedAtBase ?? doc.reviewBase ?? doc.baseSha ?? null)
    : null;
  // Only lanes that are actually independent verification. A builder's own row
  // is not a verdict, and counting one would be the self-verification the whole
  // design refuses.
  const isVerification = chat ? true : base === FACTORY_RETURNS
    ? (doc.laneKind ?? "") === "independent-verification" || /^vf\d+$/.test(d)
    : /verif/i.test(d) || /independent-review/i.test(d);
  /*
   * Which obligations this lane actually scored. Lane contract L9 already
   * refuses a PASS_COMPLETE_INDEPENDENT awarded over a subset of them, and it
   * caught twenty such rows the moment three verification teams were briefed
   * with a shorter checklist than the factory's own. L9 refusing is the right
   * outcome, but it leaves the queue promoting those families until someone
   * re-reads them, which is the window where a narrow verdict becomes a
   * terminal state nobody measured.
   *
   * So the downgrade happens here, at the point the verdicts are read, and by
   * the contract's own sentence: a verifier may always score less and say so,
   * but it may not call that result PASS_COMPLETE_INDEPENDENT. Such a row is
   * carried as PASS -- a true statement of what was measured, and one the
   * terminal transition does not act on -- with the unscored obligations
   * named. Nothing is discarded and no finding is rewritten; only the label
   * the contract does not allow.
   */
  const scoredTokens = new Set(JSON.stringify(doc).match(/[A-Z][A-Z_]{4,}/g) ?? []);
  const unscoredObligations = PROOF_OBLIGATIONS.filter((o) => !scoredTokens.has(o));
  for (const rawRow of list) {
    let r = rawRow;
    if (chat) {
      try { r = normalizeBoundedChatFailure(ROOT, doc, rawRow); }
      catch (e) { problems.push(`${evidencePath}/${rawRow.familyId}: ${e.message}`); continue; }
      const problem = chatRowProblem(doc, r, PROOF_OBLIGATIONS);
      if (problem) { problems.push(`${evidencePath}/${r.familyId}: ${problem}`); continue; }
    }
    /*
     * A verifier may emit both a family verdict and child artifact rows.  In
     * those child rows `itemId` names the route/fixture measurement while the
     * explicit `familyId` names the queue subject that owns it.  Preferring
     * itemId invented four Kansas "families" containing `::canonical` or
     * `::boundary`; no such queue subjects can exist, so F29 could neither
     * dispatch nor retire them after the parent repair completed.
     */
    const familyId = r.familyId ?? r.itemId ?? r.family ?? null;
    if (!familyId) { problems.push(`${d}: a row names no family`); continue; }
    // BUILT_RASTER_PENDING is a factory workflow state, not a launch verdict
    // (the prompt contract says so in as many words). It zeroes nothing and
    // waives nothing; reading it as a verdict would refuse the whole sweep.
    const rawVerdict = r.verdict ?? null;
    const declaredVerdict = rawVerdict === "BUILT_RASTER_PENDING" ? null : rawVerdict;
    const narrowlyScored = declaredVerdict === "PASS_COMPLETE_INDEPENDENT" && unscoredObligations.length > 0;
    const verdict = narrowlyScored ? "PASS" : declaredVerdict;
    if (verdict && !VERDICTS.includes(verdict)) { problems.push(`${d}/${familyId}: undeclared verdict ${verdict}`); continue; }
    let failedObligations = [];
    let unmeasuredObligations = [];
    let blockedLegalObligations = [];
    /*
     * A LANE'S REASONING IS NOT LOST BECAUSE IT CHOSE THE OTHER FIELD NAME.
     *
     * This read only `finding`, and lanes write their reasoning under either
     * `finding` or `detail` -- both are how a verifier states why an obligation
     * did not pass, and nothing ever told them which key this extractor reads.
     * Measured across every lane file: 759 non-passing obligations carry
     * `finding` and 380 carry ONLY `detail`. All 380 were extracted as null, so
     * a third of the reasoning verification lanes produced was discarded on the
     * way into the records the factory acts on -- including holds that then
     * looked reasonless to F26, which is how this was found.
     *
     * The text is taken as the lane wrote it and the source key is recorded, so
     * a reader can always tell which field answered rather than inferring it.
     */
    const obligationFinding = (v) => {
      const finding = typeof v?.finding === "string" && v.finding.trim() ? v.finding : null;
      if (finding) return { finding, findingReadFrom: "finding" };
      const detail = typeof v?.detail === "string" && v.detail.trim() ? v.detail : null;
      if (detail) return { finding: detail, findingReadFrom: "detail" };
      return { finding: null, findingReadFrom: null };
    };
    /*
     * A LANE MAY WRITE THE RESULT AS THE VALUE ITSELF.
     *
     * The strict reader took `v.result` and nothing else, so a lane writing
     * `proofObligations: { ROUTE_IDENTITY: "PASS", ... }` -- the vocabulary,
     * spelled correctly, just not wrapped in an object -- threw on
     * `result undefined` and LOST THE WHOLE ROW. VF49 wrote fifteen PASSes
     * that way and both its families stayed VERIFY_PENDING with the
     * verdict discarded.
     *
     * The asymmetry is what makes this a defect rather than a house style: the
     * harvest below already reads exactly that shape, so the same row was
     * readable when it FAILED and unreadable when it PASSED. A passing row is
     * the one that moves a family, so the strictness fell entirely on the
     * outcome it most mattered for.
     *
     * This stays fail-closed. `resultOf` reads the wrapped form first and falls
     * back to the value only when the value is a string, which
     * canonicalResult then checks against the vocabulary exactly as before --
     * anything outside it still throws and still refuses the row.
     */
    const resultOf = (v) => (v && typeof v === "object" ? v.result : (typeof v === "string" ? v : undefined));
    if (r.proofObligations) {
      try {
        failedObligations = Object.entries(r.proofObligations)
          .filter(([, v]) => obligationFailed(resultOf(v)))
          .map(([k, v]) => ({ obligation: k, ...obligationFinding(v), evidence: v?.evidence ?? null }));
        unmeasuredObligations = Object.entries(r.proofObligations)
          .filter(([, v]) => obligationUnmeasured(resultOf(v))).map(([k]) => k).sort();
        blockedLegalObligations = Object.entries(r.proofObligations)
          .filter(([, v]) => obligationBlockedLegal(resultOf(v)))
          .map(([k, v]) => ({ obligation: k, ...obligationFinding(v), evidence: v?.evidence ?? null }));
      } catch (e) { problems.push(`${d}/${familyId}: ${e.message}`); continue; }
    }
    let obligationsReadFromElsewhere = false;
    if (failedObligations.length === 0 && FAILING.has(verdict)) {
      const harvested = [...harvestNamedObligations(r).values()];
      if (harvested.length) { failedObligations = harvested; obligationsReadFromElsewhere = true; }
      else {
        /*
         * THE FIELD LITERALLY CALLED failedObligationNames.
         *
         * The harvest above looks for an obligation name used as a KEY whose
         * value reads as a failure. A row that simply lists its failing
         * obligations -- `failedObligationNames: ["ARTIFACTS"]` -- puts the name
         * in the VALUE, so nothing matched and the row was filed as a failure
         * naming nothing, which the queue then reports as needing a fresh read
         * rather than a repair.
         *
         * Sixteen failing families were sitting there, the whole vf90 byte-
         * accounting cohort among them, each carrying ["ARTIFACTS"] on disk and
         * an empty array after aggregation. The lane named its obligation in the
         * field named for it; the extractor was not looking at that field.
         *
         * Read as a last resort, after proofObligations and after the harvest,
         * so a row carrying real per-obligation findings still wins. A name that
         * is not one of the fifteen is ignored rather than trusted.
         */
        const listed = [r.failedObligationNames, r.failedObligations]
          .filter(Array.isArray).flat()
          .map((x) => canonicalObligation(typeof x === "string" ? x : x?.obligation))
          .filter(Boolean);
        const unique = [...new Set(listed)];
        if (unique.length) {
          failedObligations = unique.map((o) => ({ obligation: o, finding: null, evidence: null,
            findingReadFrom: null,
            readFrom: "the row's own failedObligationNames; no per-obligation finding was recorded beside it" }));
          obligationsReadFromElsewhere = true;
        } else unactionableFailures.push(`${d}/${familyId}`);
      }
    }
    if (verdict === "PASS_COMPLETE_INDEPENDENT" && unmeasuredObligations.length)
      { problems.push(`${d}/${familyId}: claims PASS_COMPLETE_INDEPENDENT with ${unmeasuredObligations.length} unmeasured obligation(s): ${unmeasuredObligations.join(", ")}`); continue; }
    rows.push({
      familyId, verdict, lane: d, isIndependentVerification: isVerification,
      /*
       * The commit THIS ROW's read was made against, and only if the row says
       * so. A document-level base is not inherited: these files are appended
       * to by successive lanes, so a later team's baseSha lands on top of
       * older rows it never read. vf11 shows it exactly -- a stale
       * vt_seal_18_to_21 FAIL carrying the fresh base a different team stamped
       * on the document when it appended its own rows, which is a stale read
       * wearing a current timestamp. VT2 saw the same hazard from the writing
       * side and recorded per-row bases to avoid stamping its commit onto
       * VF-SRC-A's rows in the files it shared.
       */
      verifiedAtBase: r.verifiedAtBase ?? r.reviewBase ?? r.baseSha ?? inheritableBase,
      ...(narrowlyScored ? {
        downgradedFrom: "PASS_COMPLETE_INDEPENDENT",
        downgradedBecause: `the lane scored ${PROOF_OBLIGATIONS.length - unscoredObligations.length} of ${PROOF_OBLIGATIONS.length} proof obligations; the strongest verdict is a claim about all of them`,
        obligationsNotScored: unscoredObligations,
      } : {}),
      failedObligations, failedObligationNames: failedObligations.map((x) => x.obligation).sort(),
      ...(obligationsReadFromElsewhere ? { obligationsReadFromElsewhere: "this row's proofObligations named none; the failing obligations below were read from a named-obligation block elsewhere in the same row" } : {}),
      unmeasuredObligations,
      ...(verdict === "PRODUCT_PATH_PENDING" ? {
        exactRouteDeliveryDefect: r.exactRouteDeliveryDefect ?? null,
      } : {}),
      ...(verdict === "BLOCKED_LEGAL_INPUT" && blockedLegalObligations.length ? {
        blockedLegalObligations,
        blockedLegalObligationNames: blockedLegalObligations.map((x) => x.obligation).sort(),
      } : {}),
      evidencePath,
      ...(chat ? {
        evidenceSha256: inputSha256,
        reviewer: doc.reviewer,
        sessionIdentity: doc.sessionIdentity,
        reviewScope: r.reviewScope ?? doc.scope ?? null,
        ...(r.reviewBaseSource ? {reviewBaseSource:r.reviewBaseSource} : {}),
        candidateCodeCommit: r.candidateCodeCommit ?? doc.candidateCodeCommit ?? null,
        packetPublicationCommit: r.packetPublicationCommit ?? null,
        // A documented withdrawal is not inferred from file naming or dates.
        supersedesEvidencePath: supersededChatEvidencePath(base, doc, r),
        ...(supersededChatEvidencePaths(base, doc, r).length
          ? {supersedesEvidencePaths: supersededChatEvidencePaths(base, doc, r)} : {}),
      } : {}),
      repairAssignmentsPath: fs.existsSync(path.join(ROOT, base, d, "repair-assignments.json"))
        ? `${base}/${d}/repair-assignments.json` : null,
      reproduction: `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family ${familyId}`
    });
  }
}

attachChatReviewAddenda(ROOT, rows);

// One family, one CURRENT independent verdict. Lanes are minted in order, so
// a later lane's read supersedes an earlier lane's — a family failed by VF06
// and passed by VF23 after repair is a passing family, not a disagreement.
// Factory lanes outrank the codex-cloud return directories (the factory is
// the current channel; the codex-cloud verdicts predate it). The superseded
// rows stay in `rows` as history; only `current` feeds the counts and the
// failing-family list.
const lanePrecedence = (r) => {
  const n = Number((r.lane.match(/(\d+)$/) ?? [])[1] ?? 0);
  const factory = r.evidencePath.startsWith(FACTORY_RETURNS) ? 1000 : 0;
  return factory + n;
};

/*
 * Lane number is a proxy for recency, and it is wrong exactly when a
 * lower-numbered lane does the LATER read. VF25 failed mi_setaside_marihuana
 * before its repair; VF09 passed the repaired family afterwards; ranking by
 * lane number kept the stale FAIL current and held a finished family out of
 * the queue. The lanes were both right about what they saw, so this is an
 * ordering defect, not a disagreement.
 *
 * The rows say when they were read: each carries the commit it was verified
 * against. Commit ancestry is a real ordering, so a read made at a descendant
 * of another read's base is later, full stop. Lane precedence stays as the
 * tie-break for rows whose bases are equal, unrelated, missing, or not
 * commit-shaped (xvf-a records prose where a SHA belongs).
 */
const isCommit = (s) => typeof s === "string" && /^[0-9a-f]{7,40}$/.test(s);
const ancestry = new Map();
const isAncestorOf = (a, b) => {
  if (!isCommit(a) || !isCommit(b) || a === b) return false;
  const key = `${a}\0${b}`;
  if (ancestry.has(key)) return ancestry.get(key);
  let answer = false;
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", a, b], { cwd: ROOT, stdio: "ignore" });
    answer = true;
  } catch { answer = false; }
  ancestry.set(key, answer);
  return answer;
};
/*
 * Only the base a lane DECLARES is used. The commit that last wrote a lane's
 * rows file looks like the same signal and is not: a merge that touches an old
 * lane's file incidentally makes a stale read look fresh, and using it put
 * ak-courtview, co_motion_seal_nonconviction and mi_setaside_marihuana back on
 * the failing list on the strength of reads nobody had redone. A lane that
 * does not say when it read is a lane this cannot order, and lane precedence
 * decides it — the same answer as before, rather than a confident wrong one.
 */
const supersedes = (r, prior) => {
  if (r.supersedesEvidencePath === prior.evidencePath || r.supersedesEvidencePaths?.includes(prior.evidencePath)) return true;
  if (prior.supersedesEvidencePath === r.evidencePath || prior.supersedesEvidencePaths?.includes(r.evidencePath)) return false;
  if (isAncestorOf(prior.verifiedAtBase, r.verifiedAtBase)) return true;
  if (isAncestorOf(r.verifiedAtBase, prior.verifiedAtBase)) return false;
  /*
   * A row that states the commit it read at has made a checkable claim about
   * when it read; one that states nothing has not. Lane number is only a proxy
   * for recency and this file exists because that proxy inverts. So stated
   * evidence outranks the proxy, and lane precedence decides only when neither
   * row says when it read.
   */
  const rSays = isCommit(r.verifiedAtBase);
  const priorSays = isCommit(prior.verifiedAtBase);
  if (rSays !== priorSays) return rSays;
  return lanePrecedence(r) > lanePrecedence(prior);
};

const current = new Map();
for (const r of rows.filter((x) => x.isIndependentVerification && x.verdict && !NON_READING.has(x.verdict))) {
  const prior = current.get(r.familyId);
  if (!prior || supersedes(r, prior)) current.set(r.familyId, r);
}

/*
 * AN ENVIRONMENT-SCOPED SOURCE REFUSAL IS HISTORY ONCE THE OWNER HAS
 * IDENTIFIED THE SUBSTANTIVE READ THAT CONTROLS THE HOLD RECLASSIFICATION.
 *
 * ca-prop64-set has a later BLOCKED_SOURCE row only because that verifier's
 * isolated checkout did not mount the private corpus. The refusal remains in
 * this extraction, word for word, but the owner-confirmed reclassification
 * identifies the exact VF12 row that answers the former legal hold. This is
 * deliberately data-driven and self-expiring: the next substantive verifier
 * whose declared base is this decision's Captain SHA or a descendant resumes
 * ordinary ancestry ordering.
 */
let chronologySelections = [];
try {
  const decision = JSON.parse(fs.readFileSync(path.join(ROOT, LEGAL_HOLD_RECLASSIFICATION), "utf8"));
  chronologySelections = (decision.families ?? []).filter((r) => r.disposition === "SELECT_SUBSTANTIVE_VERDICT");
  for (const selection of chronologySelections) {
    const target = rows.find((r) => r.familyId === selection.familyId
      && r.lane === selection.selectedVerdict?.lane
      && r.verdict === selection.selectedVerdict?.verdict
      && r.verifiedAtBase === selection.selectedVerdict?.verifiedAtBase);
    if (!target) {
      problems.push(`${selection.familyId}: the owner-confirmed substantive verdict ${selection.selectedVerdict?.lane}/${selection.selectedVerdict?.verifiedAtBase} does not exist`);
      continue;
    }
    const laterSubstantive = rows.find((r) => r.familyId === selection.familyId
      && r !== target
      && r.isIndependentVerification
      && r.verdict
      && !NON_READING.has(r.verdict)
      && r.verdict !== "BLOCKED_SOURCE"
      && (r.verifiedAtBase === decision.recordedAtCaptainSha
        || isAncestorOf(decision.recordedAtCaptainSha, r.verifiedAtBase)));
    if (laterSubstantive) continue;
    target.chronologySelection = {
      disposition: selection.disposition,
      decisionRecord: LEGAL_HOLD_RECLASSIFICATION,
      recordedAtCaptainSha: decision.recordedAtCaptainSha,
      historicalVerdictPreserved: selection.historicalVerdictPreserved,
      selectionExpiresWhen: selection.selectionExpiresWhen
    };
    current.set(selection.familyId, target);
  }
} catch (e) {
  if (fs.existsSync(path.join(ROOT, LEGAL_HOLD_RECLASSIFICATION)))
    problems.push(`legal-hold reclassification is unreadable: ${e.message}`);
}
for (const r of rows) r.superseded = r.isIndependentVerification && !!r.verdict
  && !NON_READING.has(r.verdict) && current.get(r.familyId) !== r;

const currentRows = [...current.values()];
const failed = currentRows.filter((r) => FAILING.has(r.verdict));
const passed = currentRows.filter((r) => PASSING.has(r.verdict));

const doc = {
  schemaVersion: "rcap-verifier-returns/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs",
  whatThisIsFor: "A returned verdict outranks an active-owner claim. A lane that has returned is not still verifying, and a family its verifier failed is not awaiting a verdict.",
  verdictVocabulary: VERDICTS,
  obligationResultVocabulary: ['"PASS"', '"FAIL"', "true", "false"],
  obligationVocabularyNote: "The P2V rows record thirteen obligations as strings and two as booleans. Both are read; a third spelling refuses, because reading only the strings turned two passing obligations into failures and doubled the defect count.",
  supersessionRule: "one current verdict per family, ordered by the base each row DECLARES it read at: a read whose verifiedAtBase descends from another read's base is the later one and supersedes it. Where neither base is an ancestor of the other, a row that declares a commit-shaped base outranks one that declares none. Lane precedence (factory vf lanes over codex-cloud directories, then higher lane number) decides only when neither row says when it read. An exact owner-confirmed substantive selection in LEGAL_HOLD_RECLASSIFICATION_2026-09-04.json preserves environment-scoped BLOCKED_SOURCE history without letting that environment refusal remain a legal hold; it expires on the next substantive read at or after the record's Captain SHA. Recency is never inferred from file modification or merge time. Exact per-document supersession of a submitted chat disposition is honored without removing the original. Chat source-audit/preparation schemas do not become packet verdicts; a complete chat pass requires per-row measured obligations and counters. Superseded rows remain as history with superseded: true",
  chronologySelections: chronologySelections.map((r) => ({
    familyId: r.familyId,
    selectedVerdict: r.selectedVerdict,
    decisionRecord: LEGAL_HOLD_RECLASSIFICATION
  })),
  counts: {
    returnDirectories: dirs.length,
    rows: rows.length,
    independentVerdicts: currentRows.length,
    failRepairRequired: failed.length,
    passIndependent: passed.length
  },
  failRepairRequiredFamilies: failed.map((r) => r.familyId).sort(),
  refusedAtTheClaimGate: {
    whatThisIs: "rows where a verification lane was refused by the claim gate and therefore opened no artifact. These are statements about the lane, not about the packet, so they never enter the current-verdict contest and never supersede a lane that did look.",
    rows: rows.filter((r) => NON_READING.has(r.verdict)).map((r) => `${r.lane}/${r.familyId}`).sort()
  },
  unactionableFailures: {
    whatThisIs: "rows carrying a failing verdict that name no obligation anywhere, so no repairer can be dispatched from them; each needs a fresh independent read, not a repair",
    rows: unactionableFailures.sort()
  },
  rows: rows.sort((a, b) => a.familyId.localeCompare(b.familyId) || a.lane.localeCompare(b.lane)),
  commercialRoutesOpened: 0,
  productionTouched: false,
  grantsNothing: "A verdict moves a family in the queue. It promotes nothing, opens no route, and prepares no review package."
};

/*
 * A BAD ROW COSTS ITS OWN FAMILY, NOT EVERY OTHER LANE'S WORK.
 *
 * Every `problems.push` above is already followed by `continue`, so the
 * offending row is skipped and contributes no verdict. Refusing to write the
 * file on top of that discarded the GOOD rows too: six VF02 rows with one
 * out-of-vocabulary token froze the whole extraction, and when FABLE-VA3
 * returned seven families, its six readable verdicts -- four passes and two
 * genuine SELF_HELP_STOP failures -- could not reach the queue either. The
 * factory stopped moving on a spelling.
 *
 * So the refusals are carried IN the document, where they are durable and
 * auditable, instead of in a console line that scrolls away, and the good
 * verdicts land. A refused row still yields nothing: no verdict, no state
 * change, no repair assignment.
 */
doc.rowsRefused = problems.length;
doc.refusedRows = problems;
doc.whatARefusedRowMeans = "The row named a family and could not be read -- an undeclared verdict, an out-of-vocabulary obligation result, a PASS_COMPLETE_INDEPENDENT resting on an unmeasured obligation. It produced no verdict and moved no family. It is recorded here so a refusal is visible in the record rather than only in a console line, and so the count can be watched.";
if (problems.length) {
  console.error(`${problems.length} row(s) refused and carried into ${OUT}:`);
  for (const p of problems.slice(0, 10)) console.error(`  ${p}`);
}

const text = `${JSON.stringify(doc, null, 2)}\n`;
if (CHECK) {
  const committed = fs.existsSync(path.join(ROOT, OUT)) ? fs.readFileSync(path.join(ROOT, OUT), "utf8") : null;
  if (committed !== text) { console.error(`VERIFIER_RETURNS.json does not converge with the return directories.`); process.exit(1); }
  console.log(`verifier returns converge: ${doc.counts.independentVerdicts} independent verdict(s), ${failed.length} FAIL_REPAIR_REQUIRED.`);
  process.exit(0);
}
fs.writeFileSync(path.join(ROOT, OUT), text);
console.log(`Wrote ${OUT}`);
console.log(`  ${dirs.length} return director(ies) · ${doc.counts.independentVerdicts} independent verdict(s)`);
console.log(`  FAIL_REPAIR_REQUIRED ${failed.length}: ${doc.failRepairRequiredFamilies.join(", ") || "(none)"}`);
