/**
 * Generator convergence.
 *
 * C13 found that every generator's `--check` mode printed an in-memory summary
 * and exited zero. It read no generated file, compared nothing, and wrote
 * nothing -- so the READY_TO_RUN step named "Generator convergence" converged
 * nothing, and a hand-edit to MASTER_QUEUE.json, to a manifest entry, or to a
 * dispatched worker prompt passed the whole gate once committed. C13
 * demonstrated it: a manifest entry repointed at an off-publisher host with its
 * expected hash deleted passed all ten steps green.
 *
 * A generator is a function from inputs to files. Convergence is the claim that
 * the committed files are that function's output. The only way to check it is
 * to compute the output and compare bytes.
 *
 * So every generator routes its writes through emit(). Without --check emit
 * writes. With --check it compares against what is committed and exits non-zero
 * on the first divergence, naming the file.
 *
 * sweep() closes the other half: a file that sits in a generated directory but
 * that no emit() produced is an orphan, and an injected prompt is exactly that
 * shape. Comparing only the files we emit would never see it.
 */
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/*
 * Two things in a generated file legitimately change between runs and cannot
 * converge byte-for-byte: the dispatch pin (a 40-hex commit SHA, which is a
 * different commit every time Captain regenerates) and the generation
 * timestamp. Everything else is a function of the inputs.
 *
 * They are normalized out of the comparison rather than ignored, and the pin is
 * then checked directly instead: the committed files must carry exactly ONE
 * distinct 40-hex value, and that value must be a commit this checkout carries
 * and an ancestor of HEAD. Masking the pin without checking it would hand back
 * the hand-edit the comparison exists to catch, on the single field that
 * decides which dispatch a worker is answering.
 *
 * SHA-256 source hashes are 64 hex and are untouched by this, so an expected
 * form hash still has to match byte-for-byte.
 */
const SHA40 = /\b[0-9a-f]{40}\b/g;
/*
 * A DISPATCH PIN IS A NAMED FIELD, NOT ANY FORTY HEX CHARACTERS.
 *
 * The pin check used to collect every 40-hex string in every generated file and
 * insist they were all equal. That works only for as long as no generated file
 * QUOTES a commit, and generated files quote commits constantly: a verifier
 * records the base it read, a receipt records what it rendered, a finding cites
 * where it was measured. One such quotation inside a family's
 * failedObligations[].evidence — a verifier naming the commit it read the
 * packet at — was enough to report two dispatch pins and refuse convergence,
 * on a dispatch that had exactly one pin and was entirely correct.
 *
 * So the check reads the fields that ARE pins. Normalisation still blanks every
 * 40-hex string, which is what keeps the content comparison pin-insensitive and
 * is right: a quoted commit in prose should not make two otherwise identical
 * files differ either.
 */
const PIN_FIELD = /"(?:minimumCaptainSha|dispatchPin|packetCommitSha|generatedAtCommit|captainSha|baseSha|pinnedCommit)"\s*:\s*"([0-9a-f]{40})"/g;
const ISO_MS = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g;

export function makeEmitter({ root, check, label, volatilePin = true }) {
  const emitted = new Set();
  const drift = [];
  let written = 0;

  const committedPins = new Set();
  const normalize = (t) => (volatilePin ? t.replace(SHA40, "<dispatch-pin>").replace(ISO_MS, "<generated-at>") : t);

  const emit = (rel, content) => {
    const abs = path.join(root, rel);
    emitted.add(path.resolve(abs));
    if (!check) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
      written += 1;
      return;
    }
    if (!fs.existsSync(abs)) { drift.push(`${rel}: the generator produces it and the checkout does not carry it`); return; }
    const committed = fs.readFileSync(abs, "utf8");
    if (volatilePin) for (const m of committed.matchAll(PIN_FIELD)) committedPins.add(m[1]);
    const a = normalize(committed);
    const b = normalize(content);
    if (a === b) return;
    const c = crypto.createHash("sha256").update(a).digest("hex").slice(0, 12);
    const g = crypto.createHash("sha256").update(b).digest("hex").slice(0, 12);
    drift.push(`${rel}: committed ${committed.length}B sha ${c} != generated ${content.length}B sha ${g} (after normalizing the dispatch pin and the timestamp)`);
  };

  // Directories whose entire matching contents this generator owns. Anything
  // matching that emit() did not produce is an edit no generator would make.
  const sweeps = [];
  const sweep = (relDir, matches) => sweeps.push({ relDir, matches });

  const finish = () => {
    for (const { relDir, matches } of sweeps) {
      const abs = path.join(root, relDir);
      if (!fs.existsSync(abs)) continue;
      for (const name of fs.readdirSync(abs)) {
        const p = path.join(abs, name);
        if (!fs.statSync(p).isFile() || !matches(name)) continue;
        if (!emitted.has(path.resolve(p))) {
          drift.push(`${path.join(relDir, name)}: present in the checkout and produced by no generator`);
        }
      }
    }
    if (!check) return { written };
    // The pin, checked directly because the comparison above masks it.
    if (volatilePin && committedPins.size > 1) {
      drift.push(`the committed files carry ${committedPins.size} distinct dispatch pins (${[...committedPins].join(", ")}); one dispatch has one pin`);
    }
    for (const pin of committedPins) {
      const ok = (args) => { try { execFileSync("git", args, { cwd: root, stdio: "ignore" }); return true; } catch { return false; } };
      if (!ok(["cat-file", "-e", `${pin}^{commit}`])) drift.push(`dispatch pin ${pin} is not a commit this checkout carries`);
      else if (!ok(["merge-base", "--is-ancestor", pin, "HEAD"])) drift.push(`dispatch pin ${pin} is not an ancestor of HEAD; this dispatch answers a history this checkout is not on`);
    }
    if (drift.length) {
      console.error(`GENERATOR DIVERGENCE — ${label}: ${drift.length} file(s) are not this generator's output.`);
      for (const d of drift.slice(0, 25)) console.error(`  ${d}`);
      if (drift.length > 25) console.error(`  ... and ${drift.length - 25} more`);
      console.error("Regenerate and commit the result. A hand-edited generated file is a claim no generator makes.");
      process.exit(1);
    }
    const pin = [...committedPins][0];
    console.log(`${label}: ${emitted.size} generated file(s) converge with the checkout${pin ? ` at dispatch pin ${pin}` : ""}.`);
    return { compared: emitted.size };
  };

  return { emit, sweep, finish };
}
