#!/usr/bin/env node
/*
 * WHAT A REPAIR LANE CAN BE DISPATCHED ONTO RIGHT NOW.
 *
 * Roger's standing instruction is to keep repair workers supplied with exact,
 * actionable defects rather than with a category. This says, per failing family:
 * who owns it, what obligation was actually recorded against it, and what the
 * border byte accounting currently says about its stroke-only ink.
 *
 * WHY THIS IS A SCRIPT AND NOT A FILE I MAINTAIN BY HAND.
 *
 * The first version of this queue was hand-built. Within a day its border figures
 * were stale, and I dispatched FIX134 onto the Rhode Island pair from it -- telling
 * that lane its ink matched nothing its source ships and the remedy was removal,
 * and adding, without checking, that the accounting had been re-run and had not
 * moved. The live ledger said the opposite and so had the pre-correction baseline.
 * Acting on my brief would have erased the court's own beveled check box from a
 * sworn affidavit, on one form from inside the notarial certificate. The lane
 * refused the premise because it measured.
 *
 * A dispatch brief is where a stale number does the most damage, because the lane
 * reads it as the Captain's measurement. So this file is derived, every time, from
 * the records that are authoritative for each field, and it says which record each
 * field came from.
 *
 * THE FIELD THAT DECIDES THE REMEDY IS NOT A LABEL, IT IS A DIRECTION.
 *
 * Stroke-only ink that matches a source stream -- exactly, or once a leading opaque
 * background fill is normalised away on both sides -- is the form's own, and the
 * remedy RESTORES. Ink that matches nothing is invented, and the remedy REMOVES.
 * These are opposite actions and the cohort has now been wrong about which is which
 * three times. So the queue publishes the direction in words beside the numbers,
 * and never publishes the tier or the field name as if either decided it.
 *
 * Read-only. Writes one artifact, no packet byte, and grants nothing.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FACTORY = "data/rcap-grade-a/packet-factory-24h";
const OUT = `${FACTORY}/REPAIR_SUPPLY_QUEUE.json`;
const read = (p) => JSON.parse(readFileSync(p, "utf8"));

const queue = read(`${FACTORY}/MASTER_QUEUE.json`);
const returns = read(`${FACTORY}/VERIFIER_RETURNS.json`);
const ledger = read(`${FACTORY}/claim-ledger.json`);
const cohort = (() => { try { return read(`${FACTORY}/BORDER_COHORT_REMEDIATION.json`); } catch { return { rows: [] }; } })();

const families = queue.families ?? queue.rows ?? [];
const failing = families.filter((f) => (f.state ?? f.status) === "FAIL_REPAIR_REQUIRED");

/* The current independent verdict, by the extractor's own rule: a refusal at the
 * claim gate is a statement about a lane, not about a packet, so it never
 * displaces a reading and stands alone only where there is none. */
const current = new Map();
const preclaim = new Map();
for (const r of returns.rows ?? []) {
  if (!r.isIndependentVerification || !r.verdict || r.superseded) continue;
  if (r.verdict === "BLOCKED_BEFORE_CLAIM") { preclaim.set(r.familyId, r); continue; }
  current.set(r.familyId, r);
}
for (const [id, refusal] of preclaim) if (!current.has(id)) current.set(id, refusal);

/*
 * The ledger's claims carry `familyIds` (a claim may cover several), `laneKind`
 * and `released`. Reading `grants`/`kind` here returned zero live owners for
 * every family while three repair lanes were running -- the shape has to come
 * from the file, not from memory of it.
 */
const grantsOf = (familyId) => {
  const rows = (ledger.claims ?? []).filter((g) =>
    g.familyId === familyId || (g.familyIds ?? []).includes(familyId));
  const repair = rows.filter((g) => g.laneKind === "repair" || g.operation === "repair");
  return {
    live: [...new Set(repair.filter((g) => g.released !== true).map((g) => g.lane))],
    released: [...new Set(repair.filter((g) => g.released === true).map((g) => g.lane))],
  };
};

const cohortRow = new Map((cohort.rows ?? []).map((r) => [r.familyId, r]));

const REMEDY = {
  SYNTHESIZED_INK_CONFIRMED: "REMOVE — some stroke-only appearance matches no stream the pinned source ships, with or without a leading background fill normalised away. Prove it stream by stream on the bytes before removing anything.",
  EVERY_STROKE_IS_THE_FORMS_OWN: "NOTHING TO REMEDIATE HERE — every stroke-only appearance is byte-identical to a stream the source itself ships. Removing any of it erases what the court prints.",
  EVERY_STROKE_IS_THE_FORMS_OWN_SOME_WITH_ITS_BACKGROUND_FILL_STRIPPED: "RESTORE, NOT REMOVE — every stroke-only appearance is the form's own once a leading opaque background fill is normalised away, so the ink belongs on the page and what is wrong is that the fill was stripped. Removing it erases what the court prints.",
  UNMEASURED: "UNKNOWN — the accounting could not measure this family. Do not infer a direction from the tier or the field name.",
};

