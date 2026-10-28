import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

console.log("PASS: Saved guidance opens matter-aware Wilma; technical support remains separate.");
