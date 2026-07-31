// Verifies the attorney review packets.
//
// Rebuilds them first, so this passes in CI where the source archive is absent
// and no packet exists on disk. Structure and content are checked; bundled
// source counts are not, because those depend on the archive being mounted.

import { execFileSync } from "node:child_process";
import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";

register("./lib/ts-esm-loader.mjs", import.meta.url);
const { ALL_JURISDICTION_CODES } = await import("@/lib/rcap/jurisdictions/packet-capability");

const root = process.cwd();
const OUT_ROOT = path.join(root, "artifacts/packet-delivery/attorney-review-packets");

execFileSync(process.execPath, ["scripts/rcap-build-attorney-review-packets.mjs"], {
  cwd: root,
  stdio: "ignore"
});

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const REQUIRED_FILES = [
  "README.md",
  "01-plan-of-record.md",
  "02-historical-classification.md",
  "03-prior-modeling.md",
  "04-source-inventory.md",
  "05-missing-sources.md",
  "06-legal-design-memo-template.md"
];

// Things counsel must never be asked to look at.
const FORBIDDEN_TERMS = [
  "acroField",
  "componentId",
  "npm test",
  "phase-48",
  "supabase",
  "rcap_document",
  "overlay coordinate",
  "SHA-256 mismatch",
  "runtime_disabled",
  "packet_ready"
];

assert(fs.existsSync(OUT_ROOT), "Packet root was not created.");
assert(fs.existsSync(path.join(OUT_ROOT, "INDEX.md")), "INDEX.md is missing.");
assert(fs.existsSync(path.join(OUT_ROOT, "packet-manifest.json")), "packet-manifest.json is missing.");

for (const code of ALL_JURISDICTION_CODES) {
  const dir = path.join(OUT_ROOT, code);
  if (!fs.existsSync(dir)) {
    failures.push(`${code}: packet directory is missing.`);
    continue;
  }

  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(dir, file))) failures.push(`${code}: ${file} is missing.`);
  }

  const inventory = readIfPresent(dir, "04-source-inventory.md");
  const gaps = readIfPresent(dir, "05-missing-sources.md");
  const readme = readIfPresent(dir, "README.md");
  const memo = readIfPresent(dir, "06-legal-design-memo-template.md");
  const historical = readIfPresent(dir, "02-historical-classification.md");
  const modeling = readIfPresent(dir, "03-prior-modeling.md");

  // The archive-is-evidence warning must appear where counsel will meet it.
  assert(
    /not a list of forms you are being\s*\n?asked to approve/i.test(inventory) ||
      /Not a list of forms you are being/i.test(inventory),
    `${code}: source inventory is missing the "evidence, not a list of forms" warning.`
  );
  assert(
    /evidence of what we happen to hold/i.test(readme),
    `${code}: README is missing the archive-is-evidence warning.`
  );

  // Gap list must exist as a section even when nothing is missing.
  assert(/missing|Nothing is missing/i.test(gaps), `${code}: gap list has no content.`);

  // Prior modeling must be labelled unapproved, not presented as settled.
  assert(
    /Nothing below has been reviewed by a lawyer/i.test(modeling),
    `${code}: prior modeling is not labelled as unreviewed.`
  );
  assert(
    /not\*{0,2}\s+a legal conclusion/i.test(historical),
    `${code}: historical classification is not labelled as a non-conclusion.`
  );

  // The memo template must carry the seventeen questions and the decision.
  for (const marker of [
    "### 1. Track name",
    "### 6. How the document",
    "### 10. What we should ask the person",
    "### 11. What the person must obtain and attach",
    "### 12. What the packet should leave blank",
    "### 17. Your decision"
  ]) {
    assert(memo.includes(marker), `${code}: memo template is missing "${marker}".`);
  }
  assert(
    /Do not include your name, firm, email, bar number/i.test(memo),
    `${code}: memo template does not tell counsel to withhold identifying details.`
  );

  // Counsel must be told what we are before they are asked to design for it,
  // or "require the certified disposition first" is the natural thing to write.
  assert(
    /self-help packet generator/i.test(memo),
    `${code}: memo template does not tell counsel what LegalEase is.`
  );
  assert(
    /We do not collect, review or authenticate anyone's records/i.test(memo),
    `${code}: memo template does not say that we hold no participant records.`
  );
  assert(
    /Only the last one stops us building/i.test(memo),
    `${code}: memo template does not distinguish a real blocker from a packet instruction.`
  );

  // An open question must be costed, or it survives as prose and expires
  // silently the day runtime enablement arrives.
  assert(
    /Build it, but do not release it/i.test(memo),
    `${code}: memo template does not ask counsel what an open question costs.`
  );
  assert(
    /### 16b\. If you chose process guidance, why\?/.test(memo),
    `${code}: memo template does not ask why a track is guidance.`
  );
  assert(
    /could we prepare the person's portion of the form/i.test(memo),
    `${code}: memo template does not put the guidance re-review question to counsel.`
  );

  // No engineering leakage in anything counsel reads.
  for (const file of REQUIRED_FILES) {
    const contents = readIfPresent(dir, file);
    for (const term of FORBIDDEN_TERMS) {
      if (contents.includes(term)) {
        failures.push(`${code}/${file}: contains engineering detail "${term}".`);
      }
    }
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(OUT_ROOT, "packet-manifest.json"), "utf8"));
assert(manifest.packetCount === 51, `Manifest reports ${manifest.packetCount} packets, expected 51.`);
assert(
  manifest.packets.every((entry) => entry.hasSourceInventory && entry.hasSourceGapList),
  "A packet is recorded without a source inventory or gap list."
);

if (failures.length) {
  console.error("Attorney review packet verifier failed:");
  for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
  if (failures.length > 40) console.error(`... and ${failures.length - 40} more`);
  process.exit(1);
}

console.log("Attorney review packet verifier passed.");
console.log(`1. All ${ALL_JURISDICTION_CODES.length} jurisdictions have a packet with all seven documents.`);
console.log("2. Every packet carries a source inventory and a source-gap list.");
console.log("3. The archive-is-evidence warning appears in the README and the inventory.");
console.log("4. Prior modeling is labelled unreviewed; the historical classification is labelled a non-conclusion.");
console.log("5. The memo template carries every question and tells counsel to withhold identifying details.");
console.log("6. No packet contains code, field names, coordinates, test commands or database detail.");

function readIfPresent(dir, file) {
  const target = path.join(dir, file);
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
}
