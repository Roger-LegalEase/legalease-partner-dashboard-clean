#!/usr/bin/env node
// An acquisition must produce a direct official URL, an exact hash, and a
// revision read from the document — or say plainly that it could not.
//
//   node scripts/verify-rcap-official-revision-confirmation.mjs
//   node scripts/verify-rcap-official-revision-confirmation.mjs --mutations
//
// Three things can go wrong here, and all three fail quietly:
//
//   1. The revision reader invents a revision. "Ohio Revised Code 2953.32" and
//      "Revised Statutes 12.345" both put a date-shaped token next to the word
//      "Revised", and reading either as an edition stamps a form with a date
//      taken from a statute citation.
//   2. The resolver guesses which of a landing page's links is the form. A
//      wrong guess becomes a hash-pinned, confident, incorrect source — worse
//      than no source, because it looks settled.
//   3. The evidence claims more than the run established: a confirmed revision
//      nobody read, or one fact counted twice because two assets share a URL.
//
// So the checks are behavioural, not structural: they run the real functions
// against inputs taken from forms this repository actually holds, and
// --mutations substitutes a plausibly-broken implementation for each one to
// prove the check would catch it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readPrintedRevisions, confirmRevision, normalizeExpectation } from "./rcap-source-acquisition/revision.mjs";
import { chooseOfficialBinary } from "./rcap-source-acquisition/resolve-binary.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");

const EVIDENCE = path.join(rootDir, "data/rcap-all50/official-source-acquisition-evidence.json");
const QUEUE = path.join(rootDir, "data/rcap-all50/source-acquisition-queue.json");
const ACQUIRER = path.join(rootDir, "scripts/rcap-acquire-official-source.mjs");
const WORKFLOW = path.join(rootDir, ".github/workflows/rcap-source-acquisition-branch.yml");

const evidence = JSON.parse(fs.readFileSync(EVIDENCE, "utf8"));
const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
const acquirerSource = fs.readFileSync(ACQUIRER, "utf8");
const workflowSource = fs.readFileSync(WORKFLOW, "utf8");

// Footers transcribed from forms in tmp/review-inbox, and the traps that sit
// beside them in the same documents.
const FOOTERS = [
  { label: "California CR-180", text: "Judicial Council of California CR-180 [Rev. January 1, 2024] PETITION FOR DISMISSAL", form: "CR-180", expect: "2024-01-01" },
  { label: "Minnesota EXP107", text: "EXP107 State ENG Rev 01/15 www.mncourts.gov/forms Page 2 of 3", form: "EXP107", expect: "2015-01" },
  { label: "Florida FDLE", text: "Title (Prosecuting Authority) Page 2 of 2 Revised October 2019 Ref. Rule 11C-7.006", form: "FDLE40-026", expect: "2019-10" },
  { label: "dotted revision", text: "(Rev. 12.20.18) PETITIONER'S SIGNATURE", form: "CR-65", expect: "2018-12-20" }
];

const TRAPS = [
  { label: "Ohio Revised Code citation", text: "sealing under the Ohio Revised Code 2953.32 is available", form: "CR-180" },
  { label: "Revised Statutes citation", text: "pursuant to the Revised Statutes 12.345 the petitioner may", form: "CR-180" },
  { label: "a bare date with no revision marker", text: "filed on 03/14/2019 in the circuit court", form: "CR-180" }
];

const LANDING = "https://www.nccourts.gov/documents/forms/expunction";
const link = (name) => `https://www.nccourts.gov/documents/${name}`;

