import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { packetCollectionFor } = await import("../src/lib/expungement-ai/packet-information.ts");
const { resolvePacketCollection, prepayGateFactIds } = await import("../src/lib/expungement-ai/packet-collection.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { routeDecidingFactScope } = await import("../src/lib/rcap-engine/route-fact-relevance.ts");
const { MD_JUVENILE_COUNTY_SOURCE_PURPOSE: purpose, mdJuvenileCountySourcePurpose: contract } = await import("../src/lib/expungement-ai/md-juvenile-county-source-purpose.ts");
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hash = value => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
// Synthetic original124/B and five retained placements. Captured predecessor
// collections: fa7452e6360b9ee5b347cd0345e679ce879f4df139ba48139119b899b5b31bd3.
// Full hashes preserve every original field; only asserted purpose is removed.
const fixtures = [
  {
    "name": "EMPTY",
    "input": {
      "jurisdiction": "MD",
      "pathwayId": "juvenile-expungement",
      "requiredInputIds": [
        "age_at_offense",
        "case_outcome",
        "charge",
        "contact_information",
        "county",
        "court",
        "financial_obligations",
        "jurisdiction",
        "offense_category",
        "offense_level",
        "pardon_status",
        "participant_full_legal_name",
        "pathway_id",
        "pending_cases",
        "prior_relief",
        "record_type",
        "residency_or_location",
        "sentence_completion_date"
      ],
      "serverFacts": {
        "jurisdiction": "MD",
        "pathway_id": "juvenile-expungement"
      },
      "screeningAnswers": {
        "jurisdiction_scope": "State or local",
        "ownership_scope": "Yes",
        "possible_pathway_context": "Juvenile expungement",
        "resolved_timing_bucket": "gt_10_years",
        "state_exclusion_categories": [
          "None of these"
        ]
      },
      "prefilledAnswers": {
        "age_at_offense": "30",
        "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
        "financial_obligations": "Yes",
        "offense_level": "Misdemeanor",
        "pardon_status": "No",
        "pending_cases": "No",
        "prior_relief": "Yes",
        "sentence_completion_date": "Yes"
      },
      "savedAnswers": {}
    },
    "predecessorCollectionSha256": "bd3488493c947468a982636b70c137b5ac808f3c1f7d5e3b3dcf48186061e00e",
    "county": {
      "factId": "county",
      "collection": "unresolved",
      "phase": "prepay_confirmation",
      "group": "court_and_case_number",
      "source": "unresolved_route_rule_scope",
      "reason": "a rule references this required fact without an established route consumer; collect it without inferring a value or claiming it decides this route"
    }
  },
  {
    "name": "EXACT_SCREENING_KNOWN",
    "input": {
      "jurisdiction": "MD",
      "pathwayId": "juvenile-expungement",
      "requiredInputIds": [
        "age_at_offense",
        "case_outcome",
        "charge",
        "contact_information",
        "county",
        "court",
        "financial_obligations",
        "jurisdiction",
        "offense_category",
        "offense_level",
        "pardon_status",
        "participant_full_legal_name",
        "pathway_id",
        "pending_cases",
        "prior_relief",
        "record_type",
        "residency_or_location",
        "sentence_completion_date"
      ],
      "serverFacts": {
        "jurisdiction": "MD",
        "pathway_id": "juvenile-expungement"
      },
      "screeningAnswers": {
        "jurisdiction_scope": "State or local",
        "ownership_scope": "Yes",
        "possible_pathway_context": "Juvenile expungement",
        "resolved_timing_bucket": "gt_10_years",
        "state_exclusion_categories": [
          "None of these"
        ]
      },
      "prefilledAnswers": {
        "age_at_offense": "30",
        "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
        "county": "Example County",
        "financial_obligations": "Yes",
        "offense_level": "Misdemeanor",
        "pardon_status": "No",
        "pending_cases": "No",
        "prior_relief": "Yes",
        "sentence_completion_date": "Yes"
      },
      "savedAnswers": {}
    },
    "predecessorCollectionSha256": "2e62b33cb43bc31e401d15642192532187833065fff6c110dd95b2368d11ce0b",
    "county": {
      "factId": "county",
      "collection": "already_known",
      "phase": "known",
      "group": null,
      "source": "carried_forward_or_account_fact",
      "value": "Example County",
      "reason": "this fact is already carried forward or held on the participant's account"
    }
  },
  {
    "name": "EXACT_SCREENING_UNKNOWN",
    "input": {
      "jurisdiction": "MD",
      "pathwayId": "juvenile-expungement",
      "requiredInputIds": [
        "age_at_offense",
        "case_outcome",
        "charge",
        "contact_information",
        "county",
        "court",
        "financial_obligations",
        "jurisdiction",
        "offense_category",
        "offense_level",
        "pardon_status",
        "participant_full_legal_name",
        "pathway_id",
        "pending_cases",
        "prior_relief",
        "record_type",
        "residency_or_location",
        "sentence_completion_date"
      ],
      "serverFacts": {
        "jurisdiction": "MD",
        "pathway_id": "juvenile-expungement"
      },
      "screeningAnswers": {
        "jurisdiction_scope": "State or local",
        "ownership_scope": "Yes",
        "possible_pathway_context": "Juvenile expungement",
        "resolved_timing_bucket": "gt_10_years",
        "state_exclusion_categories": [
          "None of these"
        ]
      },
      "prefilledAnswers": {
        "age_at_offense": "30",
        "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
        "financial_obligations": "Yes",
        "offense_level": "Misdemeanor",
        "pardon_status": "No",
        "pending_cases": "No",
        "prior_relief": "Yes",
        "sentence_completion_date": "Yes"
      },
      "savedAnswers": {}
    },
    "predecessorCollectionSha256": "bd3488493c947468a982636b70c137b5ac808f3c1f7d5e3b3dcf48186061e00e",
    "county": {
      "factId": "county",
      "collection": "unresolved",
      "phase": "prepay_confirmation",
      "group": "court_and_case_number",
      "source": "unresolved_route_rule_scope",
      "reason": "a rule references this required fact without an established route consumer; collect it without inferring a value or claiming it decides this route"
    }
  },
  {
    "name": "EXACT_SAVED_KNOWN",
    "input": {
      "jurisdiction": "MD",
      "pathwayId": "juvenile-expungement",
      "requiredInputIds": [
        "age_at_offense",
        "case_outcome",
        "charge",
        "contact_information",
        "county",
        "court",
        "financial_obligations",
        "jurisdiction",
        "offense_category",
        "offense_level",
        "pardon_status",
        "participant_full_legal_name",
        "pathway_id",
        "pending_cases",
        "prior_relief",
        "record_type",
        "residency_or_location",
        "sentence_completion_date"
      ],
      "serverFacts": {
        "jurisdiction": "MD",
        "pathway_id": "juvenile-expungement"
      },
      "screeningAnswers": {
        "jurisdiction_scope": "State or local",
        "ownership_scope": "Yes",
        "possible_pathway_context": "Juvenile expungement",
        "resolved_timing_bucket": "gt_10_years",
        "state_exclusion_categories": [
          "None of these"
        ]
      },
      "prefilledAnswers": {
        "age_at_offense": "30",
        "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
        "financial_obligations": "Yes",
        "offense_level": "Misdemeanor",
        "pardon_status": "No",
        "pending_cases": "No",
        "prior_relief": "Yes",
        "sentence_completion_date": "Yes"
      },
      "savedAnswers": {
        "county": "Example County"
      }
    },
    "predecessorCollectionSha256": "bd3488493c947468a982636b70c137b5ac808f3c1f7d5e3b3dcf48186061e00e",
    "county": {
      "factId": "county",
      "collection": "unresolved",
      "phase": "prepay_confirmation",
      "group": "court_and_case_number",
      "source": "unresolved_route_rule_scope",
      "reason": "a rule references this required fact without an established route consumer; collect it without inferring a value or claiming it decides this route"
    }
  },
  {
    "name": "EXACT_PREFILLED_KNOWN",
    "input": {
      "jurisdiction": "MD",
      "pathwayId": "juvenile-expungement",
      "requiredInputIds": [
        "age_at_offense",
        "case_outcome",
        "charge",
        "contact_information",
        "county",
        "court",
        "financial_obligations",
        "jurisdiction",
        "offense_category",
        "offense_level",
        "pardon_status",
        "participant_full_legal_name",
        "pathway_id",
        "pending_cases",
        "prior_relief",
        "record_type",
        "residency_or_location",
        "sentence_completion_date"
      ],
      "serverFacts": {
        "jurisdiction": "MD",
        "pathway_id": "juvenile-expungement"
      },
      "screeningAnswers": {
        "jurisdiction_scope": "State or local",
        "ownership_scope": "Yes",
        "possible_pathway_context": "Juvenile expungement",
        "resolved_timing_bucket": "gt_10_years",
        "state_exclusion_categories": [
          "None of these"
        ]
      },
      "prefilledAnswers": {
        "age_at_offense": "30",
        "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
        "county": "Example County",
        "financial_obligations": "Yes",
        "offense_level": "Misdemeanor",
        "pardon_status": "No",
        "pending_cases": "No",
        "prior_relief": "Yes",
        "sentence_completion_date": "Yes"
      },
      "savedAnswers": {}
    },
    "predecessorCollectionSha256": "2e62b33cb43bc31e401d15642192532187833065fff6c110dd95b2368d11ce0b",
    "county": {
      "factId": "county",
      "collection": "already_known",
      "phase": "known",
      "group": null,
      "source": "carried_forward_or_account_fact",
      "value": "Example County",
      "reason": "this fact is already carried forward or held on the participant's account"
    }
  }
];
const expectedPurpose = {
  "kind": "held_case_location_context",
  "factId": "county",
  "originalQuestionId": "Q-d7118400a5658cf4acb7",
  "sourceRef": "CJP3-8A-27.1;Md.Rule11-506;maryland/filing-instructions:juvenile",
  "purpose": "Case-location context identifying the court where the original juvenile petition or citation was filed, or the court to which the juvenile case was transferred.",
  "currentCourtConsumer": "deferred_under_current_juvenile_source_hold",
  "futureCourtIdentificationRequired": true,
  "doesNotEstablish": [
    "residence",
    "guardianship",
    "eligibility",
    "adult_automatic_effective_date",
    "verified_court_or_filing_destination"
  ]
};
assert.deepEqual(purpose, expectedPurpose);
assert.equal(purpose.futureCourtIdentificationRequired, true);
const profile = getProfileByJurisdiction("MD");
const pathway = profile.pathways.find(row => row.id === "juvenile-expungement");
const scope = routeDecidingFactScope(profile, pathway);
const boundary = { specification: null, requiredInputIds: fixtures[0].input.requiredInputIds,
  decidingFactIds: new Set(scope.factIds), unresolvedFactIds: new Set(scope.unresolvedRules.flatMap(row => row.factIds)) };
assert.deepEqual(contract(profile, pathway.id, boundary), purpose);
for (const fixture of fixtures) {
  const before = structuredClone(fixture.input);
  const resolution = packetCollectionFor(fixture.input);
  assert.deepEqual(fixture.input, before, fixture.name + ": raw input immutable");
  const county = resolution.facts.find(fact => fact.factId === "county");
  assert.deepEqual(county.sourcePurpose, expectedPurpose, fixture.name);
  const restored = structuredClone(resolution);
  delete restored.facts.find(fact => fact.factId === "county").sourcePurpose;
  assert.equal(hash(restored), fixture.predecessorCollectionSha256, fixture.name + ": every historical collection field unchanged");
  assert.deepEqual(restored.facts.find(fact => fact.factId === "county"), fixture.county);
  assert.equal(resolution.facts.filter(fact => fact.sourcePurpose).length, 1);
  assert.deepEqual(prepayGateFactIds(resolution), prepayGateFactIds(restored));
  assert.deepEqual(packetCollectionFor(fixture.input), resolution, fixture.name + ": unchanged resume/no-op projection");
  const drift = structuredClone(restored); drift.facts.find(fact => fact.factId !== "county").reason += " drift";
  assert.notEqual(hash(drift), fixture.predecessorCollectionSha256, "unrelated drift cannot be normalized away");
}
for (const mutate of [p=>p.jurisdiction.code="VA", p=>p.profileVersion+="drift", p=>delete p.source, p=>p.source.sourceCorpusSha256="drift",
  p=>{const row=p.pathways.find(row=>row.id===pathway.id);row.filingRequired=!row.filingRequired;},
  p=>p.packetGenerator.pathways.find(row=>row.pathwayId===pathway.id).mode="drift",
  p=>p.orderedDecisionRules.find(row=>row.id==="route-juvenile-expungement").sourceRef="drift"]) {
  const altered = structuredClone(profile); mutate(altered); assert.equal(contract(altered,pathway.id,boundary),undefined);
}
for (const changed of [{specification:{}}, {requiredInputIds:[]}, {decidingFactIds:new Set(["county"])}, {unresolvedFactIds:new Set()}]) assert.equal(contract(profile,pathway.id,{...boundary,...changed}),undefined);
assert.equal(contract(profile,"adult-non-conviction-expungement-under-crim-proc-10-105",boundary),undefined);
assert.equal(contract(profile,pathway.id,boundary,{instruction:"unadopted notice/service directions",fields:[]}),undefined);
const direct = { jurisdiction:"MD",pathwayId:pathway.id,requiredInputIds:["county"],serverFacts:{},screeningAnswers:{},
 routeDecidingFactIds:new Set(),unresolvedRouteFactIds:new Set(["county"]),mdJuvenileCountySourcePurpose:purpose };
assert.deepEqual(resolvePacketCollection(direct).facts[0].sourcePurpose,purpose);
for (const altered of [{jurisdiction:"OH"},{pathwayId:"other"},{specification:{}},{routeDecidingFactIds:new Set(["county"])},
 {unresolvedRouteFactIds:new Set()},{override:{needsHumanClassification:["county"]}},{override:{classes:{county:"render_required"}}},
 {mdJuvenileCountySourcePurpose:{...purpose,purpose:"forged"}}]) assert.equal(resolvePacketCollection({...direct,...altered}).facts.find(f=>f.factId==="county")?.sourcePurpose,undefined);
const directory = mkdtempSync(path.join(tmpdir(),"md-juvenile-purpose-audit-"));
try {
  const args=["scripts/generate-packet-collection-audit.mjs","--route-key","MD:juvenile-expungement","--output-dir",directory];
  execFileSync(process.execPath,args,{cwd:process.cwd(),stdio:"pipe"});
  const audit=JSON.parse(readFileSync(path.join(directory,"packet-collection-audit.json"),"utf8"));
  assert.equal(audit.scope.routeKey,"MD:juvenile-expungement"); assert.equal(audit.routes.length,1);
  for (const denominator of [audit.denominators.compiledPathways,audit.denominators.packetCheckoutLegalAuthority,audit.denominators.counselRatifiedDeployable,audit.denominators.productPaidNow,audit.denominators.gradeACommerciallyEligible]) {
    assert(denominator.routeKeys.every(key=>key==="MD:juvenile-expungement"));
    assert.equal(denominator.routes,denominator.routeKeys.length);
    assert.equal(denominator.jurisdictions,new Set(denominator.routeKeys.map(key=>key.split(":")[0])).size);
  }
  const summary=readFileSync(path.join(directory,"PACKET_COLLECTION_AUDIT.md"),"utf8");
  assert(summary.includes("not a nationwide correction or acceptance"));
  assert(!summary.includes("correction is applied to every route"));
  const source=readFileSync("scripts/generate-packet-collection-audit.mjs","utf8");
  assert(source.includes("resolution.facts.some(fact => fact.sourcePurpose) ? { sourcePurposes:"),"unaffected rows omit purpose field");
  const actual=packetCollectionFor({...fixtures[0].input,screeningAnswers:{},prefilledAnswers:{},savedAnswers:{}});
  assert.deepEqual(audit.routes[0].sourcePurposes,actual.facts.filter(f=>f.sourcePurpose).map(f=>({factId:f.factId,sourcePurpose:f.sourcePurpose})));
  assert.deepEqual(audit.routes[0].unresolvedRequiredFacts,actual.unresolvedRequiredFacts);
  assert(actual.unresolvedRequiredFacts.includes("county"),"unresolved source need is not waived");
  assert(audit.totals.unresolvedRequiredFacts>0,"focused acceptance is not broad zero-unresolved PASS");
  execFileSync(process.execPath,[...args,"--check"],{cwd:process.cwd(),stdio:"pipe"});
  for(const bad of [["--route-key","MD:juvenile-expungement"],["--route-key","MD:juvenile-expungement","--output-dir",path.join(process.cwd(),"data")],
    ["--route-key","MD:nonexistent","--output-dir",directory]]) assert.throws(()=>execFileSync(process.execPath,["scripts/generate-packet-collection-audit.mjs",...bad],{stdio:"pipe"}));
} finally { rmSync(directory,{recursive:true,force:true}); }
console.log("PASS MD juvenile county source-purpose: five retained collections, scoped production audit parity, source/refusal and unresolved-gate preservation; no owner/output acceptance");
