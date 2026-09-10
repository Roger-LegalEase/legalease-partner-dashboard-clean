#!/usr/bin/env node
/*
 * WHAT A REFUSED ROW COSTS, AND WHAT IT WOULD TAKE TO GET IT BACK.
 *
 * extract-verifier-returns.mjs refuses a row it cannot read: a verdict outside
 * the declared vocabulary, an obligation result outside its four words, or a
 * PASS_COMPLETE_INDEPENDENT resting on an obligation the reader scored
 * NOT_MEASURABLE_HERE. A refused row produces no verdict and moves no family, so
 * the family sits in VERIFY_PENDING as though nobody had read it -- while a lane
 * spent a shift reading it.
 *
 * The refusal list names the family and the rule. It does not say what is owed to
 * get the reading back, and the answer differs sharply by class:
 *
 *   ONE OBLIGATION SHORT      The reading is whole but for one or two obligations
 *                             the reader could not reach. What is owed is a NARROW
 *                             re-read of exactly those, on the same bytes.
 *
 *   OUT-OF-VOCABULARY RESULT  The reader wrote a word the extractor cannot read,
 *                             usually PASS_WITH_OBSERVATION. The reading survives
 *                             in the row's own prose and MUST be read before
 *                             anyone assumes the row meant PASS: on Illinois one
 *                             such row records a sealing-only route telling the
 *                             participant to complete an expungement row on the
 *                             proposed order. That is a defect, not an aside.
 *
 *   VERDICT NAMING NOTHING    A failing verdict with no failed obligation named
 *                             anywhere. No repairer can be dispatched from it. A
 *                             fresh independent read is owed, not a repair.
 *
 *   STALE BOUNDED REVIEW      A review that no longer describes both current PDFs.
 *                             The bytes moved under it. Re-read against current
 *                             bytes; never relabel the old review as covering them.
 *
 * THIS FILE DECIDES NOTHING. It does not upgrade a NOT_MEASURABLE_HERE to a PASS,
 * and nobody else may either: an obligation that turns out not to arise is a PASS
 * only when someone MEASURES that it does not arise and records the reason. The
 * Captain writing that word for a family he did not read is a fabricated
 * measurement, and it is the one shortcut this queue exists to make unnecessary.
 *
 * Read-only over the factory records. Writes one artifact and no packet byte.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const FACTORY = "data/rcap-grade-a/packet-factory-24h";
const OUT = `${FACTORY}/REFUSED_ROW_RECOVERY_QUEUE.json`;
const read = (p) => JSON.parse(readFileSync(p, "utf8"));

const returns = read(`${FACTORY}/VERIFIER_RETURNS.json`);
const queue = read(`${FACTORY}/MASTER_QUEUE.json`);
const familyState = new Map();
for (const f of queue.families ?? queue.rows ?? []) familyState.set(f.familyId, f.state ?? f.status ?? null);

/* Every row every lane wrote, indexed by lane and by the id the row carries.
 * vf90 keys on itemId while the aggregate keys on familyId; both are indexed so
 * a refusal naming either resolves. */
/*
 * A LANE WRITES A FAMILY MORE THAN ONCE, AND THE FIRST ROW IS THE WRONG ONE.
 *
 * vf13 carries two generations of every Illinois family: an earlier reading whose
 * obligations are scored PASS_WITH_OBSERVATION, and a later reading at a declared
 * base with the vocabulary corrected. It is the EARLIER row the extractor refuses.
 * Taking the first row per id happened to be right there and would be wrong the
 * moment a lane appended a corrected row above an older one, so the row is chosen
 * by matching the refusal itself, and every row for that family in that lane is
 * kept so the queue can say whether a later reading superseded it.
 */
const rowsByLane = new Map();
for (const lane of readdirSync(FACTORY).filter((n) => /^vf\d+$/.test(n))) {
  const dir = path.join(FACTORY, lane);
  for (const file of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
    let parsed;
    try { parsed = read(path.join(dir, file)); } catch { continue; }
    const rows = Array.isArray(parsed) ? parsed : (parsed.rows ?? []);
    if (!Array.isArray(rows)) continue;
    rows.forEach((row, ordinal) => {
      const id = row.itemId ?? row.familyId;
      if (!id) return;
      if (!rowsByLane.has(lane)) rowsByLane.set(lane, new Map());
      const perId = rowsByLane.get(lane);
      if (!perId.has(id)) perId.set(id, []);
      perId.get(id).push({ file: path.join(dir, file), ordinal, row });
    });
  }
}

