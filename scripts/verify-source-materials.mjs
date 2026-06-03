import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const states = [
  {
    label: "Mississippi",
    readme: "docs/reference/mississippi/README.md",
    pdf: "reference/mississippi/Mississippi-Expungement-Agent-Reference.pdf",
    html: "reference/mississippi/ms-expungement-petitions.html"
  },
  {
    label: "Illinois",
    readme: "docs/reference/illinois/README.md",
    pdf: "reference/illinois/Illinois-Expungement-Sealing-Agent-Reference.pdf",
    html: "reference/illinois/il-expungement-companion-forms.html"
  },
  {
    label: "DC",
    readme: "docs/reference/dc/README.md",
    pdf: "reference/dc/DC-Expungement-Sealing-Agent-Reference.pdf",
    html: "reference/dc/dc-motion-to-seal-expunge.html"
  },
  {
    label: "Pennsylvania",
    readme: "docs/reference/pennsylvania/README.md",
    pdf: "reference/pennsylvania/Pennsylvania-Expungement-Sealing-Agent-Reference.pdf",
    html: "reference/pennsylvania/pa-petition-expungement-790.html",
    extraPdf: "reference/pennsylvania/222612-petitionforexpungement790030912-000077.pdf"
  }
];

for (const state of states) {
  assertPdf(state.label, state.pdf);
  if (state.extraPdf) assertPdf(state.label, state.extraPdf);
  assertHtml(state.label, state.html);
  assertReadme(state);
}

if (failures.length > 0) {
  console.error("Source materials verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Source materials verification passed.");
for (const state of states) {
  console.log(`${state.label} PDF: ${state.pdf}`);
  if (state.extraPdf) console.log(`${state.label} PDF/template: ${state.extraPdf}`);
  console.log(`${state.label} HTML/template: ${state.html}`);
}

function assertPdf(label, relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${label} source PDF is missing: ${relativePath}.`);
    return;
  }
  const content = fs.readFileSync(absolutePath);
  if (content.length < 1024) failures.push(`${label} source PDF is unexpectedly small: ${relativePath}.`);
  if (!content.subarray(0, 5).equals(Buffer.from("%PDF-"))) failures.push(`${label} source PDF does not have a PDF header: ${relativePath}.`);
  if (looksLikePlaceholder(content.toString("latin1", 0, Math.min(content.length, 4096)))) failures.push(`${label} source PDF appears to be a fake placeholder: ${relativePath}.`);
}

function assertHtml(label, relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${label} source HTML/template is missing: ${relativePath}.`);
    return;
  }
  const content = fs.readFileSync(absolutePath, "utf8");
  if (content.trim().length < 1024) failures.push(`${label} source HTML/template is unexpectedly small: ${relativePath}.`);
  if (!/<html[\s>]/i.test(content) && !/<form[\s>]/i.test(content) && !/<article[\s>]/i.test(content)) failures.push(`${label} source HTML/template does not look like HTML/template material: ${relativePath}.`);
  if (looksLikePlaceholder(content)) failures.push(`${label} source HTML/template appears to be a fake placeholder: ${relativePath}.`);
}

function assertReadme(state) {
  const absolutePath = path.join(rootDir, state.readme);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${state.label} docs/reference README is missing: ${state.readme}.`);
    return;
  }
  const content = fs.readFileSync(absolutePath, "utf8");
  for (const sourcePath of [state.pdf, state.html, state.extraPdf].filter(Boolean)) {
    if (!content.includes(sourcePath)) failures.push(`${state.label} README does not include actual source path: ${sourcePath}.`);
  }
}

function looksLikePlaceholder(content) {
  return /fake placeholder|placeholder pdf|placeholder html|todo source|replace this file|not the real source/i.test(content);
}
