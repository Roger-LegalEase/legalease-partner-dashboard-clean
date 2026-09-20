#!/usr/bin/env node
/**
 * WAVE 2 VERIFICATION LEDGER — one row per family, one schema, one place.
 *
 *   node scripts/grade-a-launch-control/generate-wave-2-verification-ledger.mjs
 *
 * Seven shards returned seven schemas for the same forty-three rows: the verdict
 * reason lives under stopReason, decisiveFailure, rowStop, finding or blocker
 * depending on which one wrote it, and the proof obligations are an object in
 * four shards and an array in three. Normalising here rather than asking a
 * reader to hold seven shapes in their head is the whole point of a ledger.
 *
 * The normaliser refuses rather than guesses: a row whose decisive obligation
 * cannot be located is carried as UNRESOLVED_IN_RETURN, because a ledger that
 * invents a defect is worse than one that admits it could not read a return.
 *
 * The earlier BLOCKED_SOURCE results are retired by this file's existence: they
 * recorded an absent Master Library, and the library was restored.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const RETURNS = {
  V1: "838d75fed7c4628fa501cd135c81b748f1522afa",
  V2: "34417136e9d3eb307ac836bc6dd4e0b8a91abf60",
  V3: "b39918e73206a17f240289932873c847c3122cdc",
  V4: "009b6204b4ee3b6d6e9b58a82b8832883c17fd4f",
  V5: "6645e90ad3695f11b1cfc050fff208e996a1a75b",
  V6: "6777009977e7bbfad88b04fab48be952d53425f4",
  V7: "4f0261e23b41eab5ef92e78cc898facae682850b"
};
const SUPERSEDED = {
  V1: "e14950ec5b9d9a74b300f1d076b488e1f5ebd772", V2: "85b58750104f85f8ed4d35362581ba4a7f9a950f",
  V3: "6fe1432af7f8aadb06087a699880dc85707a285f", V4: "ed8176e98344d715040bfdaeaacb684ef04aec2e",
  V5: "79922470a6a16264ba268b026097800faa9839f7", V6: "6e2e41fbadfaed782a68f6cb03844091b337bf5c",
  V7: "ce6bd1b174b518ecc11a69fb5214899abff8a83e"
};

/** Every shard's obligation list, as [name, result, observed, readFrom]. */
const obligationsOf = (row) => {
  const po = row.proofObligations;
  if (Array.isArray(po)) {
    return po.map((e) => [e.obligation, e.result ?? e.status ?? e.outcome ?? e.evaluation, e.value ?? e.observed, e.where ?? e.readFrom]);
  }
  return Object.entries(po).map(([name, v]) => [name, v.evaluation ?? v.outcome ?? v.status ?? v.result, v.observed ?? v.value, v.readFrom ?? v.where]);
};
const isBad = (result) => /FAIL|BLOCK/.test(String(result ?? ""));

/** The reason, wherever this shard chose to put it. */
const reasonOf = (row, decisive) => {
  if (typeof row.stopReason === "string" && row.stopReason.trim()) return row.stopReason.trim();
  if (row.rowStop) return typeof row.rowStop === "string" ? row.rowStop : String(row.rowStop.reason ?? "");
  if (typeof row.finding === "string" && row.finding.trim()) return row.finding.trim();
  if (typeof row.blocker === "string" && row.blocker.trim()) return row.blocker.trim();
  if (decisive?.[2]) return String(decisive[2]);
  return null;
};

/**
 * The seventeen legal-input blocks, classified. The distinction that matters is
 * whether the answer is a legal one at all: a filing fee that no record states
 * is an operational fact somebody must look up, and sending it to counsel wastes
 * the one reviewer nothing else can replace.
 */