/* Does this row exhibit the condition the extractor refused it for? */
const exhibitsRefusal = (row, klass, detail) => {
  const obligations = row.proofObligations ?? {};
  const resultOf = (name) => {
    const o = obligations[name];
    return o && typeof o === "object" ? o.result : o;
  };
  if (klass === "ONE_OBLIGATION_SHORT") {
    return row.verdict === "PASS_COMPLETE_INDEPENDENT"
      && detail.unmeasuredObligations.every((name) => {
        const r = resultOf(name);
        return r === "NOT_MEASURABLE_HERE" || r === "BLOCKED_LEGAL_INPUT" || r == null;
      });
  }
  if (klass === "OUT_OF_VOCABULARY_RESULT") {
    return Object.values(obligations).some((o) => o && typeof o === "object" && o.result === detail.wordWritten);
  }
  if (klass === "VERDICT_NAMING_NOTHING") {
    return row.verdict === detail.verdictWritten
      && (row.failedObligationNames ?? []).length === 0;
  }
  return false;
};

const UNMEASURED = /^(\S+)\/(.+): claims PASS_COMPLETE_INDEPENDENT with \d+ unmeasured obligation\(s\): (.+)$/;
const UNREADABLE = /^(\S+)\/(.+): unreadable obligation result "([^"]+)"/;
const UNDECLARED = /^(\S+)\/(.+): undeclared verdict (\S+)$/;

const rows = [];
for (const refusal of returns.refusedRows ?? []) {
  let lane = null, familyId = null, klass = null, detail = {};
  let m;
  if ((m = UNMEASURED.exec(refusal))) {
    [, lane, familyId] = m;
    klass = "ONE_OBLIGATION_SHORT";
    detail.unmeasuredObligations = m[3].split(",").map((s) => s.trim());
  } else if ((m = UNREADABLE.exec(refusal))) {
    [, lane, familyId] = m;
    klass = "OUT_OF_VOCABULARY_RESULT";
    detail.wordWritten = m[3];
  } else if ((m = UNDECLARED.exec(refusal))) {
    [, lane, familyId] = m;
    klass = "VERDICT_NAMING_NOTHING";
    detail.verdictWritten = m[3];
  } else {
    const cut = refusal.lastIndexOf("/");
    const colon = refusal.indexOf(": ", cut);
    lane = refusal.slice(0, cut);
    familyId = colon === -1 ? refusal.slice(cut + 1) : refusal.slice(cut + 1, colon);
    klass = "STALE_BOUNDED_REVIEW";
    detail.why = colon === -1 ? null : refusal.slice(colon + 2);
  }

  const candidates = rowsByLane.get(lane)?.get(familyId) ?? [];
  const found = candidates.find((c) => exhibitsRefusal(c.row, klass, detail)) ?? null;
  /* A later row for the same family in the same lane, written after the refused
   * one. Its existence is the difference between a reading that was LOST and a
   * reading the lane itself replaced. It does not say the finding was resolved --
   * only that a newer reading exists and what it concluded. */
  const supersededBy = found
    ? candidates.filter((c) => c.ordinal > found.ordinal).map((c) => ({
        verdict: c.row.verdict ?? null,
        verifiedAtBase: c.row.verifiedAtBase ?? null,
        failedObligationNames: c.row.failedObligationNames ?? null,
      }))
    : [];
  const obligations = found?.row?.proofObligations ?? {};
  /* The reader's own words on the obligations that caused the refusal. A re-read
   * that has to rediscover them wastes the shift that produced them. */
  const readerSaid = {};
  const names = klass === "ONE_OBLIGATION_SHORT"
    ? detail.unmeasuredObligations
    : Object.entries(obligations)
        .filter(([, v]) => v && typeof v === "object" && v.result === detail.wordWritten)
        .map(([k]) => k);
  for (const name of names ?? []) {
    const o = obligations[name];
    if (o && typeof o === "object") readerSaid[name] = { result: o.result ?? null, detail: o.detail ?? o.why ?? null };
  }

  rows.push({
    familyId,
    lane,
    refusalClass: klass,
    ...detail,
    currentFamilyState: familyState.get(familyId) ?? "NOT_A_FAMILY_IN_THE_QUEUE",
    rowFile: found?.file ?? null,
    rowFound: Boolean(found),
    refusedReadingWasSupersededByALaterRowFromTheSameLane: supersededBy.length > 0,
    laterRowsFromTheSameLane: supersededBy.length > 0 ? supersededBy : null,
    whatSupersessionDoesNotSay: supersededBy.length > 0
      ? "That a later reading exists does not mean the refused reading's finding was resolved. The later rows here name no failed obligations and carry none of the earlier prose, so they neither repeat the finding nor record it as answered."
      : null,
    readerSaid: Object.keys(readerSaid).length > 0 ? readerSaid : null,
    whatIsOwed: {
      ONE_OBLIGATION_SHORT: "A narrow independent re-read of exactly the named obligations on the same bytes, by a lane that did not author the packet. If an obligation does not arise on this form, that is a MEASUREMENT and it is a PASS with the reason recorded -- but somebody has to make it.",
      OUT_OF_VOCABULARY_RESULT: "Read the reader's own words on the named obligations BEFORE assuming the row meant PASS. Where the words record a defect, the honest verdict is a FAIL naming that obligation, and the family needs a repair grant. Where they record only an aside, a re-read may score it PASS with the aside kept in a sibling key.",
      VERDICT_NAMING_NOTHING: "A fresh independent read. No repairer can be dispatched from a failing verdict that names no obligation, and asking a repair lane to re-derive the family is not what a repair lane does.",
      STALE_BOUNDED_REVIEW: "Re-read against the CURRENT bytes. The old review is preserved as history and is never relabelled as covering bytes it did not describe.",
    }[klass],
  });
}

