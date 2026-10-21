import fs from "node:fs";
import { createRequire } from "node:module";
import { extractTextItems, groupIntoLines } from "/home/user/legalease-partner-dashboard-clean/.claude/worktrees/kspath/scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs";
const require = createRequire("/home/user/legalease-partner-dashboard-clean/package.json");
const { PDFDocument } = require("pdf-lib");
for (const f of process.argv.slice(2)) {
  const doc = await PDFDocument.load(fs.readFileSync(f), { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  console.log(`\n## ${f}  pages=${pages.length}`);
  pages.forEach((p, i) => {
    for (const l of groupIntoLines(extractTextItems(p))) {
      const t = (l.text ?? "").toString();
      if (/Route|obligation:|expungement-und|er-12-45/.test(t)) console.log(`  p${i + 1}: ${JSON.stringify(t)}`);
    }
  });
}
