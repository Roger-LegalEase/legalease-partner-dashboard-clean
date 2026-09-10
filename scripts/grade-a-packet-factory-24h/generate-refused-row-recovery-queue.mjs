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
const rowsByLane = new Map();
for (const lane of readdirSync(FACTORY).filter((n) => /^vf\d+$/.test(n))) {
  const dir = path.join(FACTORY, lane);
  for (const file of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
    let parsed;
    try { parsed = read(path.join(dir, file)); } catch { continue; }
    const rows = Array.isArray(parsed) ? parsed : (parsed.rows ?? []);
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const id = row.itemId ?? row.familyId;
      if (!id) continue;
      if (!rowsByLane.has(lane)) rowsByLane.set(lane, new Map());
      if (!rowsByLane.get(lane).has(id)) rowsByLane.get(lane).set(id, { file: path.join(dir, file), row });
    }
  }
}

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

  const found = rowsByLane.get(lane)?.get(familyId) ?? null;
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
    readerSaid: Object.keys(readerSaid).length > 0 ? readerSaid : null,
    whatIsOwed: {
      ONE_OBLIGATION_SHORT: "A narrow independent re-read of exactly the named obligations on the same bytes, by a lane that did not author the packet. If an obligation does not arise on this form, that is a MEASUREMENT and it is a PASS with the reason recorded -- but somebody has to make it.",
      OUT_OF_VOCABULARY_RESULT: "Read the reader's own words on the named obligations BEFORE assuming the row meant PASS. Where the words record a defect, the honest verdict is a FAIL naming that obligation, and the family needs a repair grant. Where they record only an aside, a re-read may score it PASS with the aside kept in a sibling key.",
      VERDICT_NAMING_NOTHING: "A fresh independent read. No repairer can be dispatched from a failing verdict that names no obligation, and asking a repair lane to re-derive the family is not what a repair lane does.",
      STALE_BOUNDED_REVIEW: "Re-read against the CURRENT bytes. The old review is preserved as history and is never relabelled as covering bytes it did not describe.",
    }[klass],
  });
}

const byClass = {};
for (const r of rows) byClass[r.refusalClass] = (byClass[r.refusalClass] ?? 0) + 1;
const distinctFamilies = new Set(rows.map((r) => r.familyId)).size;

writeFileSync(OUT, JSON.stringify({
  schemaVersion: "rcap-refused-row-recovery-queue/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-refused-row-recovery-queue.mjs",
  generatedAt: new Date().toISOString(),
  whyItExists: "A refused row is a shift already spent that produced no verdict. This says, per refused row, what is owed to recover it and what the reader actually wrote, so a re-read starts from the previous reading instead of from nothing.",
  whatItDoesNotDo: "It upgrades nothing. An obligation scored NOT_MEASURABLE_HERE stays that way until a lane MEASURES it, and PASS_WITH_OBSERVATION is never read as PASS on this file's say-so -- one such row on Illinois records a sealing-only route telling the participant to complete an expungement row on the proposed order.",
  totals: { refusedRows: rows.length, distinctFamilies, byClass },
  rows,
  grantsNothing: "A queue promotes nothing, demotes nothing and approves no packet.",
}, null, 2) + "\n");

console.log(`refused rows: ${rows.length} across ${distinctFamilies} distinct famil(ies)`);
for (const [k, v] of Object.entries(byClass)) console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log(`rows whose original reading was located: ${rows.filter((r) => r.rowFound).length}`);
