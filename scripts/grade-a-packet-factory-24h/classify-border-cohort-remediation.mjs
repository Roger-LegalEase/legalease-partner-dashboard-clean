/* Order the synthesized-widget-border cohort for staged remediation.
 *
 * Roger chose complete remediation of the whole cohort in staged batches on
 * 2026-09-10, with an explicit priority: judicial controls first, then sworn
 * selections and declarations, then the other confirmed defects. This script
 * derives that order from FIX80's existing read-only scan. It runs no new scan,
 * opens no PDF and measures nothing.
 *
 * It also does NOT decide that a family is defective. FIX80 measured EXPOSURE --
 * an unwritten widget whose border pdf-lib would synthesize. Whether the
 * delivered artifact actually carries that ink is a separate measurement on the
 * bytes, and Roger was explicit that exposure alone is not a reason to condemn a
 * family. Every row here is a candidate for confirmation, never a verdict.
 *
 * The tier comes from the exposed widget's own field name in the official form,
 * which is why the tiers are stated as what the NAME says rather than as fact
 * about the page.
 */
import { readFileSync, writeFileSync } from "node:fs";

const COHORT = "data/rcap-grade-a/packet-factory-24h/fix80/MK_BORDER_COHORT.json";
const QUEUE = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const OUT = "data/rcap-grade-a/packet-factory-24h/BORDER_COHORT_REMEDIATION.json";

/* A control the COURT operates: the disposition boxes on a proposed order, the
 * judge's own signature and identification, the findings the court writes. Ink
 * the packet did not intend, landing on one of these, is the worst case in the
 * cohort -- it is a mark on a document a judge signs. */
const JUDICIAL = /grant|denied|deny|\border\b|decree|adjudg|judge|judicial officer|court finds|findings|hearing held/i;

/* A control the PARTICIPANT operates under oath, or the officer who takes that
 * oath operates: jurat, notary, the sworn date, an explicit declaration. */
const SWORN = /swear|sworn|affirm|penalt|perjur|verif|certif|declar|jurat|notar|affidav|attest/i;

/* Service of process: who was served, when, and who accepted it. */
const SERVICE = /service|served|mailed|delivered to/i;

const tierOf = (name) => {
  const n = String(name ?? "");
  if (JUDICIAL.test(n)) return "JUDICIAL_CONTROL";
  if (SWORN.test(n)) return "SWORN_OR_DECLARATION";
  if (SERVICE.test(n)) return "SERVICE_RECORD";
  return "OTHER";
};

const TIER_ORDER = ["JUDICIAL_CONTROL", "SWORN_OR_DECLARATION", "SERVICE_RECORD", "OTHER"];

const cohort = JSON.parse(readFileSync(COHORT, "utf8"));
const queue = JSON.parse(readFileSync(QUEUE, "utf8"));
const state = new Map((queue.rows ?? queue.families ?? []).map((r) => [r.familyId ?? r.itemId, r.state ?? r.status]));

const rows = cohort.cohort.map((f) => {
  const widgets = f.exposedWidgets ?? [];
  const byTier = {};
  const named = { JUDICIAL_CONTROL: [], SWORN_OR_DECLARATION: [], SERVICE_RECORD: [] };
  for (const w of widgets) {
    const t = tierOf(w.field);
    byTier[t] = (byTier[t] ?? 0) + 1;
    if (t !== "OTHER") named[t].push({ field: w.field, fieldType: w.fieldType, formNumber: w.formNumber, why: w.why });
  }
  const tier = TIER_ORDER.find((t) => byTier[t]) ?? "OTHER";
  return {
    familyId: f.familyId,
    jurisdiction: f.jurisdiction,
    currentState: state.get(f.familyId) ?? f.masterQueueState ?? null,
    tier,
    widgetsExposed: f.widgetsExposed ?? 0,
    exposedByFieldType: widgets.reduce((a, w) => ((a[w.fieldType] = (a[w.fieldType] ?? 0) + 1), a), {}),
    exposedByTier: byTier,
    namedControls: named,
    builderOptsIn: f.builder?.optsIn ?? null,
    buildScript: f.builder?.buildScript ?? null,
    familyDirectory: f.familyDirectory ?? null,
    confirmation: "NOT_YET_MEASURED_ON_THE_DELIVERED_BYTES",
  };
});

rows.sort((a, b) =>
  TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
  || (b.exposedByTier[b.tier] ?? 0) - (a.exposedByTier[a.tier] ?? 0)
  || b.widgetsExposed - a.widgetsExposed);