function behaviouralFailures(readRevisions, choose) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  // 1. Every real footer is read, and read to the right date.
  for (const footer of FOOTERS) {
    const readings = readRevisions(footer.text, { formNumber: footer.form });
    fail(readings.length > 0, `${footer.label}: the printed revision was not read at all`);
    fail(
      readings.some((r) => r.normalized === footer.expect),
      `${footer.label}: expected to read ${footer.expect}, read ${readings.map((r) => r.normalized ?? r.raw).join(", ") || "nothing"}`
    );
    // One footer states one revision. More than one distinct reading from a
    // single stamp means a pattern is matching its own prefix.
    fail(
      new Set(readings.map((r) => r.normalized)).size <= 1,
      `${footer.label}: one printed stamp produced ${readings.length} different revisions (${readings.map((r) => r.normalized).join(", ")})`
    );
  }

  // 2. No trap is ever read as a revision.
  for (const trap of TRAPS) {
    const readings = readRevisions(trap.text, { formNumber: trap.form });
    fail(readings.length === 0, `${trap.label}: read as a revision (${readings.map((r) => r.normalized ?? r.raw).join(", ")}) — a citation is not an edition`);
  }

  // 3. Nothing printed is never a contradiction.
  fail(
    confirmRevision({ printed: [], expected: "2024-01-01" }).verdict === "not_printed",
    "a document that prints no revision was treated as contradicting the expected one"
  );
  fail(
    confirmRevision({ printed: [], expected: "2024-01-01", extractable: false }).verdict === "unreadable",
    "a document whose text could not be extracted was not reported as unreadable"
  );

  // 4. A real disagreement IS reported.
  const printed2024 = readRevisions(FOOTERS[0].text, { formNumber: "CR-180" });
  fail(
    confirmRevision({ printed: printed2024, expected: "2019-05" }).verdict === "contradicted",
    "a document printing a different revision from the expected one was not reported as contradicted"
  );
  fail(
    confirmRevision({ printed: printed2024, expected: "Rev. January 1, 2024" }).verdict === "confirmed",
    "an expectation written the way the form prints it was not recognised as the same revision"
  );
  fail(
    confirmRevision({ printed: printed2024, expected: null }).verdict === "no_expectation_recorded",
    "a read revision with nothing to compare against was not reported as having no expectation"
  );

  // 5. The resolver chooses only when the filename identifies the form.
  const exact = choose({ formNumber: "AOC-CR-287", candidates: [link("aoc-cr-287.pdf"), link("aoc-cr-288.pdf")], landingUrl: LANDING });
  fail(exact.outcome === "resolved" && exact.chosen === link("aoc-cr-287.pdf"), "the exactly-named form was not chosen from a landing page");

  const tie = choose({ formNumber: "AOC-CR-287", candidates: [link("aoc-cr-287-en.pdf"), link("aoc-cr-287-es.pdf")], landingUrl: LANDING });
  fail(tie.chosen === null && tie.outcome === "ambiguous", "two equally-named documents produced a choice instead of a refusal");

  const weak = choose({ formNumber: "AOC-CR-287", candidates: [link("form287instructions.pdf")], landingUrl: LANDING });
  fail(weak.chosen === null, "a filename sharing only the form's number was chosen; a number does not identify a court form");

  const none = choose({ formNumber: "AOC-CR-287", candidates: [link("expunction-guide.pdf")], landingUrl: LANDING });
  fail(none.chosen === null && none.outcome === "unresolved", "a document that does not name the form was chosen");

  const offHost = choose({ formNumber: "AOC-CR-287", candidates: ["https://www.uslegalforms.com/aoc-cr-287.pdf"], landingUrl: LANDING });
  fail(offHost.chosen === null, "a commercial reprint on another host was chosen as the official form");

  return out;
}