const classifyLegalInput = (row, decisiveName, reason) => {
  const t = `${reason ?? ""} ${decisiveName ?? ""}`.toLowerCase();
  if (t.includes("legal-design review")) {
    return { class: "MISSING_LEGAL_REVIEW_RECORD", owner: "state legal-design review", sendToLawrence: false,
      why: "A state-level legal-design review the controlling library requires does not exist. Until it does there is nothing family-specific to ask." };
  }
  if (t.includes("no statewide mandatory primary application") || t.includes("not filing") || t.includes("source_gated") || t.includes("gate_open") || t.includes("disabled pending release")) {
    return { class: "MISSING_ROUTE_FAMILY_BINDING", owner: "Captain route/family binding", sendToLawrence: false,
      why: "The family is not bound to a filing route, or its manifest still gates it. That is a binding to settle, not a question to answer." };
  }
  if (t.includes("fee") || t.includes("waiver")) {
    return { class: "MISSING_ARTIFACT_SPECIFIC_APPROVAL_INPUT", owner: "source/operations: current fee schedule for the exact court", sendToLawrence: false,
      why: "The blocker is the current filing fee or waiver treatment for a named court. That is an operational fact to look up and record, not a legal question. Sending it to counsel spends the reviewer on something a fee schedule answers." };
  }
  return { class: "GENUINE_NARROW_LEGAL_QUESTION", owner: "Lawrence (counsel)", sendToLawrence: true,
    why: "The controlling record leaves a legal treatment genuinely open and the family cannot proceed without counsel deciding it." };
};

const nextStep = (verdict, cls) => {
  if (verdict === "PASS") return { owner: "Lawrence (counsel)", action: "exact-hash output review against the recorded canonical and boundary artifact hashes" };
  if (verdict === "FAIL_REPAIR_REQUIRED") return { owner: "packet repair lane", action: "repair the decisive defect in the family's own overlay, then re-verify on the same shard" };
  return { owner: cls.owner, action: cls.class === "GENUINE_NARROW_LEGAL_QUESTION" ? "answer the narrow legal question and record it as a controlling decision" : "supply the missing input and record it in the controlling file, then re-verify" };
};

const rows = [];
for (const [shard, sha] of Object.entries(RETURNS)) {
  const doc = read(`data/rcap-grade-a/wave-2/verification/${shard.toLowerCase()}/rows.json`);
  for (const row of doc.rows) {
    const obligations = obligationsOf(row);
    /*
     * One shard records no per-obligation result at all; its stopReason names the
     * obligation instead, as "Stopped at 'complete component set': ...". Reading
     * the name out of the sentence is exact, because the sentence is the only
     * place that shard put it.
     */
    const quoted = typeof row.stopReason === "string" ? row.stopReason.match(/Stopped at '([^']+)'/)?.[1] : null;
    const decisive = obligations.find(([, r]) => isBad(r))
      ?? (quoted ? obligations.find(([name]) => name === quoted) : null)
      ?? null;
    const decisiveName = decisive?.[0]
      ?? quoted
      ?? (typeof row.decisiveFailure === "string" ? row.decisiveFailure : null)
      ?? (row.rowStop && typeof row.rowStop === "object" ? row.rowStop.atObligation : null)
      ?? (typeof row.stopAtObligation === "number" ? obligations[row.stopAtObligation - 1]?.[0] : null);
    const reason = reasonOf(row, decisive);
    const cls = row.verdict === "BLOCKED_LEGAL_APPROVAL_INPUT" ? classifyLegalInput(row, decisiveName, reason) : null;
    const step = nextStep(row.verdict, cls);
    const passed = obligations.filter(([, r]) => /PASS/.test(String(r ?? ""))).length;

    rows.push({
      family: row.itemId,
      shard,
      returnCommit: sha,
      verdict: row.verdict,
      decisiveObligation: decisiveName ?? (row.verdict === "PASS" ? null : "UNRESOLVED_IN_RETURN"),
      exactBlockerOrDefect: row.verdict === "PASS" ? null : (reason ?? "UNRESOLVED_IN_RETURN"),
      exactEvidence: {
        readFrom: decisive?.[3] ?? row.familyDirectory ?? null,
        routeKeys: row.routeKeys ?? null,
        pinnedSources: row.pinnedSources ?? null,
        preflight: row.preflight ?? null,
        obligationsEvaluated: obligations.length,
        obligationsPassed: passed
      },
      legalInputClass: cls?.class ?? null,
      legalInputWhy: cls?.why ?? null,
      sendToLawrence: row.verdict === "PASS" ? true : (cls?.sendToLawrence ?? false),
      requiredNextOwner: step.owner,
      requiredNextAction: step.action
    });
  }
}

