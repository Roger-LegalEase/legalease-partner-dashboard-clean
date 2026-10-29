import assert from "node:assert/strict";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { research115NoRoute, RESEARCH115_NO_ROUTES, evaluateResearchLimitedRoute, RESEARCH115_LIMITED_QUESTIONS } = await import("../src/lib/rcap-engine/research115-limited-branches.ts");
const nv = await import("../src/lib/rcap-engine/nevada-176a-branch.ts");
let checks = 0;
const check = (name, run) => { run(); checks++; console.log(`PASS ${name}`); };
const expectedNo = [
 ["R059", "NV:deferred-judgment-dismissal-and-sealing-under-nrs-176-211"],
 ["R082", "RI:path-e-filed-complaint-relief-under-12-10-12"],
 ["R088", "SD:controlled-substance-deferred-disposition-route"],
 ["R089", "SD:diversion-expungement"],
 ["R110", "WV:juvenile-record-relief"]
];
check("all five original NO entries retain exact IDs", () => assert.deepEqual(RESEARCH115_NO_ROUTES.map(r => [r.reviewId,r.routeId]),expectedNo));
for (const [reviewId,route] of expectedNo) {
 check(`${reviewId} guidance is available in both languages`, () => {
  const value = research115NoRoute(route); assert.equal(value.reviewId, reviewId); assert.ok(value.guidance.en.length>100); assert.ok(value.guidance.es.length>100); assert.ok(value.authorityUrl.startsWith("https://"));
 });
 check(`${reviewId} does not alias another route by title or prefix`,()=>assert.equal(research115NoRoute(`${route}-other`),null));
}
check("R088 accurately distinguishes charge reduction from expungement",()=>assert.match(research115NoRoute(expectedNo[2][1]).guidance.en,/lesser charge/));
check("R089 preserves prosecutor notice and no motion",()=>assert.match(research115NoRoute(expectedNo[3][1]).guidance.en,/without a participant motion/));
const ND="ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05";
const NV453="NV:controlled-substance-possession-sealing-under-nrs-453-3365";
const NV176A="NV:probation-or-specialty-court-dismissal-set-aside-sealing";
const asOf="2026-10-29";
const decide=(route,facts,on=asOf)=>evaluateResearchLimitedRoute(route,Object.freeze(facts),on);
const nd={nd_all_charges_nonconviction:true,nd_qualifying_disposition_date:"2025-07-31",nd_dismissal_part_of_plea_agreement:false,nd_not_fit_to_proceed:false,nd_lack_of_criminal_responsibility:false,nd_case_appealed:false};
check("ND pre-boundary petition selects the court-only closing package",()=>{
 const r=decide(ND,nd); assert.equal(r.status,"qualifying");assert.equal(r.branchId,"pre_effective_date_petition");assert.deepEqual(r.documentIds,["petition_to_close_nonconviction_records","proposed_closing_order","filing_instructions"]);assert.deepEqual(r.externalDocumentIds,["actual_nonconviction_order"]);assert.match(r.reason,/no court filing fee/);
});
check("ND boundary day is automatic and has no court document set",()=>{
 const r=decide(ND,{...nd,nd_qualifying_disposition_date:"2025-08-01"});assert.equal(r.status,"guidance");assert.equal(r.branchId,"post_effective_date_automatic");assert.deepEqual(r.documentIds,[]);assert.equal(r.verificationOn,"2025-10-02");
});
for(const key of ["nd_dismissal_part_of_plea_agreement","nd_not_fit_to_proceed","nd_lack_of_criminal_responsibility","nd_case_appealed"]){
 for(const order of ["2025-07-31","2025-08-01"])check(`ND ${key} excludes on ${order}`,()=>assert.equal(decide(ND,{...nd,[key]:true,nd_qualifying_disposition_date:order}).status,"excluded"));
 for(const unknown of [undefined,null,"unknown","I am not sure"]){check(`ND ${key} unknown ${unknown} is not absence`,()=>{const r=decide(ND,{...nd,[key]:unknown});assert.equal(r.status,"unknown");assert.ok(r.missingFactIds.includes(key));});}
}
check("ND a remaining conviction is excluded",()=>assert.equal(decide(ND,{...nd,nd_all_charges_nonconviction:false}).status,"excluded"));
for(const day of [undefined,"2025-02-30","2025-13-01","2027-01-01","07/31/2025"])check(`ND rejects missing, impossible or future disposition ${day}`,()=>assert.equal(decide(ND,{...nd,nd_qualifying_disposition_date:day}).status,"unknown"));
check("ND missing status stays unknown",()=>assert.equal(decide(ND,{...nd,nd_all_charges_nonconviction:null}).status,"unknown"));
const conviction={nv_453_3365_posture:"453_336_3_conviction",nv_453_3365_terms_completed:true,conviction_date:"2023-10-27",sentencing_date:"2023-10-29",nv_453_3365_rehabilitation_statement:"Completed treatment in 2024 and maintained employment; actual records will be obtained separately."};
check("NV453 day before sentencing anniversary stays not yet",()=>{const r=decide(NV453,conviction,"2026-10-28");assert.equal(r.status,"not_yet");assert.equal(r.eligibleOn,"2026-10-29");});
check("NV453 sentencing anniversary qualifies for application only",()=>{
 const r=decide(NV453,conviction);assert.equal(r.status,"qualifying");assert.equal(r.branchId,"subsection_1_petition");assert.deepEqual(r.documentIds,["petition_to_seal","rehabilitation_declaration","proposed_sealing_order","service_documents","hearing_and_filing_instructions"]);assert.ok(r.externalDocumentIds.includes("participant_rehabilitation_evidence"));assert.match(r.reason,/court to decide/);assert.equal(r.checkoutEnabled,undefined);
});
check("NV453 conviction anniversary before later sentence is too early",()=>assert.equal(decide(NV453,conviction,"2026-10-27").status,"not_yet"));
check("NV453 discharge branch never applies three-year paid petition",()=>{const r=decide(NV453,{nv_453_3365_posture:"453_3363_discharge",nv_453_3365_terms_completed:true});assert.equal(r.status,"guidance");assert.deepEqual(r.documentIds,[]);});
check("NV453 wrong subsection is excluded",()=>assert.equal(decide(NV453,{...conviction,nv_453_3365_posture:"other"}).status,"excluded"));
check("NV453 incomplete conditions are not yet",()=>assert.equal(decide(NV453,{...conviction,nv_453_3365_terms_completed:false}).status,"not_yet"));
for(const field of Object.keys(conviction))check(`NV453 missing ${field} remains unknown`,()=>{const r=decide(NV453,{...conviction,[field]:undefined});assert.equal(r.status,"unknown");assert.ok(r.missingFactIds.includes(field));});
check("NV453 chronology cannot sentence before conviction",()=>assert.equal(decide(NV453,{...conviction,sentencing_date:"2023-10-26"}).status,"unknown"));
check("NV453 future sentencing cannot establish conditions",()=>assert.equal(decide(NV453,{...conviction,sentencing_date:"2027-01-01"}).status,"unknown"));
check("NV453 date wrapper normalizes only explicit .value",()=>assert.equal(decide(NV453,{...conviction,conviction_date:{value:"2023-10-27"}}).status,"qualifying"));
const nv176={ [nv.NEVADA_176A_CHARGE_FACT_ID]:nv.NEVADA_176A_CHARGE_NAMED,[nv.NEVADA_176A_DISPOSITION_FACT_ID]:nv.NEVADA_176A_DISPOSITION_SET_ASIDE,[nv.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]:nv.NEVADA_176A_EXCLUDED_CHARGE_NO,disposition_date:"2019-10-29"};
check("NV176A day before seven years is not yet",()=>assert.equal(decide(NV176A,nv176,"2026-10-28").status,"not_yet"));
check("NV176A exactly seven years selects the petition",()=>{const r=decide(NV176A,nv176);assert.equal(r.status,"qualifying");assert.equal(r.branchId,"subsection_2_petition");assert.deepEqual(r.documentIds,["petition_to_seal","declaration","proposed_sealing_order","filing_instructions"]);});
check("NV176A ordinary program completion stays automatic",()=>{const r=decide(NV176A,{...nv176,[nv.NEVADA_176A_CHARGE_FACT_ID]:nv.NEVADA_176A_CHARGE_OTHER});assert.equal(r.status,"guidance");assert.deepEqual(r.documentIds,[]);});
for(const charge of [nv.NEVADA_176A_CHARGE_NAMED,nv.NEVADA_176A_CHARGE_OTHER])check(`NV176A bar applies on both charge branches ${charge}`,()=>assert.equal(decide(NV176A,{...nv176,[nv.NEVADA_176A_CHARGE_FACT_ID]:charge,[nv.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]:nv.NEVADA_176A_EXCLUDED_CHARGE_YES}).status,"excluded"));
for(const field of [nv.NEVADA_176A_CHARGE_FACT_ID,nv.NEVADA_176A_DISPOSITION_FACT_ID,nv.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID,"disposition_date"])check(`NV176A missing ${field} stays unknown`,()=>assert.equal(decide(NV176A,{...nv176,[field]:null}).status,"unknown"));
for(const invalid of ["", "invalid", new Date(NaN)])check(`invalid matter clock ${invalid} refuses`,()=>assert.equal(decide(ND,nd,invalid).status,"unknown"));
check("unimplemented route returns null and creates no eligibility assertion",()=>assert.equal(decide("AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085",{}),null));
for(const [route,questions] of Object.entries(RESEARCH115_LIMITED_QUESTIONS))check(`${route} intake asks material facts bilingually without required uploads`,()=>{assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);for(const q of questions){assert.ok(q.en);assert.ok(q.es);assert.notEqual(q.type,"upload");}});
console.log(`${checks}/${checks} research-limited branch controls passed; no checkout, packet-page, hosted or production verification is implied.`);
