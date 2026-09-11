#!/usr/bin/env node
import assert from "node:assert/strict";
import { decideBinding, descriptorsMatching } from "./rcap-field-semantics.mjs";

const factsFor = (caption) => descriptorsMatching(caption).map((row) => row.factId);

assert.equal(factsFor("Current Mailing Address (with city/state/zip)")[0], "participant.full_mailing_address");
assert.deepEqual(factsFor("Mailing Address"), ["participant.street_address"]);
assert.deepEqual(factsFor("Street Address"), ["participant.street_address"]);
assert.ok(!factsFor("Court Mailing Address").includes("participant.full_mailing_address"));
assert.ok(!factsFor("Email Address").includes("participant.full_mailing_address"));

const combined = decideBinding({
  name: "Address", pdfType: "text",
  effectiveLabel: "Current Mailing Address (with city/state/zip)",
  regionHeading: "My Information"
}, { explicitMappings: { Address: "participant.full_mailing_address" } });
assert.equal(combined.writable, true);
assert.equal(combined.factId, "participant.full_mailing_address");
assert.equal(combined.factBasis, "printed_label_explicit");

const generic = decideBinding({
  name: "Address", pdfType: "text", effectiveLabel: "Mailing Address",
  regionHeading: "My Information"
}, { explicitMappings: { Address: "participant.full_mailing_address" } });
assert.equal(generic.writable, false);
assert.equal(generic.reason, "explicit_mapping_conflicts_with_field_name");

const protectedCourt = decideBinding({
  name: "Address", pdfType: "text",
  effectiveLabel: "Clerk Mailing Address (with city/state/zip)",
  regionHeading: "Clerk Information"
}, { explicitMappings: { Address: "participant.full_mailing_address" } });
assert.equal(protectedCourt.writable, false);

console.log("OK full mailing address semantics — explicit combined captions bind the derived full address and split/contact fields do not.");
