// Generator: build the committed state landing content JSON from the compiled engine profiles.
//
//   npm run expungement:build-state-landing-content
//
// Output: src/lib/expungement-ai/state-landing/generated-state-content.json
//
// This is an INTENDED repo file (analogous to src/lib/rcap-engine/compiled/all51.json):
// the state landing pages import it directly so they never read heavy server-only engine
// modules at render time. The content is a pure projection of the compiled profiles; the
// verifier (expungement:verify-state-landing-pages) re-derives and asserts it is in sync,
// so a stale checkout fails CI rather than shipping drift.

import fs from "node:fs";
import path from "node:path";
import { deriveAllStateContent } from "./lib/state-landing-derive.mjs";

const root = process.cwd();
const OUT = "src/lib/expungement-ai/state-landing/generated-state-content.json";

const { content, problems } = deriveAllStateContent(root);

if (problems.length > 0) {
  console.error("State landing content generation failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

const payload = {
  // Provenance note kept in-band so a reader of the JSON knows it is generated, not authored.
  generatedFrom: "src/lib/rcap-engine/compiled/profiles",
  generator: "scripts/build-state-landing-content.mjs",
  jurisdictionCount: content.length,
  states: content
};

const outPath = path.join(root, OUT);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`Wrote ${OUT} (${content.length} jurisdictions).`);