const rows = failing.map((f) => {
  const verdict = current.get(f.familyId) ?? null;
  const owners = grantsOf(f.familyId);
  const border = cohortRow.get(f.familyId)?.sourceAccounting ?? null;
  const named = verdict?.failedObligationNames ?? [];
  return {
    familyId: f.familyId,
    jurisdiction: f.jurisdiction ?? null,
    familyDirectory: f.directory ?? null,
    recordedFailedObligations: named,
    hasAnActionableDefect: named.length > 0,
    verdictFrom: verdict ? { lane: verdict.lane, verifiedAtBase: verdict.verifiedAtBase ?? null, verdict: verdict.verdict } : null,
    repairOwner: owners.live,
    releasedRepairGrants: owners.released,
    dispatchable: named.length > 0,
    borderAccounting: border
      ? {
          result: border.result,
          matched: border.strokeOnlyMatchingAPinnedSourceStream ?? null,
          matchingNothing: border.strokeOnlyMatchingNothing ?? null,
          sourceStreamMinusItsBackgroundFill: border.strokeOnlyThatIsASourceStreamMinusItsBackgroundFill ?? null,
          whichRemedyThisImplies: REMEDY[border.result] ?? REMEDY.UNMEASURED,
        }
      : { result: "NOT_IN_THE_BORDER_COHORT", whichRemedyThisImplies: "This family carries no border finding at all. Do not send a lane to remove border ink from it." },
  };
});

const unowned = rows.filter((r) => r.repairOwner.length === 0);
const byJurisdiction = {};
for (const r of unowned) (byJurisdiction[r.jurisdiction ?? "?"] ??= []).push(r.familyId);
const needsARead = rows.filter((r) => !r.hasAnActionableDefect);

writeFileSync(OUT, JSON.stringify({
  schemaVersion: "rcap-repair-supply-queue/v2",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-repair-supply-queue.mjs",
  generatedAt: new Date().toISOString(),
  derivedFrom: {
    families: `${FACTORY}/MASTER_QUEUE.json`,
    obligations: `${FACTORY}/VERIFIER_RETURNS.json`,
    ownership: `${FACTORY}/claim-ledger.json`,
    borderInk: `${FACTORY}/BORDER_COHORT_REMEDIATION.json`,
  },
  whyItIsDerivedAndNotMaintained: "The hand-maintained v1 went stale in a day and its stale border figures reached a dispatch brief, where they told a lane to remove ink that was the court's own. A dispatch brief is where a stale number does the most damage. Regenerate this before dispatching from it, and if a field here disagrees with the record it names, the record wins.",
  theRemedyIsADirectionNotALabel: "Stroke-only ink matching a source stream is the form's own and the remedy RESTORES; ink matching nothing is invented and the remedy REMOVES. These are opposite actions and this cohort has been wrong about which is which three times. Neither the tier nor the field name decides it -- only the byte comparison against the family's own pinned sources does, and only a directional pixel difference against a source render WITH annotations shows whether a page is actually right.",
  totals: {
    failRepairRequired: rows.length,
    withALiveRepairOwner: rows.filter((r) => r.repairOwner.length > 0).length,
    unowned: unowned.length,
    withNoRecordedFailedObligation: needsARead.length,
    dispatchableNow: rows.filter((r) => r.dispatchable).length,
  },
  dispatchRule: "A family with a recorded obligation and no live owner needs one grant and can then be dispatched. A family with an owner but no live worker needs a worker, not a grant. A family with NO recorded obligation cannot be given an exact defect and must be READ before it is repaired -- dispatching a repair lane onto it asks it to re-derive the family, which a repair lane does not do.",
  unownedGroupedByJurisdiction: byJurisdiction,
  needsAReadNotARepair: needsARead.map((r) => ({ familyId: r.familyId, owner: r.repairOwner })),
  everyFailingFamily: rows,
  grantsNothing: "A queue promotes nothing, demotes nothing and approves no packet.",
}, null, 2) + "\n");

console.log(`failing families: ${rows.length}`);
console.log(`  with a live repair owner: ${rows.filter((r) => r.repairOwner.length > 0).length}`);
console.log(`  unowned:                  ${unowned.length}`);
console.log(`  no recorded obligation:   ${needsARead.length}`);
