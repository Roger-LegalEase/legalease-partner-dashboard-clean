#!/usr/bin/env node
// Resolving a landing page must find the form, or find nothing.
//
//   node scripts/verify-rcap-landing-page-resolution.mjs
//
// Twenty-nine of the forty-one runnable acquisition legs point at an issuing
// body's page rather than at a form, and until now every one of them ended with
// an HTML file and no source. Resolution closes that. It also introduces the
// one failure this lane cannot tolerate: quietly acquiring the WRONG form.
//
// A wrong resolution is invisible downstream. The overlay renders, the contact
// sheet shows a fill, the packet builds — every later check asks whether the
// bytes are internally consistent, and none of them re-asks whether this was
// the document the queue wanted. So the properties proved here are the ones
// that would be violated by each way of resolving wrongly, and the bias is
// always toward refusing.
//
// Part one tests the resolver as a pure function. Part two runs the real
// acquisition script over a fake network, because a resolver that is right and
// a script that ignores it would both pass part one.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import {
  identifierTokens,
  acceptableSequences,
  tierFor,
  harvestDocumentLinks,
  resolveFormBinaryFromLandingPage
} from "./rcap-source-acquisition/landing-page-resolution.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let checks = 0;

function check(name, fn) {
  checks += 1;
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

const NC_HOSTS = ["www.nccourts.gov", "nccourts.gov"];
const KY_HOSTS = ["www.kycourts.gov", "kycourts.gov"];
const NE_HOSTS = ["nebraskajudicial.gov", "www.nebraskajudicial.gov"];

const page = (links) =>
  `<html><body><ul>${links.map((href) => `<li><a href="${href}">form</a></li>`).join("")}</ul></body></html>`;

// ---- part one: the resolver -------------------------------------------------

check("a form number splits on separators and on the digit boundary inside a stem", () => {
  assert.deepEqual(identifierTokens("AOC-CR-287"), ["aoc", "cr", "287"]);
  assert.deepEqual(identifierTokens("cr287"), ["cr", "287"]);
  assert.deepEqual(identifierTokens("CC-6-12"), ["cc", "6", "12"]);
  assert.deepEqual(identifierTokens("200-00132A"), ["200", "00132", "a"]);
});

check("a leading agency prefix may be dropped; a trailing token may not", () => {
  assert.deepEqual(acceptableSequences("AOC-CR-287"), [["aoc", "cr", "287"], ["cr", "287"]]);
  // ["287"] is absent on purpose: AOC-CR-226 and AOC-CV-226 would both answer
  // to a bare 226, and the more specific sequence is available.
  assert.equal(acceptableSequences("AOC-CR-287").some((s) => s.length === 1), false);
});

check("a form number that is only a prefix and a number keeps its bare number", () => {
  // Kentucky publishes AOC-334 as 334.pdf. Refusing the bare token here would
  // refuse the single Priority 1 asset in the queue.
  assert.deepEqual(acceptableSequences("AOC-334"), [["aoc", "334"], ["334"]]);
  assert.equal(tierFor("https://www.kycourts.gov/Legal%20Forms/334.pdf", "AOC-334"), 0);
});

check("a bare number is only ever a whole filename, never the head of one", () => {
  assert.equal(tierFor("https://www.kycourts.gov/f/334-order.pdf", "AOC-334"), null);
  assert.equal(tierFor("https://www.kycourts.gov/f/3341.pdf", "AOC-334"), null);
});

check("a numeric or single-character continuation is a different form", () => {
  // The trap the queue generator already names: CC-6-12 is a substring of
  // CC-6-12-1 under any normalisation that throws separators away.
  assert.equal(tierFor("https://nebraskajudicial.gov/f/CC-6-12.pdf", "CC-6-12"), 0);
  assert.equal(tierFor("https://nebraskajudicial.gov/f/CC-6-12-1.pdf", "CC-6-12"), null);
  assert.equal(tierFor("https://nebraskajudicial.gov/f/CC-6-11A.pdf", "CC-6-11"), null);
  assert.equal(tierFor("https://nebraskajudicial.gov/f/CC-6-15-1.pdf", "CC-6-15.1"), 0);
});

check("a descriptive continuation is the same form, ranked below the bare one", () => {
  assert.equal(tierFor("https://www.nccourts.gov/d/cr287.pdf", "AOC-CR-287"), 0);
  assert.equal(tierFor("https://www.nccourts.gov/d/cr287-instructions.pdf", "AOC-CR-287"), 1);
});

check("only documents are harvested, and relative links are made absolute", () => {
  const links = harvestDocumentLinks(
    page(["/d/cr287.pdf", "/d/index.html", "cr288.docx", "https://x.example/a.pdf"]),
    "https://www.nccourts.gov/documents/forms"
  );
  assert.deepEqual(links.map((l) => l.url), [
    "https://www.nccourts.gov/d/cr287.pdf",
    "https://www.nccourts.gov/documents/cr288.docx",
    "https://x.example/a.pdf"
  ]);
});

check("the exact filename wins over the descriptive one", () => {
  const result = resolveFormBinaryFromLandingPage({
    html: page(["/d/cr287-instructions.pdf", "/d/cr287.pdf"]),
    landingPageUrl: "https://www.nccourts.gov/documents/forms/petition-287",
    formNumber: "AOC-CR-287",
    officialHosts: NC_HOSTS
  });
  assert.equal(result.verdict, "resolved");
  assert.equal(result.resolvedUrl, "https://www.nccourts.gov/d/cr287.pdf");
  assert.equal(result.resolvedTier, 0);
});

check("a page publishing five forms resolves each to its own", () => {
  // The real Kentucky case: one Expungement page, five queue legs.
  const html = page(["/f/496.pdf", "/f/496.2.pdf", "/f/496.3.pdf", "/f/496.4.pdf", "/f/497.pdf"]);
  for (const [formNumber, expected] of [
    ["AOC-496", "https://www.kycourts.gov/f/496.pdf"],
    ["AOC-496.2", "https://www.kycourts.gov/f/496.2.pdf"],
    ["AOC-496.4", "https://www.kycourts.gov/f/496.4.pdf"],
    ["AOC-497", "https://www.kycourts.gov/f/497.pdf"]
  ]) {
    const result = resolveFormBinaryFromLandingPage({
      html,
      landingPageUrl: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx",
      formNumber,
      officialHosts: KY_HOSTS
    });
    assert.equal(result.verdict, "resolved", `${formNumber}: ${result.reason}`);
    assert.equal(result.resolvedUrl, expected, formNumber);
  }
});

check("two documents named equally well is a refusal, not a coin toss", () => {
  const result = resolveFormBinaryFromLandingPage({
    html: page(["/en/cr287.pdf", "/es/cr287.pdf"]),
    landingPageUrl: "https://www.nccourts.gov/documents/forms/petition-287",
    formNumber: "AOC-CR-287",
    officialHosts: NC_HOSTS
  });
  assert.equal(result.verdict, "refused_ambiguous");
  assert.equal(result.resolvedUrl, null);
  assert.equal(result.candidates.filter((c) => c.tier === 0).length, 2);
});

check("a form linked from an official page but served elsewhere is refused", () => {
  const result = resolveFormBinaryFromLandingPage({
    html: page(["https://www.uslegalforms.com/cr287.pdf"]),
    landingPageUrl: "https://www.nccourts.gov/documents/forms/petition-287",
    formNumber: "AOC-CR-287",
    officialHosts: NC_HOSTS
  });
  assert.equal(result.verdict, "refused_every_document_is_off_host");
  assert.equal(result.resolvedUrl, null);
});

check("a page whose documents are all other forms resolves nothing", () => {
  const result = resolveFormBinaryFromLandingPage({
    html: page(["/d/cr288.pdf", "/d/cr296.pdf"]),
    landingPageUrl: "https://www.nccourts.gov/documents/forms",
    formNumber: "AOC-CR-287",
    officialHosts: NC_HOSTS
  });
  assert.equal(result.verdict, "refused_no_document_names_this_form");
  assert.equal(result.candidates.length, 2);
  assert.ok(result.candidates.every((c) => c.tier === null));
});

check("a refusal always shows what it refused", () => {
  for (const html of [page([]), page(["/d/cr288.pdf"]), page(["https://x.example/cr287.pdf"])]) {
    const result = resolveFormBinaryFromLandingPage({
      html,
      landingPageUrl: "https://www.nccourts.gov/documents/forms",
      formNumber: "AOC-CR-287",
      officialHosts: NC_HOSTS
    });
    assert.notEqual(result.verdict, "resolved");
    assert.ok(typeof result.reason === "string" && result.reason.length > 0);
    assert.ok(Array.isArray(result.candidates));
  }
});

check("the landing page's own host counts as official even when unlisted", () => {
  // A jurisdiction absent from the table still gets its own page's host, so a
  // court that publishes from one domain is not refused for a missing entry.
  const result = resolveFormBinaryFromLandingPage({
    html: page(["/f/CC-6-12.pdf"]),
    landingPageUrl: "https://nebraskajudicial.gov/forms",
    formNumber: "CC-6-12",
    officialHosts: []
  });
  assert.equal(result.verdict, "resolved");
  assert.equal(result.resolvedUrl, "https://nebraskajudicial.gov/f/CC-6-12.pdf");
  assert.deepEqual(NE_HOSTS.includes(new URL(result.resolvedUrl).hostname), true);
});

// ---- part two: the acquisition script over a fake network -------------------

const PDF = Buffer.concat([Buffer.from("%PDF-1.7\n/AcroForm\n", "latin1"), Buffer.from("x".repeat(400), "latin1")]);
const OTHER_PDF = Buffer.concat([Buffer.from("%PDF-1.7\n/AcroForm\n", "latin1"), Buffer.from("y".repeat(400), "latin1")]);
const shaOf = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

function runAcquisition({ network, env }) {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-lpr-"));
  try {
    execFileSync(process.execPath, [path.join(rootDir, "scripts/rcap-source-acquisition/fake-fetch.mjs")], {
      cwd: workdir,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        RCAP_FAKE_NETWORK: JSON.stringify(network),
        RCAP_TOLERATE_FAILURE: "1",
        ...env
      }
    });
    const dir = path.join(workdir, "acquired-source");
    const files = fs.readdirSync(dir);
    const receiptFile = files.find((f) => f.endsWith(".receipt.json"));
    // Everything is read here, before the finally below removes the directory.
    const written = new Map(files.map((f) => [f, fs.readFileSync(path.join(dir, f))]));
    return {
      receipt: JSON.parse(fs.readFileSync(path.join(dir, receiptFile), "utf8")),
      files,
      read: (name) => written.get(name)
    };
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
}

const LANDING = "https://www.nccourts.gov/documents/forms/petition-287";
const legEnv = {
  RCAP_SOURCE_URL: LANDING,
  RCAP_JURISDICTION: "NC",
  RCAP_FORM_NUMBER: "AOC-CR-287",
  RCAP_URL_KIND: "official_landing_page",
  RCAP_RECEIPT_SLUG: "NC-AOC-CR-287-test"
};

check("a resolvable landing page acquires the form, and records both hops", () => {
  const { receipt, read } = runAcquisition({
    env: legEnv,
    network: {
      [LANDING]: { contentType: "text/html", body: page(["/d/cr287-instructions.pdf", "/d/cr287.pdf"]) },
      "https://www.nccourts.gov/d/cr287.pdf": { contentType: "application/pdf", bodyBase64: PDF.toString("base64") }
    }
  });
  assert.equal(receipt.outcome, "acquired");
  assert.equal(receipt.binaryResolvedFromLandingPage, true);
  assert.equal(receipt.finalResolvedUrl, "https://www.nccourts.gov/d/cr287.pdf");
  assert.equal(receipt.sha256, shaOf(PDF), "the receipt must hash the FORM, not the page");
  assert.equal(receipt.looksLikePdf, true);
  assert.equal(receipt.landingPage.url, LANDING);
  assert.equal(receipt.landingPage.resolution.verdict, "resolved");
  assert.equal(receipt.landingPage.resolution.matchTier, 0);
  assert.notEqual(receipt.landingPage.sha256, receipt.sha256, "the page and the form are different bytes");
  assert.deepEqual(read(receipt.binaryFile), PDF);
  assert.ok(receipt.binaryFile.endsWith(".pdf"));
});

check("an unresolvable landing page acquires no source and says so", () => {
  const { receipt } = runAcquisition({
    env: legEnv,
    network: {
      [LANDING]: { contentType: "text/html", body: page(["/en/cr287.pdf", "/es/cr287.pdf"]) }
    }
  });
  assert.equal(receipt.outcome, "landing_page_unresolved");
  assert.equal(receipt.binaryResolvedFromLandingPage, false);
  assert.equal(receipt.landingPage.resolution.verdict, "refused_ambiguous");
  assert.equal(receipt.looksLikePdf, false);
  assert.ok(receipt.binaryFile.endsWith(".bin"), "the page is kept as evidence, not as a form");
  assert.equal(receipt.landingPage.resolution.candidates.length, 2);
});

check("a resolution the publisher then refuses is not reported as acquired", () => {
  const { receipt } = runAcquisition({
    env: legEnv,
    network: {
      [LANDING]: { contentType: "text/html", body: page(["/d/cr287.pdf"]) },
      "https://www.nccourts.gov/d/cr287.pdf": { status: 403, contentType: "text/html", body: "no" }
    }
  });
  assert.equal(receipt.outcome, "landing_page_unresolved");
  assert.equal(receipt.binaryResolvedFromLandingPage, false);
  assert.equal(receipt.landingPage.resolution.verdict, "resolved");
  assert.match(receipt.landingPage.secondHopRefusal, /403/);
});

check("a resolution that leads to another page is refused, not chained", () => {
  const { receipt } = runAcquisition({
    env: legEnv,
    network: {
      [LANDING]: { contentType: "text/html", body: page(["/d/cr287.pdf"]) },
      "https://www.nccourts.gov/d/cr287.pdf": { contentType: "text/html", body: page(["/d/cr287.pdf"]) }
    }
  });
  assert.equal(receipt.outcome, "landing_page_unresolved");
  assert.match(receipt.landingPage.secondHopRefusal, /did not answer with a PDF/);
});

check("a landing-page URL that already serves the form is not re-resolved", () => {
  // Vermont publishes forms as /media/<id>, which redirects straight to the
  // PDF. Resolving that again would replace a confirmed source with a choice.
  const vt = "https://www.vtcourts.gov/media/10142";
  const { receipt } = runAcquisition({
    env: {
      RCAP_SOURCE_URL: vt,
      RCAP_JURISDICTION: "VT",
      RCAP_FORM_NUMBER: "200-00132",
      RCAP_URL_KIND: "official_landing_page",
      RCAP_RECEIPT_SLUG: "VT-200-00132-test"
    },
    network: {
      [vt]: {
        contentType: "application/pdf",
        bodyBase64: PDF.toString("base64"),
        finalUrl: "https://www.vtcourts.gov/sites/default/files/documents/200-00132.pdf"
      }
    }
  });
  assert.equal(receipt.outcome, "acquired");
  assert.equal(receipt.landingPage, null, "no resolution was needed, so none is claimed");
  assert.equal(receipt.binaryResolvedFromLandingPage, false);
  assert.equal(receipt.redirected, true);
  assert.equal(receipt.sha256, shaOf(PDF));
});

check("a direct-binary leg is unchanged by any of this", () => {
  const direct = "https://www.kycourts.gov/Legal-Forms/Legal%20Forms/334.pdf";
  const { receipt } = runAcquisition({
    env: {
      RCAP_SOURCE_URL: direct,
      RCAP_JURISDICTION: "KY",
      RCAP_FORM_NUMBER: "AOC-334",
      RCAP_URL_KIND: "direct_binary",
      RCAP_EXPECTED_SHA256: shaOf(PDF),
      RCAP_RECEIPT_SLUG: "KY-AOC-334-test"
    },
    network: { [direct]: { contentType: "application/pdf", bodyBase64: PDF.toString("base64") } }
  });
  assert.equal(receipt.outcome, "acquired");
  assert.equal(receipt.landingPage, null);
  assert.equal(receipt.matchesExpectedSha256, true);
  assert.equal(receipt.observedStructuralClass, "acroform");
});

check("a hash that does not match is recorded as a mismatch, not as a failure", () => {
  const direct = "https://www.kycourts.gov/Legal-Forms/Legal%20Forms/334.pdf";
  const { receipt } = runAcquisition({
    env: {
      RCAP_SOURCE_URL: direct,
      RCAP_JURISDICTION: "KY",
      RCAP_FORM_NUMBER: "AOC-334",
      RCAP_URL_KIND: "direct_binary",
      RCAP_EXPECTED_SHA256: shaOf(PDF),
      RCAP_RECEIPT_SLUG: "KY-AOC-334-drift"
    },
    network: { [direct]: { contentType: "application/pdf", bodyBase64: OTHER_PDF.toString("base64") } }
  });
  assert.equal(receipt.outcome, "acquired");
  assert.equal(receipt.matchesExpectedSha256, false);
  assert.equal(receipt.sha256, shaOf(OTHER_PDF));
});

check("the receipt is printed to stdout, where a restricted session can read it", () => {
  // Artifacts and job summaries are served from a storage host that a
  // restricted egress policy refuses with 403. The job log is not.
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-lpr-out-"));
  try {
    const direct = "https://www.kycourts.gov/Legal-Forms/Legal%20Forms/334.pdf";
    const stdout = execFileSync(process.execPath, [path.join(rootDir, "scripts/rcap-source-acquisition/fake-fetch.mjs")], {
      cwd: workdir,
      encoding: "utf8",
      env: {
        ...process.env,
        RCAP_TOLERATE_FAILURE: "1",
        RCAP_FAKE_NETWORK: JSON.stringify({ [direct]: { contentType: "application/pdf", bodyBase64: PDF.toString("base64") } }),
        RCAP_SOURCE_URL: direct,
        RCAP_JURISDICTION: "KY",
        RCAP_FORM_NUMBER: "AOC-334",
        RCAP_URL_KIND: "direct_binary",
        RCAP_RECEIPT_SLUG: "KY-AOC-334-stdout"
      }
    });
    const body = stdout.split("--- RCAP_RECEIPT_BEGIN KY-AOC-334-stdout ---")[1]?.split("--- RCAP_RECEIPT_END")[0];
    assert.ok(body, "the receipt markers must be present in stdout");
    assert.equal(JSON.parse(body.trim()).sha256, shaOf(PDF));
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
});

// ---- report -----------------------------------------------------------------

if (failures.length > 0) {
  console.error(`FAIL landing-page resolution — ${failures.length} of ${checks} checks failed:`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`OK landing-page resolution — ${checks} checks passed.`);
