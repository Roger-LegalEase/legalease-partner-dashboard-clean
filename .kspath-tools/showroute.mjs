import fs from "node:fs";
import { createRequire } from "node:module";
import { extractTextItems, groupIntoLines } from "/home/user/legalease-partner-dashboard-clean/.claude/worktrees/kspath/scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs";
const require = createRequire("/home/user/legalease-partner-dashboard-clean/package.json");
const { PDFDocument } = require("pdf-lib");
const f = process.argv[2];
const doc = await PDFDocument.load(fs.readFileSync(f), { ignoreEncryption: true, updateMetadata: false });
doc.getPages().forEach((p, i) => {
  const ls = groupIntoLines(extractTextItems(p)).map((l) => (l.text ?? "").toString().trim()).filter(Boolean);
  console.log(`p${i+1} tail:`, JSON.stringify(ls.slice(-4)));
});