const by = (v) => rows.filter((r) => r.verdict === v);
const unresolved = rows.filter((r) => r.decisiveObligation === "UNRESOLVED_IN_RETURN" || r.exactBlockerOrDefect === "UNRESOLVED_IN_RETURN");

const ledger = {
  schemaVersion: "rcap-grade-a-wave-2-verification-ledger/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-wave-2-verification-ledger.mjs",
  what: "One row per verified packet family: the verdict, the obligation it turned on, the exact blocker or defect, the exact evidence, and who owns the next step.",
  supersedes: {
    results: "the Wave 2 BLOCKED_SOURCE returns",
    commits: SUPERSEDED,
    why: "Those rows recorded an absent private Master Library, not a packet. The library was restored and every family was re-evaluated, so the environment-only results are retired and must not be cited as verdicts."
  },
  returnsIntegrated: RETURNS,
  sevenSchemasNormalised:
    "The shards returned the verdict reason under stopReason, decisiveFailure, rowStop, finding or blocker, and the proof obligations as an object in four shards and an array in three. This ledger is the single shape; the returns are unchanged underneath it.",
  counts: {
    evaluated: rows.length,
    PASS: by("PASS").length,
    FAIL_REPAIR_REQUIRED: by("FAIL_REPAIR_REQUIRED").length,
    BLOCKED_LEGAL_APPROVAL_INPUT: by("BLOCKED_LEGAL_APPROVAL_INPUT").length,
    BLOCKED_SOURCE: rows.filter((r) => r.verdict === "BLOCKED_SOURCE").length,
    unresolvedInReturn: unresolved.length
  },
  legalInputClassification: Object.fromEntries(
    ["MISSING_LEGAL_REVIEW_RECORD", "MISSING_ARTIFACT_SPECIFIC_APPROVAL_INPUT", "MISSING_ROUTE_FAMILY_BINDING", "GENUINE_NARROW_LEGAL_QUESTION"]
      .map((c) => [c, rows.filter((r) => r.legalInputClass === c).map((r) => r.family)])
  ),
  doNotSendAllSeventeen:
    "Only the rows classed GENUINE_NARROW_LEGAL_QUESTION are counsel's. The rest are a missing fee schedule, a missing state legal-design review or an unbound family: sending them to Lawrence would spend the one reviewer nothing else can replace on questions a fee schedule or a Captain binding answers.",
  commercialPosture: "A PASS proves a packet was built and verified as specified. It opens no commercial route and approves no output; COMPLETE_PACKET_PROVEN stays 0 until PASS plus output approval plus product-path proof.",
  rows
};

fs.writeFileSync("data/rcap-grade-a/launch-control/WAVE_2_VERIFICATION_LEDGER.json", `${JSON.stringify(ledger, null, 2)}\n`);
console.log(`ledger: ${ledger.counts.evaluated} rows — PASS ${ledger.counts.PASS}, REPAIR ${ledger.counts.FAIL_REPAIR_REQUIRED}, LEGAL ${ledger.counts.BLOCKED_LEGAL_APPROVAL_INPUT}, SOURCE ${ledger.counts.BLOCKED_SOURCE}, unresolved ${ledger.counts.unresolvedInReturn}`);
for (const [c, fams] of Object.entries(ledger.legalInputClassification)) console.log(`  ${String(fams.length).padStart(2)}  ${c}`);
