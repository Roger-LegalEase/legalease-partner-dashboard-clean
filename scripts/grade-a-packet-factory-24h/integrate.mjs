#!/usr/bin/env node
/*
 * The integration entry point, and the sequence it exists to enforce.
 *
 * WHY THIS EXISTS. Three times in one day the same two mistakes cost real
 * movement, and both were mine rather than a lane's:
 *
 *   1. A built family stayed invisible because the completeness matrix had not
 *      been rewritten after its return was merged. The raster gate reads
 *      f.counters from that matrix and refuses a family with "no completeness
 *      audit" whatever its builder produced, so nd-summary-marijuana-pardon-set
 *      sat in SOURCE_READY with a finished packet.
 *   2. generate.mjs REFUSED TO WRITE ANYTHING because the claim ledger and the
 *      generated dispatch disagreed about two families out of 346, and I read
 *      the family counts instead of the exit code -- then reported "no
 *      movement" twice when what had happened was "no write".
 *
 * There is a third, quieter one: a family can hold a fifteen-obligation
 * independent PASS, a hash-bound RASTER_PASS and no open legal input and still
 * sit at VERIFIED_PASS because product-wiring.json has not been generated. That
 * file is the fourth condition of the terminal transition and it is generated,
 * not authored.
 *
 * So this is not a new queue, framework or dashboard. It is the order those
 * steps have to run in, with every exit status captured, and a report that is
 * refused rather than printed when a step fails.
 *
 * WHAT IT WILL NOT DO. It does not move a claim. A dispatch disagreement is
 * reported with both lane names and the family, and left for a person to
 * reconcile against authorized ownership -- transferring a grant to make a
 * check pass is how a lane loses work it had already done.
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const QUEUE = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const TERMINAL = new Set(["COMPLETE_PACKET_PROVEN", "GUIDANCE_READY", "HANDOFF_READY", "OUT_OF_SCOPE"]);

const LIBRARY = process.env.MASTER_LIBRARY_SOURCE_DIR;
if (!LIBRARY) {
  console.error("REFUSED: MASTER_LIBRARY_SOURCE_DIR is unset. Every generator below reads it, and a run without it");
  console.error("         produces a queue that silently describes a corpus this checkout does not have.");
  process.exit(2);
}

/* The chain, in the only order that works, with why each step is where it is. */
const CHAIN = [
  { name: "extract verifier returns",
    argv: ["scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs"],
    why: "Reads every lane's return and selects the current verdict per family. Must precede generate.mjs, which reads its output." },
  { name: "completeness audit",
    argv: ["scripts/rcap-packet-completeness/verify-packet-completeness.mjs", "--write"],
    why: "Rewrites PACKET_COMPLETENESS_MATRIX.json. A family merged since the last audit has no counters, and the raster gate refuses it as \"no completeness audit\" however finished its packet is." },
  { name: "product wiring",
    argv: ["scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs"],
    why: "A declared product wiring is the fourth condition of the terminal transition. Without it a family with a PASS, a bound RASTER_PASS and no legal input stops at VERIFIED_PASS." },
  { name: "generate (first pass)",
    argv: ["scripts/grade-a-packet-factory-24h/generate.mjs"],
    why: "Derives every family state from the records above and writes the dispatch." },
  { name: "raster queue",
    argv: ["scripts/grade-a-packet-factory-24h/generate-raster-queue.mjs"],
    why: "Enrols newly eligible families and folds admitted receipts into their rows. Reads the queue the first pass just wrote." },
  { name: "generate (second pass)",
    argv: ["scripts/grade-a-packet-factory-24h/generate.mjs"],
    why: "Re-derives state now that the raster queue carries the new receipts. Without it an admitted family stays BUILT_RASTER_PENDING." }
];

