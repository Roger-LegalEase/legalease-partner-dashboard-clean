import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { briefcaseWilmaCtaPredecessor } from "../src/lib/rcap/fulfillment/question-contract-source-successor.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");

const matterPage = source("src/app/briefcase/[packetId]/page.tsx");
const shell = source("src/components/expungement-ai/BriefcaseShell.tsx");
const bubble = source("src/components/expungement-ai/WilmaBubble.tsx");

const start = matterPage.indexOf("function SavedResultValue(");
const end = matterPage.indexOf("function ReadyPacket(", start);
assert(start !== -1 && end > start, "Saved-result guidance component must be present");
const guidance = matterPage.slice(start, end);

// A guidance-only matter must open Wilma in place, not send the person to
// technical support. Support remains a separate, explicitly labeled action.
assert.match(
  guidance,
  /href="#ask-wilma"[\s\S]{0,250}Ask Wilma to explain this/,
  "Ask Wilma to explain this must target the in-page chat"
);
assert.doesNotMatch(guidance, /\/expungement-ai\/support/, "Guidance CTA must not link to support");

// The existing bubble deliberately handles both first-time hash navigation and
// repeated clicks, including when the fragment is already in the address bar.
assert.match(bubble, /window\.location\.hash === "#ask-wilma"/);
assert.match(bubble, /'a\[href="#ask-wilma"\]'/);
assert.match(bubble, /if \(link\) openGuide\(\)/);
assert.match(bubble, /document\.addEventListener\("click", openFromLink\)/);

// Matter context must remain authenticated and owner-scoped; opening the
// widget must not redirect or manufacture a new consumer matter.
assert.match(matterPage, /briefcaseItemId=\{item\?\.id\}/);
assert.match(shell, /<WilmaBubble context="briefcase" state=\{caseState\} briefcaseItemId=\{briefcaseItemId\}/);

// Keep the historical copy approval unchanged: the current page must differ by exactly this CTA.
const predecessor = briefcaseWilmaCtaPredecessor(Buffer.from(matterPage));
assert.equal(createHash("sha256").update(predecessor).digest("hex"), "023ec211357b2fbc55694f84a60b07a7e498827d63c5cfb8a81e400c7f0edc66");
// The continuity controls run without Node globals in their isolated VM.
const isolatedPredecessor = runInNewContext(`(${briefcaseWilmaCtaPredecessor.toString()})`, {
  sha: bytes => createHash("sha256").update(bytes).digest("hex"),
  insist: (condition, message) => assert(condition, message)
});
assert.equal(isolatedPredecessor(Buffer.from(matterPage)), predecessor.toString("utf8"));
for (const altered of [
  matterPage.replace('href="#ask-wilma"', 'href="/expungement-ai/support"'),
  matterPage.replace("Ask Wilma to explain this", "Contact support"),
  matterPage.replace("briefcaseItemId={item?.id}", "briefcaseItemId={undefined}"),
  matterPage + "\n// unrelated drift\n"
]) {
  assert.throws(() => briefcaseWilmaCtaPredecessor(Buffer.from(altered)), /source successor refused/);
}

console.log("PASS: Saved guidance opens matter-aware Wilma; technical support remains separate.");