function wiringFailures(acquirer, workflow) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  // The reader and the resolver only matter if the acquisition runs them.
  fail(/from "\.\/rcap-source-acquisition\/revision\.mjs"/.test(acquirer), "the acquirer does not import the revision reader, so no acquisition reads an edition");
  fail(/readRevisionFromPdf\(/.test(acquirer), "the acquirer imports the revision reader but never calls it");
  fail(/from "\.\/rcap-source-acquisition\/resolve-binary\.mjs"/.test(acquirer), "the acquirer does not import the landing-page resolver");
  fail(/chooseOfficialBinary\(/.test(acquirer), "the acquirer imports the resolver but never calls it");

  // The revision the register expected has to reach the acquisition, or every
  // read comes back "no expectation recorded" and confirms nothing.
  fail(/RCAP_EXPECTED_REVISION/.test(acquirer), "the acquirer does not read an expected revision, so it can never confirm one");
  fail(/RCAP_EXPECTED_REVISION:/.test(workflow), "the workflow does not pass the expected revision to the acquisition");

  // A fetched page is not the form. Without this the ambiguous and unresolved
  // cases finish as `acquired` carrying a SHA-256 of the landing page's HTML.
  fail(
    /!leg\.looksLikePdf && !fetchedChosenBinary/.test(acquirer),
    "the acquirer no longer refuses to report a landing page as an acquired form"
  );

  // The printed facts are the copy of record when artifacts are unreachable.
  for (const line of ["final URL", "sha256", "revision"]) {
    fail(new RegExp(`\`\\s*${line}\\s`).test(acquirer), `the acquirer no longer prints "${line}", so that fact is unrecoverable from job logs`);
  }

  return out;
}

function dataFailures(data, queueData) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  const acquired = data.sources.filter((s) => s.outcome === "acquired");

  // Every acquired source carries the two facts it exists to establish.
  for (const source of acquired) {
    const where = `${source.jurisdiction} ${source.formNumber}`;
    fail(/^[0-9a-f]{64}$/.test(source.sha256 ?? ""), `${where}: no exact SHA-256 recorded`);
    fail(typeof source.finalResolvedUrl === "string" && source.finalResolvedUrl.startsWith("https://"), `${where}: no direct official URL recorded`);
    fail(Boolean(source.jobUrl && source.jobId), `${where}: no job named, so the recorded facts cannot be checked against their log`);
  }

  // Totals must be counted, not asserted.
  fail(data.totals.acquired === acquired.length, `totals.acquired says ${data.totals.acquired}, the sources say ${acquired.length}`);
  fail(
    data.totals.exactHashesRecovered === acquired.filter((s) => /^[0-9a-f]{64}$/.test(s.sha256 ?? "")).length,
    "totals.exactHashesRecovered does not match the number of sources carrying a hash"
  );
  fail(
    data.totals.legsGivenARunner === data.sources.length,
    `totals.legsGivenARunner says ${data.totals.legsGivenARunner}, the file records ${data.sources.length} legs`
  );

  // A revision nobody read is never counted as confirmed. This run predates the
  // reader, so the honest count is zero and every source says so.
  const claimingARevision = acquired.filter((s) => !String(s.editionOrRevision ?? "").startsWith("unread"));
  fail(
    data.totals.revisionsConfirmed === claimingARevision.length,
    `totals.revisionsConfirmed says ${data.totals.revisionsConfirmed}, but ${claimingARevision.length} source(s) actually record one`
  );

  // One fact, one finding. Two assets pinning different bytes for one form
  // produce two legs at one URL; counting the stale pin twice reads as two
  // forms in trouble.
  const findingKeys = data.findings.map((f) => `${f.kind}|${f.jurisdiction}|${f.formNumber}`);
  fail(new Set(findingKeys).size === findingKeys.length, "the same finding is recorded more than once for one form");

  // A finding has to be about something the queue actually holds.
  const queueForms = new Set([...queueData.matrix, ...queueData.probeMatrix].map((e) => `${e.jurisdiction}|${e.formNumber}`));
  for (const finding of data.findings) {
    fail(queueForms.has(`${finding.jurisdiction}|${finding.formNumber}`), `${finding.jurisdiction} ${finding.formNumber}: a finding about a form the queue does not contain`);
  }

  // A stale-URL finding must actually differ, or it is noise that will send
  // someone to "fix" a URL that was already right.
  for (const finding of data.findings.filter((f) => f.kind === "queue_url_is_stale")) {
    fail(finding.queueUrl !== finding.directOfficialUrl, `${finding.jurisdiction} ${finding.formNumber}: recorded as moved, but the two URLs are identical`);
  }

  // A pin reported as no longer served must not be the hash that WAS served.
  for (const finding of data.findings.filter((f) => f.kind === "pinned_hash_no_longer_served")) {
    fail(
      !finding.pinsNoLongerServed.includes(finding.servedSha256),
      `${finding.jurisdiction} ${finding.formNumber}: the hash the publisher served is listed as no longer served`
    );
  }

  // Nothing here may claim currentness. That needs the publisher's forms index.
  const claimsCurrentness = JSON.stringify(data.whatThisDoesNotEstablish ?? []).includes("current official edition");
  fail(claimsCurrentness, "the evidence no longer states that it does not establish the current official edition");

  return out;
}