const readCounts = () => {
  try {
    const q = JSON.parse(fs.readFileSync(path.join(ROOT, QUEUE), "utf8"));
    const byState = new Map();
    for (const f of q.families ?? []) byState.set(f.state, (byState.get(f.state) ?? 0) + 1);
    const states = new Map((q.families ?? []).map((f) => [f.familyId, f.state]));
    let terminal = 0;
    for (const [s, n] of byState) if (TERMINAL.has(s)) terminal += n;
    return { byState, states, terminal, completePacketProven: byState.get("COMPLETE_PACKET_PROVEN") ?? 0 };
  } catch { return null; }
};

const before = readCounts();

/*
 * A dispatch disagreement is the one failure whose message is worth
 * translating, because the generator's own line names the symptom and not the
 * choice a person has to make.
 */
const explainRefusal = (output) => {
  const rows = [...output.matchAll(/^\s*(\w+)\/(\S+): matching claim belongs to (\w+)$/gm)]
    .map((m) => ({ dispatchLane: m[1], familyId: m[2], ledgerLane: m[3] }));
  if (!rows.length) return null;
  const lines = [
    "",
    "  THE LEDGER AND THE GENERATED DISPATCH NAME DIFFERENT LANES, so generate.mjs wrote NOTHING.",
    "  Every family's state is stale until this is reconciled -- including the ones that moved.",
    ""
  ];
  for (const r of rows) lines.push(`    ${r.familyId}: dispatch says ${r.dispatchLane}, ledger says ${r.ledgerLane}`);
  lines.push("",
    "  Reconcile against AUTHORIZED OWNERSHIP, not against whichever answer clears the check.",
    "  If a lane is executing the family now, the dispatch is wrong and the roster needs regenerating.",
    "  If nobody is, the claim moves to the lane the dispatch names -- and only then.",
    "  Moving a grant to silence this is how a lane loses work it has already done.");
  return lines.join("\n");
};

for (const step of CHAIN) {
  process.stdout.write(`\n== ${step.name}\n   ${step.why}\n`);
  const r = spawnSync("node", step.argv, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.status !== 0) {
    console.error(`\nFAILED at "${step.name}" (exit ${r.status})`);
    console.error(`  command: node ${step.argv.join(" ")}`);
    const explained = explainRefusal(output);
    if (explained) console.error(explained);
    else console.error(output.split("\n").slice(-25).join("\n"));
    console.error("\nNo later step ran and NO TRANSITION IS REPORTED. The counts in the queue are from before this run");
    console.error("and reporting them now would be reporting a checkpoint that did not happen.");
    process.exit(1);
  }
  /* A step can exit 0 and still refuse individual rows; those refusals are the
   * lane's evidence and are surfaced rather than summarised away. */
  for (const line of output.split("\n")) {
    if (/refused|REFUSED|not eligible|unreadable/.test(line) && line.trim()) console.log(`   | ${line.trim().slice(0, 200)}`);
  }
}

const after = readCounts();
if (!before || !after) { console.error("\nREFUSED: the queue could not be read before and after; no transition report."); process.exit(1); }

const moved = [];
for (const [familyId, state] of after.states) {
  const was = before.states.get(familyId);
  if (was !== state) moved.push({ familyId, from: was ?? "(absent)", to: state });
}
moved.sort((a, b) => a.familyId.localeCompare(b.familyId));

console.log(`\n== transitions (${moved.length})`);
for (const m of moved) console.log(`   ${m.familyId}: ${m.from} -> ${m.to}`);
console.log(`\n== terminal ${after.terminal} of ${[...after.byState.values()].reduce((a, b) => a + b, 0)}`
  + ` (was ${before.terminal})`);
console.log(`   COMPLETE_PACKET_PROVEN ${after.completePacketProven} (was ${before.completePacketProven})`);
for (const [s, n] of [...after.byState].sort((a, b) => b[1] - a[1])) {
  if (!TERMINAL.has(s)) console.log(`   ${s} ${n}`);
}
console.log("\nEvery step exited 0. These counts are this run's, not the previous one's.");