/*
 * THE ONE THING SUPERSESSION DOES NOT SETTLE.
 *
 * Where a refused row was later replaced -- by the same lane correcting its
 * vocabulary, or by another lane reading the family afresh -- the family's
 * verdict is not in doubt, and on four Illinois families the later reading is a
 * PASS at a demonstrably later commit. The refusal cost those families nothing.
 *
 * What it does not settle is the OBSERVATIONS the refused row carried. A lane
 * that read a family the next day had no reason to look for a finding recorded in
 * a row the extractor had already dropped, and the later rows here repeat none of
 * it. So the prose survives in the repository and answers to nobody.
 *
 * This block names exactly those: a refused reading carrying words, on a family
 * whose current verdict is a PASS. It asserts nothing about the PASS. It says a
 * specific observation was made, was never contradicted, and was never answered.
 */
const currentVerdict = new Map();
for (const r of returns.rows ?? []) {
  if (!r.isIndependentVerification || !r.verdict || r.superseded) continue;
  currentVerdict.set(r.familyId, { verdict: r.verdict, lane: r.lane, verifiedAtBase: r.verifiedAtBase ?? null });
}
const unanswered = rows
  .filter((r) => r.readerSaid && Object.values(r.readerSaid).some((o) => o.detail))
  .map((r) => ({
    familyId: r.familyId,
    refusedIn: r.lane,
    currentVerdict: currentVerdict.get(r.familyId) ?? null,
    currentFamilyState: r.currentFamilyState,
    observationsNeverAnswered: Object.fromEntries(
      Object.entries(r.readerSaid).filter(([, o]) => o.detail).map(([k, o]) => [k, o.detail])),
  }))
  .filter((r) => r.currentVerdict?.verdict === "PASS_COMPLETE_INDEPENDENT" || r.currentFamilyState === "COMPLETE_PACKET_PROVEN");

const byClass = {};
for (const r of rows) byClass[r.refusalClass] = (byClass[r.refusalClass] ?? 0) + 1;
const distinctFamilies = new Set(rows.map((r) => r.familyId)).size;

writeFileSync(OUT, JSON.stringify({
  schemaVersion: "rcap-refused-row-recovery-queue/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-refused-row-recovery-queue.mjs",
  generatedAt: new Date().toISOString(),
  whyItExists: "A refused row is a shift already spent that produced no verdict. This says, per refused row, what is owed to recover it and what the reader actually wrote, so a re-read starts from the previous reading instead of from nothing.",
  whatItDoesNotDo: "It upgrades nothing. An obligation scored NOT_MEASURABLE_HERE stays that way until a lane MEASURES it, and PASS_WITH_OBSERVATION is never read as PASS on this file's say-so -- one such row on Illinois records a sealing-only route telling the participant to complete an expungement row on the proposed order.",
  totals: { refusedRows: rows.length, distinctFamilies, byClass, observationsUnansweredOnPassingFamilies: unanswered.length },
  observationsUnansweredOnPassingFamilies: {
    whatThisIs: "A refused reading that carried words, on a family whose current verdict is a PASS. The PASS is not challenged here and its chronology is sound. What is recorded is that a specific observation was made by a lane that read the bytes, was never contradicted, and was never answered -- because the row carrying it was dropped before any later reader could see it.",
    whatIsOwed: "A targeted re-read of the named observation against the CURRENT bytes, by a lane that did not author the packet. If it holds, it is a substantiated failure and is recorded through the verifier mechanism now, not after repair -- being counted terminal is not a reason to preserve a known defect. If it does not hold, that is recorded too, and the family keeps its PASS.",
    rows: unanswered,
  },
  rows,
  grantsNothing: "A queue promotes nothing, demotes nothing and approves no packet.",
}, null, 2) + "\n");

console.log(`refused rows: ${rows.length} across ${distinctFamilies} distinct famil(ies)`);
for (const [k, v] of Object.entries(byClass)) console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log(`rows whose original reading was located: ${rows.filter((r) => r.rowFound).length}`);