const count = (p) => rows.filter(p).length;
const sum = (p, k) => rows.filter(p).reduce((s, r) => s + (k(r) ?? 0), 0);

writeFileSync(OUT, JSON.stringify({
  schemaVersion: "rcap-border-cohort-remediation-order/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/classify-border-cohort-remediation.mjs",
  derivedFrom: COHORT,
  decision: "Roger, 2026-09-10: complete remediation of the whole cohort in staged batches, judicial controls and sworn selections and declarations first. Downward status corrections accepted where evidenced. Exposure alone is not a reason to condemn a family.",
  whatThisIsNot: [
    "Not a new scan. No PDF is opened here and nothing is measured.",
    "Not a verdict. Every row is a CANDIDATE and its confirmation field says so until the delivered bytes are read.",
    "Not an authorization to rebuild. The repair mechanism is gated on FIX121's executed implementation answer, and no other lane may duplicate that investigation.",
  ],
  howTheTierIsDecided: "By the exposed widget's own field name in the official form, which is why a tier is stated as what the name says rather than as a fact about the page. A family takes the highest tier any of its exposed widgets reaches.",
  tiers: {
    JUDICIAL_CONTROL: "A control the court operates: disposition boxes on a proposed order, the judge's signature and identification, the findings the court writes. Unintended ink here lands on a document a judge signs.",
    SWORN_OR_DECLARATION: "A control operated under oath, or by the officer who takes it: jurat, notary, sworn date, an explicit declaration.",
    SERVICE_RECORD: "Who was served, when, and who accepted it.",
    OTHER: "Everything else exposed.",
  },
  totals: {
    families: rows.length,
    widgetsExposed: rows.reduce((s, r) => s + r.widgetsExposed, 0),
    byTier: Object.fromEntries(TIER_ORDER.map((t) => [t, count((r) => r.tier === t)])),
    byCurrentState: rows.reduce((a, r) => ((a[r.currentState] = (a[r.currentState] ?? 0) + 1), a), {}),
    completePacketProvenInCohort: count((r) => r.currentState === "COMPLETE_PACKET_PROVEN"),
    widgetsExposedOnProvenFamilies: sum((r) => r.currentState === "COMPLETE_PACKET_PROVEN", (r) => r.widgetsExposed),
    exposedTextFieldsVersusButtons: rows.reduce((a, r) => {
      for (const [k, v] of Object.entries(r.exposedByFieldType)) a[k] = (a[k] ?? 0) + v;
      return a;
    }, {}),
  },
  aTextFieldIsNotACheckBox: "Four in five exposed widgets are /Tx, not /Btn. Every defect confirmed on a page so far has been a doubled CHECK BOX outline. Whether a synthesized border around an empty text field reaches the delivered page as visible ink is unproven, and it is the first thing confirmation has to settle -- it decides whether this cohort is mostly defective or mostly a false alarm.",
  confirmationTest: [
    "Decompress every flattened widget appearance in each delivered fixture and count those carrying a path-painting operator (S s f F f* B B* b b* sh).",
    "For each stroke-only appearance, find the /AP /N stream in the pinned official source it matches byte for byte. An unmatched one is synthesized; a matched one is the form's own mark and is correct.",
    "Pixel-difference each delivered page against a render of its pinned source and report added AND removed dark pixels. Removed ink where the form draws its own mark is a worse defect than added ink.",
    "A family with zero unmatched stroke-only appearances and zero added dark pixels outside its declared write rects is CONFIRMED_UNAFFECTED. Record it as such. It is not repaired, not rebuilt and not demoted.",
  ],
  grantsNothing: "This ordering opens no route, promotes nothing, demotes nothing and approves no packet. A family is demoted only on evidence from its own delivered bytes, and repaired output is verified by a lane that is neither its builder nor its repairer.",
  rows,
}, null, 2) + "\n");

console.log(`${rows.length} families, ${rows.reduce((s, r) => s + r.widgetsExposed, 0)} exposed widgets`);
for (const t of TIER_ORDER) console.log(`  ${t.padEnd(22)} ${count((r) => r.tier === t)} famil(ies), ${sum((r) => r.tier === t, (r) => r.exposedByTier[t])} widgets so named`);
console.log(`  COMPLETE_PACKET_PROVEN in cohort: ${count((r) => r.currentState === "COMPLETE_PACKET_PROVEN")}`);
console.log(`  wrote ${OUT}`);
