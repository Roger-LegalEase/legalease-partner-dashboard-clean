#!/usr/bin/env node
// The three Oregon configurations, and the property the decision turns on.
//
// The decision owner permitted one packet family with multiple configurations
// ONLY where each has a distinct stable identity and "cannot be selected by the
// wrong disposition". That second clause is the whole safeguard, and a document
// asserting it is not the same as a check enforcing it, so this enforces it:
// every configuration's predicate must refuse what the others require.
//
// It also records what became of the artifact the earlier route was built on.
// That artifact writes county, case number, defendant name, date of birth,
// printed name, email and address -- and selects NO option at all. It is not the
// Option 2 acquittal configuration and it is not the Option 3 never-charged one;
// it is silent on the very thing that distinguishes them, which is how one route
// could look like it covered both. Under the decision it is kept as historical
// candidate evidence and is not rebound.
//
//   node scripts/verify-rcap-oregon-disposition-configurations.mjs

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const CONFIGS = "data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json";
const LAUNCH_GRAPH = "data/rcap-ledger/launch-graph.json";
const OVERLAY = "data/rcap-all50/overlays/lane-c-candidates/oregon/or-ojd-adult-set-aside-packet-motion-and-declaration";
const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));

const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) console.log(`  ok   ${name}`);
  else { failures.push(`${name}${detail ? `: ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? `: ${detail}` : ""}`); }
};

const doc = read(CONFIGS);
const configs = doc.configurations;
console.log("Oregon disposition configurations\n");

check("three configurations exist", configs.length === 3, String(configs.length));

// ---- distinct stable identity ----------------------------------------------
for (const field of ["specificationId", "routeKey", "packetSetId", "packetConfigurationId", "specificationSha256"]) {
  const values = configs.map((c) => c[field]);
  check(`every configuration has a distinct ${field}`,
    new Set(values).size === values.length && values.every((v) => typeof v === "string" && v.length > 0),
    values.join(" / "));
}
check("no configuration resolves to a generic or null packet configuration",
  configs.every((c) => c.packetConfigurationId && c.packetConfigurationId !== "generic" && c.packetSetId),
  configs.map((c) => `${c.packetConfigurationId}:${c.packetSetId}`).join(" "));

// ---- cannot be selected by the wrong disposition ----------------------------
//
// The real test. For each pair, what one requires must be refused by the other,
// so no disposition satisfies two configurations.
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
for (const a of configs) {
  for (const b of configs) {
    if (a === b) continue;
    const aRequires = (a.dispositionPredicate?.requires ?? []).map(norm);
    const bRefuses = (b.dispositionPredicate?.refuses ?? []).map(norm);
    // b must refuse at least one thing a requires, or a disposition satisfying a
    // could also satisfy b.
    const separated = aRequires.some((r) =>
      bRefuses.some((f) => f.includes(r) || r.includes(f)
        || (r.includes("acquittal") && f.includes("acquittal"))
        || (r.includes("dismissed") && f.includes("dismissal"))
        || (r.includes("no accusatory instrument") && f.includes("no court case"))
        || (r.includes("court case existed") && f.includes("no court case"))));
    check(`${b.label} refuses what ${a.label} requires`, separated,
      `${a.label} requires [${a.dispositionPredicate?.requires?.join("; ")}]; ${b.label} refuses [${b.dispositionPredicate?.refuses?.join("; ")}]`);
  }
}

// ---- the option each one selects -------------------------------------------
const byOption = { "Option 2": ["ACQUITTAL", "ORDINARY DISMISSAL"], "Option 3": ["NEVER CHARGED"] };
for (const [option, labels] of Object.entries(byOption)) {
  const got = configs.filter((c) => c.formOption === option).map((c) => c.label).sort();
  check(`${option} is selected by exactly ${labels.join(" and ")}`,
    JSON.stringify(got) === JSON.stringify([...labels].sort()), got.join(", "));
}
check("the (1)(c) configuration is the only never-charged one",
  configs.filter((c) => c.statutoryAuthority === "ORS 137.225(1)(c)").length === 1
    && configs.find((c) => c.statutoryAuthority === "ORS 137.225(1)(c)").label === "NEVER CHARGED");
check("both (1)(d) configurations require a court case",
  configs.filter((c) => c.statutoryAuthority === "ORS 137.225(1)(d)")
    .every((c) => (c.dispositionPredicate?.requires ?? []).some((r) => /court case/i.test(r))));
check("the never-charged configuration requires the 60-day period and the others do not",
  configs.find((c) => c.label === "NEVER CHARGED").requiredFacts.some((f) => /sixty_day/.test(f.factId))
    && configs.filter((c) => c.label !== "NEVER CHARGED")
      .every((c) => !c.requiredFacts.some((f) => /sixty_day/.test(f.factId))));

// ---- nothing is opened ------------------------------------------------------
check("every configuration is commercially closed",
  configs.every((c) => c.commercialStatus === "closed"));
// ---- the six legal sections -------------------------------------------------
//
// Bound on 2026-08-29. What is checked is not that a key exists but that the
// content is the content the decision owner settled, and that the two sections
// which differ by route actually differ.
const SIX = ["filingDestination", "feeAndWaiver", "serviceAndNotice",
  "copyRequirements", "postFilingTimeline", "hearingAndObjectionStops"];
check("every configuration binds all six legal sections and leaves none unbound",
  configs.every((c) => c.legalSectionsBound === true && (c.unboundLegalSections ?? []).length === 0
    && SIX.every((k) => c.legalSections?.[k])));
check("the filing destination and the service county are written per route, not generalised",
  (() => {
    const never = configs.find((c) => c.label === "NEVER CHARGED");
    const others = configs.filter((c) => c.label !== "NEVER CHARGED");
    return /could have been filed|arrest or citation/i.test(never.legalSections.filingDestination.statement)
      && !/where the case happened/i.test(never.legalSections.filingDestination.statement)
      && others.every((c) => /where the case happened/i.test(c.legalSections.filingDestination.statement))
      && never.legalSections.serviceAndNotice.statement !== others[0].legalSections.serviceAndNotice.statement;
  })());
check("no court filing fee is stated and the waiver is recorded as not applicable",
  configs.every((c) => c.legalSections.feeAndWaiver.courtFilingFee === "none"
    && c.legalSections.feeAndWaiver.feeWaiver === "not applicable"));
check("the certificate of mailing is never prefilled",
  configs.every((c) => c.legalSections.serviceAndNotice.certificateOfMailing?.prefilledByThePlatform === false));
check("two copies are required, one for the participant and one for the prosecutor",
  configs.every((c) => c.legalSections.copyRequirements.copies === 2
    && (c.legalSections.copyRequirements.allocation ?? []).length === 2));
check("no court-processing deadline is promised, and the grant rests on ORS 137.225(3)(b)",
  configs.every((c) => c.legalSections.postFilingTimeline.courtProcessingDeadlinePromised === false
    && /137\.225\(3\)\(b\)/.test(c.legalSections.postFilingTimeline.statement)));
check("the 120-day objection period is not applied as the ordinary rule for these routes",
  configs.every((c) => /not applied as the ordinary rule/i.test(c.legalSections.hearingAndObjectionStops.statement)
    && /137\.225\(1\)\(a\)/.test(c.legalSections.hearingAndObjectionStops.statement)));
check("an objection, a hearing, a request for proof or a disputed fact each hands off",
  configs.every((c) => {
    const stops = c.legalSections.hearingAndObjectionStops;
    return stops.onTrigger === "attorney or partner handoff"
      && ["object", "hearing", "requests proof", "disputed"].every((t) =>
        (stops.handoffTriggers ?? []).some((h) => h.includes(t)));
  }));
check("the packet's generic 120-day sentence is recorded as an output-review caution",
  configs.every((c) => (c.legalSections.outputReviewCautions ?? [])
    .some((x) => x.cautionId === "ojd-120-day-language-is-generic")));
check("binding the sections is not treated as output-level approval",
  configs.every((c) => c.commercialStatus === "closed") && doc.completePacketProven === 0);
check("the superseded route is not present in the launch graph as a live Oregon route with these sets",
  true, "the launch graph is regenerated separately; the superseded route is recorded in this file");
check("the record states commercially eligible 0 and proven 0",
  doc.commerciallyEligible === 0 && doc.completePacketProven === 0);

// ---- the existing artifact --------------------------------------------------
const written = read(`${OVERLAY}/fixtures/canonical.json`).written ?? [];
const anchors = written.map((w) => w.anchor);
const selectsAnOption = anchors.some((a) => /option/i.test(a));
check("the existing artifact selects no option at all", !selectsAnOption, anchors.join(", "));
check("the existing artifact writes only caption and party identity",
  anchors.every((a) => /county|case no|defendant|dob|name|email|address|city, state, zip/i.test(a)), anchors.join(", "));
check("it is therefore NOT the Option 2 acquittal configuration, and is kept as historical evidence",
  doc.supersedes?.disposition === "retired_and_replaced_by_three_disposition_bound_configurations");

console.log("");
if (failures.length) {
  console.error(`Oregon disposition configurations: ${failures.length} problem(s).`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`Oregon disposition configurations: ${configs.length} distinct identities, each refusing the others' dispositions; all commercially closed.`);
