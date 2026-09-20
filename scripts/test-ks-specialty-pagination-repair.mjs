#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { PDFDocument } from "pdf-lib";
import { extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { SPEC } from "./build-census-v1-ks-21-6614-specialty-court-set.mjs";

const FAMILY = "ks-21-6614-specialty-court-set";
const OUT = `data/rcap-all50/overlays/census-v1/ks/${FAMILY}--official-pdf-fill`;
const OLD_COMMIT = "b55d13e28dc33af73ac0a8d5b63fe5ed1f46935f";
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const norm = (value) => String(value).normalize("NFKC").replace(/\s+/g, " ").trim();
const pageText = (page) => norm(extractTextItems(page).map((item) => item.text).join(" "));
let assertions = 0;
const equal = (actual, expected, message) => { assertions += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { assertions += 1; assert.ok(value, message); };

const guide = SPEC.documents.find((document) => document.documentId === "KS-SPECIALTY-COURT-HEARING-PREPARATION");
const fee = SPEC.documents.find((document) => document.documentId === "KS-SPECIALTY-COURT-OPTIONAL-FEE-WAIVER");
equal(guide.composedPdfLayout?.lineHeight, 14.4, "only the specialty hearing guide opts into 14.4pt leading");
equal(fee.composedPdfLayout, undefined, "the separately composed fee request retains the shared 14.5pt default");

const rendered = JSON.parse(fs.readFileSync(`${OUT}/reports/rendered-artifacts.json`, "utf8"));
for (const fixture of ["canonical", "boundary"]) {
  const file = `${OUT}/fixtures/${fixture}.pdf`;
  const currentBytes = fs.readFileSync(file);
  const current = await PDFDocument.load(currentBytes, { ignoreEncryption: true, updateMetadata: false });
  const oldBytes = execFileSync("git", ["show", `${OLD_COMMIT}:${file}`], { maxBuffer: 4 * 1024 * 1024 });
  const old = await PDFDocument.load(oldBytes, { ignoreEncryption: true, updateMetadata: false });
  equal(old.getPageCount(), 21, `${fixture}: frozen failed packet has 21 pages`);
  equal(current.getPageCount(), 20, `${fixture}: repaired packet removes the one-line guidance overflow page`);
  equal(pageText(old.getPage(19)), "the court will decide.", `${fixture}: negative control reproduces the exact orphan on old page 20`);
  ok(pageText(current.getPage(18)).endsWith("the court will decide."), `${fixture}: complete final guidance paragraph ends together on page 19`);
  ok(pageText(current.getPage(19)).includes("OPTIONAL REQUEST TO WAIVE DOCKET FEE"), `${fixture}: fee request now follows on page 20`);
  const finalItem = extractTextItems(current.getPage(18)).find((item) => item.text === "the court will decide.");
  equal(finalItem?.size, 11, `${fixture}: repaired final line remains 11pt Times Roman`);
  equal(finalItem?.baseFont, "Times-Roman", `${fixture}: repaired final line retains the established font`);
  const pages = rendered.pageManifests[fixture];
  equal(pages.filter((page) => page.documentId === "KS-SPECIALTY-COURT-HEARING-PREPARATION").length, 2, `${fixture}: hearing guide occupies two substantive pages`);
  equal(pages.find((page) => page.documentId === "KS-SPECIALTY-COURT-OPTIONAL-FEE-WAIVER")?.packetPage, 20, `${fixture}: fee request is the final page`);
  equal(sha(currentBytes), rendered.pdfs.find((pdf) => pdf.fixture === fixture).sha256, `${fixture}: saved bytes match the builder report`);
}

console.log(`KS specialty pagination repair PASS (${assertions} assertions; no one-line guidance page; legal text remains readable at the established font)`);