const base = [
  ...behaviouralFailures(readPrintedRevisions, chooseOfficialBinary),
  ...wiringFailures(acquirerSource, workflowSource),
  ...dataFailures(evidence, queue)
];

if (MUTATIONS) {
  const clone = (value) => JSON.parse(JSON.stringify(value));

  // Each mutation is a way one of these could break in practice, expressed as
  // the broken behaviour itself rather than as an edit to the module.
  const mutations = [
    ["the revision reader stops rejecting statute citations", () => ({
      read: (text, opts) => {
        // A reader without the citation guard: any revision word plus a
        // date-shaped token becomes an edition.
        const m = /\b(rev(?:ised|\.|\b))\s*:?\s*(\d{1,2})[/.-](\d{2,4})/i.exec(String(text));
        if (m) return [{ raw: m[0], marker: "rev", kind: "month_year", normalized: `20${m[3]}`.slice(0, 4) + "-" + m[2].padStart(2, "0"), parsed: true, occurrences: 1, nearFormNumber: false, context: m[0] }];
        return readPrintedRevisions(text, opts);
      }
    })],
    ["the revision reader matches a date with no revision marker", () => ({
      read: (text, opts) => {
        const m = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(String(text));
        if (m) return [{ raw: m[0], marker: "none", kind: "numeric_date", normalized: `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`, parsed: true, occurrences: 1, nearFormNumber: false, context: m[0] }];
        return readPrintedRevisions(text, opts);
      }
    })],
    ["a revision pattern matches its own prefix, inventing a second edition", () => ({
      read: (text, opts) => {
        const real = readPrintedRevisions(text, opts);
        const dotted = /\bRev\.\s*(\d{1,2})[.](\d{1,2})[.](\d{2})/i.exec(String(text));
        if (!dotted) return real;
        return [...real, { raw: `Rev. ${dotted[1]}.${dotted[2]}`, marker: "rev", kind: "month_year", normalized: `20${dotted[2]}-${dotted[1].padStart(2, "0")}`, parsed: true, occurrences: 1, nearFormNumber: false, context: dotted[0] }];
      }
    })],
    ["a document printing nothing is reported as contradicting the expectation", () => ({
      // confirmRevision is used directly by the check, so the mutation is fed
      // through a reader that manufactures a reading out of nothing.
      read: (text, opts) => {
        const real = readPrintedRevisions(text, opts);
        return real.length > 0 ? real : [{ raw: "(none)", marker: "rev", kind: "month_year", normalized: "1970-01", parsed: true, occurrences: 1, nearFormNumber: false, context: "" }];
      }
    })],
    ["the resolver picks the first candidate when two tie", () => ({
      choose: (args) => {
        const real = chooseOfficialBinary(args);
        if (real.outcome !== "ambiguous") return real;
        return { ...real, outcome: "resolved", chosen: real.ranked[0].url };
      }
    })],
    ["the resolver accepts a filename that only shares the form's number", () => ({
      choose: (args) => {
        const real = chooseOfficialBinary(args);
        if (real.outcome !== "too_weak_to_choose") return real;
        return { ...real, outcome: "resolved", chosen: real.ranked[0].url };
      }
    })],
    ["the resolver stops preferring the issuing body's own host", () => ({
      choose: (args) => chooseOfficialBinary({ ...args, sameHostOnly: false })
    })],
    ["the acquirer stops reading the document's revision", () => ({
      acquirer: acquirerSource.replace(/readRevisionFromPdf\(/g, "skipRevision(")
    })],
    ["the acquirer stops resolving landing pages", () => ({
      acquirer: acquirerSource.replace(/chooseOfficialBinary\(/g, "skipResolution(")
    })],
    ["the acquirer reports a landing page as an acquired form", () => ({
      acquirer: acquirerSource.replace(/!leg\.looksLikePdf && !fetchedChosenBinary/g, "false")
    })],
    ["the acquirer stops printing the hash it acquired", () => ({
      acquirer: acquirerSource.replace(/` {2}sha256 {8}\$\{sha256\}`/g, "`  (hash withheld)`")
    })],
    ["the workflow stops passing the expected revision", () => ({
      workflow: workflowSource.replace(/RCAP_EXPECTED_REVISION:/g, "RCAP_UNUSED_REVISION:")
    })],
    ["the evidence claims a revision that was never read", () => {
      const mutated = clone(evidence);
      mutated.totals.revisionsConfirmed = 12;
      return { data: mutated };
    }],
    ["a source loses the hash it exists to record", () => {
      const mutated = clone(evidence);
      mutated.sources.find((s) => s.outcome === "acquired").sha256 = null;
      return { data: mutated };
    }],
    ["a source loses the job that makes it checkable", () => {
      const mutated = clone(evidence);
      const target = mutated.sources.find((s) => s.outcome === "acquired");
      target.jobId = null;
      target.jobUrl = null;
      return { data: mutated };
    }],
    ["one stale pin is counted twice, as two forms in trouble", () => {
      const mutated = clone(evidence);
      const finding = mutated.findings.find((f) => f.kind === "pinned_hash_no_longer_served");
      mutated.findings.push(clone(finding));
      return { data: mutated };
    }],
    ["a URL is reported as moved when it did not move", () => {
      const mutated = clone(evidence);
      const finding = mutated.findings.find((f) => f.kind === "queue_url_is_stale");
      finding.queueUrl = finding.directOfficialUrl;
      return { data: mutated };
    }],
    ["the hash the publisher served is listed as no longer served", () => {
      const mutated = clone(evidence);
      const finding = mutated.findings.find((f) => f.kind === "pinned_hash_no_longer_served");
      finding.pinsNoLongerServed.push(finding.servedSha256);
      return { data: mutated };
    }],
    ["the evidence drops its refusal to establish currentness", () => {
      const mutated = clone(evidence);
      mutated.whatThisDoesNotEstablish = mutated.whatThisDoesNotEstablish.filter((s) => !s.includes("current official edition"));
      return { data: mutated };
    }],
    ["the totals stop being counted from the sources", () => {
      const mutated = clone(evidence);
      mutated.totals.acquired += 3;
      return { data: mutated };
    }]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const m = mutate() ?? {};
    const problems = [
      ...behaviouralFailures(m.read ?? readPrintedRevisions, m.choose ?? chooseOfficialBinary),
      ...wiringFailures(m.acquirer ?? acquirerSource, m.workflow ?? workflowSource),
      ...dataFailures(m.data ?? evidence, queue)
    ];
    const caught = problems.length > base.length;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }

  if (undetected > 0) {
    console.error(`\nverify-rcap-official-revision-confirmation FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way of inventing a revision, guessing a form, or claiming more than the run established is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

if (base.length > 0) {
  console.error(`verify-rcap-official-revision-confirmation FAILED — ${base.length} problem(s):\n`);
  for (const problem of base) console.error(` - ${problem}`);
  process.exit(1);
}

const acquiredCount = evidence.sources.filter((s) => s.outcome === "acquired").length;
console.log("verify-rcap-official-revision-confirmation passed.");
console.log(`  ${FOOTERS.length} real printed revision line(s) read correctly; ${TRAPS.length} citation trap(s) refused.`);
console.log(`  the resolver chooses a landing page's form only when the filename identifies it, and refuses ties, bare numbers and off-host reprints.`);
console.log(`  ${acquiredCount} acquired source(s) each carry a direct official URL, an exact SHA-256, and the job whose log proves them.`);
console.log(`  revisions confirmed: ${evidence.totals.revisionsConfirmed} — that run predates the reader, and the evidence says so rather than implying more.`);
void normalizeExpectation;
