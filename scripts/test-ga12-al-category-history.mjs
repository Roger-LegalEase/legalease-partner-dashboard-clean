import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

register('./lib/ts-esm-loader.mjs', import.meta.url);
const mutation=process.argv.find(arg=>arg.startsWith('--mutation='))?.slice(11);
const mutations={
 ky_context:["specification == null && contactRepresentationHash(profile) === \"4e84c6d8ba6469a095c50f09cacfb5518c4132d049fbf068513c6eb925e6a364\"", "true"],
 ky_collection:["kyCategoryHistory ||", "false ||"],
 ky_level:["factId === \"offense_category\" && !overrideClass", "(factId === \"offense_category\" || kyCategoryHistory && factId === \"offense_level\") && !overrideClass"],
 ky_question:["\"ky_three_route_category_history\", \"ia_three_route_category_history\"", "\"disabled_ky_category_history\", \"ia_three_route_category_history\""],
 ky_history:["kyThreeRouteCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))", "false"],
 ky_route_0:["profile?.jurisdiction.code === \"KY\" && [\"misdemeanor-violation-traffic-conviction\", \"nonconviction-431076\", \"void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276\"]", "profile?.jurisdiction.code === \"KY\" && [\"unassigned-route\", \"nonconviction-431076\", \"void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276\"]"],
 ky_route_1:["profile?.jurisdiction.code === \"KY\" && [\"misdemeanor-violation-traffic-conviction\", \"nonconviction-431076\", \"void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276\"]", "profile?.jurisdiction.code === \"KY\" && [\"misdemeanor-violation-traffic-conviction\", \"unassigned-route\", \"void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276\"]"],
 ky_route_2:["profile?.jurisdiction.code === \"KY\" && [\"misdemeanor-violation-traffic-conviction\", \"nonconviction-431076\", \"void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276\"]", "profile?.jurisdiction.code === \"KY\" && [\"misdemeanor-violation-traffic-conviction\", \"nonconviction-431076\", \"unassigned-route\"]"],
 la_context:["specification == null && contactRepresentationHash(profile) === \"a0bf1a76b91c555e5b0cca05b96d6b9a34721db466c7beffdc20fbd86f1e36e6\"", "true"],
 la_collection:["laCategoryHistory ||", "false ||"],
 la_level:["factId === \"offense_category\" && !overrideClass", "(factId === \"offense_category\" || laCategoryHistory && factId === \"offense_level\") && !overrideClass"],
 la_question:['"la_three_route_category_history"','"disabled_la_category_history"'],
 la_history:["laThreeRouteCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))", "false"],
 la_route_0:["profile?.jurisdiction.code === \"LA\" && [\"automated-expungement-status-verification-art-985-2\", \"expungement-by-redaction-for-multi-person-records\", \"non-conviction-arrest-expungement\"]", "profile?.jurisdiction.code === \"LA\" && [\"unassigned-route\", \"expungement-by-redaction-for-multi-person-records\", \"non-conviction-arrest-expungement\"]"],
 la_route_1:["profile?.jurisdiction.code === \"LA\" && [\"automated-expungement-status-verification-art-985-2\", \"expungement-by-redaction-for-multi-person-records\", \"non-conviction-arrest-expungement\"]", "profile?.jurisdiction.code === \"LA\" && [\"automated-expungement-status-verification-art-985-2\", \"unassigned-route\", \"non-conviction-arrest-expungement\"]"],
 la_route_2:["profile?.jurisdiction.code === \"LA\" && [\"automated-expungement-status-verification-art-985-2\", \"expungement-by-redaction-for-multi-person-records\", \"non-conviction-arrest-expungement\"]", "profile?.jurisdiction.code === \"LA\" && [\"automated-expungement-status-verification-art-985-2\", \"expungement-by-redaction-for-multi-person-records\", \"unassigned-route\"]"],
 ma_context:['export function maThreeRouteCategoryIsHistory(profile, pathwayId, specification) {','export function maThreeRouteCategoryIsHistory(profile, pathwayId, specification) { return true;'],
 ma_collection:["maCategoryHistory ||", "false ||"],
 ma_level:["factId === \"offense_category\" && !overrideClass", "(factId === \"offense_category\" || maCategoryHistory && factId === \"offense_level\") && !overrideClass"],
 ma_question:['"ma_three_route_category_history"','"disabled_ma_category_history"'],
 ma_history:["maThreeRouteCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))", "false"],
 ma_route_0:["profile?.jurisdiction.code === \"MA\" && [\"adult-conviction-sealing-under-m-g-l-c-276-100a\", \"automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c\", \"court-requested-sealing-for-dismissal-or-nolle-prosequi-100c\"]", "profile?.jurisdiction.code === \"MA\" && [\"unassigned-route\", \"automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c\", \"court-requested-sealing-for-dismissal-or-nolle-prosequi-100c\"]"],
 ma_route_1:["profile?.jurisdiction.code === \"MA\" && [\"adult-conviction-sealing-under-m-g-l-c-276-100a\", \"automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c\", \"court-requested-sealing-for-dismissal-or-nolle-prosequi-100c\"]", "profile?.jurisdiction.code === \"MA\" && [\"adult-conviction-sealing-under-m-g-l-c-276-100a\", \"unassigned-route\", \"court-requested-sealing-for-dismissal-or-nolle-prosequi-100c\"]"],
 ma_route_2:["profile?.jurisdiction.code === \"MA\" && [\"adult-conviction-sealing-under-m-g-l-c-276-100a\", \"automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c\", \"court-requested-sealing-for-dismissal-or-nolle-prosequi-100c\"]", "profile?.jurisdiction.code === \"MA\" && [\"adult-conviction-sealing-under-m-g-l-c-276-100a\", \"automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c\", \"unassigned-route\"]"],
 ma_next_context:["export function maAdditionalCategoryIsHistory(profile, pathwayId, specification) {", "export function maAdditionalCategoryIsHistory(profile, pathwayId, specification) { return true;"],
 ma_next_collection:["maAdditionalCategoryHistory ||", "false ||"],
 ma_next_level:["factId === \"offense_category\" && !overrideClass", "(factId === \"offense_category\" || maAdditionalCategoryHistory && factId === \"offense_level\") && !overrideClass"],
 ma_next_question:["\"ma_additional_category_history\"", "\"disabled_ma_category_history\""],
 ma_next_history:["maAdditionalCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))", "false"],
 ma_next_route_0:["profile?.jurisdiction.code === \"MA\" && [\"juvenile-record-sealing-under-100b\", \"marijuana-only-expungement\", \"non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k\"]", "profile?.jurisdiction.code === \"MA\" && [\"unassigned-route\", \"marijuana-only-expungement\", \"non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k\"]"],
 ma_next_route_1:["profile?.jurisdiction.code === \"MA\" && [\"juvenile-record-sealing-under-100b\", \"marijuana-only-expungement\", \"non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k\"]", "profile?.jurisdiction.code === \"MA\" && [\"juvenile-record-sealing-under-100b\", \"unassigned-route\", \"non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k\"]"],
 ma_next_route_2:["profile?.jurisdiction.code === \"MA\" && [\"juvenile-record-sealing-under-100b\", \"marijuana-only-expungement\", \"non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k\"]", "profile?.jurisdiction.code === \"MA\" && [\"juvenile-record-sealing-under-100b\", \"marijuana-only-expungement\", \"unassigned-route\"]"],
 mame_context:["export function maMeCategoryIsHistory(profile, pathwayId, specification) {", "export function maMeCategoryIsHistory(profile, pathwayId, specification) { return true;"],
 mame_collection:["maMeCategoryHistory ||", "false ||"],
 mame_level:["factId === \"offense_category\" && !overrideClass", "(factId === \"offense_category\" || maMeCategoryHistory && factId === \"offense_level\") && !overrideClass"],
 mame_question:["\"ma_me_category_history\"", "\"disabled_ma_me_history\""],
 mame_history:["maMeCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))", "false"],
 mame_route_0:["pathwayId === \"time-based-expungement-under-100f-100j\"", "pathwayId === \"unassigned-route\""],
 mame_route_1:["profile?.jurisdiction.code === \"ME\" && [\"adult-conviction-sealing\", \"adult-non-conviction-record-relief\"]", "profile?.jurisdiction.code === \"ME\" && [\"unassigned-route\", \"adult-non-conviction-record-relief\"]"],
 mame_route_2:["profile?.jurisdiction.code === \"ME\" && [\"adult-conviction-sealing\", \"adult-non-conviction-record-relief\"]", "profile?.jurisdiction.code === \"ME\" && [\"adult-conviction-sealing\", \"unassigned-route\"]"],

 hi_context:['specification == null && contactRepresentationHash(profile) === "9b1a121be377fa34e6425d96f7edb82428321b60a757870f8dc4878ebfb27ece"','specification == null && true'],
 hi_collection:['hiCategoryHistory ||','false ||'],
 hi_level:['factId === "offense_category" && !overrideClass','(factId === "offense_category" || hiCategoryHistory && factId === "offense_level") && !overrideClass'],
 hi_question:['"hi_three_route_category_history", "ar_bound_category_history"','"disabled_hi_category_history", "ar_bound_category_history"'],
 hi_history:['hiThreeRouteCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))','false'],
 hi_dui:['"dui-under-21-conviction", "first-time-drug-conviction"].includes','"unassigned-route", "first-time-drug-conviction"].includes'],
 hi_drug:['"first-time-drug-conviction"].includes','"unassigned-route"].includes'],
 ia_context:['specification == null && contactRepresentationHash(profile) === "ffdbac49e5a1e96f22cb8cd6f4842e9b9c367b988901fa061091fc6d9107ed9e"','true'],
 ia_collection:['iaCategoryHistory ||','false ||'],
 ia_level:['factId === "offense_category" && !overrideClass','(factId === "offense_category" || iaCategoryHistory && factId === "offense_level") && !overrideClass'],
 ia_question:['"ia_three_route_category_history", "hi_three_route_category_history"','"disabled_ia_category_history", "hi_three_route_category_history"'],
 ia_history:['iaCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))','false'],
 context:['export function alThreeRouteCategoryIsHistory(profile, pathwayId, specification) {','export function alThreeRouteCategoryIsHistory(profile, pathwayId, specification) { return true;'],
 collection:['alCategoryHistory || hiCategoryHistory','false || hiCategoryHistory'],
 ownership:['factId === "offense_category" && !overrideClass','factId === "offense_category"'],
 question:['"al_three_route_category_history", "nv_program_category_history"','"disabled_al_category_history", "nv_program_category_history"'],
 history:['alThreeRouteCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))','false'],
 loss:['const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds);','const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds); delete shapesPreserved.packetAnswers.offense_category;'],
 priority:['const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds);','const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds); shapesPreserved.packetAnswers.offense_category = "Inferred category";']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`import {writeSync} from 'node:fs';let d;export function initialize(x){d=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith(d[2])){if(!r.source.includes(d[0]))throw Error('mutation target absent');writeSync(2,JSON.stringify({appliedMutation:d[3]})+'\\n');return {...r,source:r.source.replace(d[0],d[1])}}return r}`),{data:[...mutations[mutation],['mame_context','mame_collection','mame_level','mame_route_0','mame_route_1','mame_route_2','ma_next_context','ma_next_collection','ma_next_level','ma_next_route_0','ma_next_route_1','ma_next_route_2','ma_context','ma_collection','ma_level','ma_route_0','ma_route_1','ma_route_2','la_context','la_collection','la_level','la_route_0','la_route_1','la_route_2','ky_context','ky_collection','ky_level','ky_route_0','ky_route_1','ky_route_2','hi_context','hi_collection','hi_level','hi_dui','hi_drug','ia_context','ia_collection','ia_level','collection','context','ownership'].includes(mutation)?'/packet-collection.ts':'/packet-information.ts',mutation]});}
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {packetFulfillmentAuthority}=await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {createConsumerPaymentPlaceholder}=await import('../src/lib/expungement-ai/payment-adapter.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { maMeCategoryIsHistory, maAdditionalCategoryIsHistory, maThreeRouteCategoryIsHistory, laThreeRouteCategoryIsHistory, kyThreeRouteCategoryIsHistory, alThreeRouteCategoryIsHistory, hiThreeRouteCategoryIsHistory, iaCategoryIsHistory, resolvePacketCollection } = await import('../src/lib/expungement-ai/packet-collection.ts');

// GA-12 / QD-bd6b15fff22cbe1501cb: three source-bound AL guidance consumers.
// GA12 HI Q-49c293131f5eba7089d9 / Q-4fbcf8810b325d290849 / Q-6a2e1331cb59164e4634.
// GA12 HI Q-4b42a49baff24e9dcae6 / Q-8a28b159789e3e372c69: court-order conviction routes; the order, not a category, decides.
// GA12 IA Q-377830ef29f46987d4b3 / Q-da97aa3887af5a623b94: preserve the existing source-form reference.
// GA12 IA Q-954756996d44111dd6f6 / Q-11a00e1e894ff5efe5f9 / Q-91de493bf957b599962f.
// GA12 Q-7196d0f90cccd5e9538c / Q-c2da947c5919f3b48951 / Q-524a1f85273abc4b97d0: exact Massachusetts/Maine optional category history.
// GA12 Q-22a8ba63fd3f2a4e8e45 / Q-8f92be5a3cad6117e157 / Q-afe18f299b99e2718082: exact Massachusetts optional category history.
// GA12 Q-91fa41f53170662c08a0 / Q-5b36a34a7c948611ee95 / Q-bcaeae1f794e7c817c9e: exact Massachusetts optional category history.
// GA12 Q-b650af1f0c8e9cd60954 / Q-a98c1c42d4ca2dc87de6 / Q-6e194b7a829b9e9d00ba: exact Louisiana optional category history.
// GA12 Q-afb21e87bf5f515361d3 / Q-e5235e1dd8cc84bbc183 / Q-85cf769eef915fa16dd9: exact Kentucky optional category history.
const cases = [
  ["Q-afb21e87bf5f515361d3", "misdemeanor-violation-traffic-conviction", "KY"],
  ["Q-e5235e1dd8cc84bbc183", "nonconviction-431076", "KY"],
  ["Q-85cf769eef915fa16dd9", "void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276", "KY"],
  ["Q-b650af1f0c8e9cd60954", "automated-expungement-status-verification-art-985-2", "LA"],
  ["Q-a98c1c42d4ca2dc87de6", "expungement-by-redaction-for-multi-person-records", "LA"],
  ["Q-6e194b7a829b9e9d00ba", "non-conviction-arrest-expungement", "LA"],
  ["Q-91fa41f53170662c08a0", "adult-conviction-sealing-under-m-g-l-c-276-100a", "MA"],
  ["Q-5b36a34a7c948611ee95", "automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c", "MA"],
  ["Q-bcaeae1f794e7c817c9e", "court-requested-sealing-for-dismissal-or-nolle-prosequi-100c", "MA"],
  ["Q-22a8ba63fd3f2a4e8e45", "juvenile-record-sealing-under-100b", "MA"],
  ["Q-8f92be5a3cad6117e157", "marijuana-only-expungement", "MA"],
  ["Q-afe18f299b99e2718082", "non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k", "MA"],
  ["Q-7196d0f90cccd5e9538c", "time-based-expungement-under-100f-100j", "MA"],
  ["Q-c2da947c5919f3b48951", "adult-conviction-sealing", "ME"],
  ["Q-524a1f85273abc4b97d0", "adult-non-conviction-record-relief", "ME"],

  ['Q-49c293131f5eba7089d9','deferred-acceptance-one-year','HI'],
  ['Q-4fbcf8810b325d290849','deferred-prostitution-three-year','HI'],
  ['Q-6a2e1331cb59164e4634','nonconviction-arrest-expungement','HI'],
  ['Q-4b42a49baff24e9dcae6','dui-under-21-conviction','HI'],
  ['Q-8a28b159789e3e372c69','first-time-drug-conviction','HI'],
  ['Q-954756996d44111dd6f6','minor-prostitution-7251','IA'],
  ['Q-11a00e1e894ff5efe5f9','misdemeanor-901c3','IA'],
  ['Q-91de493bf957b599962f','nonconviction-901c2','IA'],
  ['Q-377830ef29f46987d4b3','public-intoxication-12346','IA'],
  ['Q-da97aa3887af5a623b94','underage-alcohol-12347','IA'],
  [
    "Q-ce34aa2230f68728a3ca",
    "human-trafficking-victim-expungement"
  ],
  [
    "Q-71b990754b6c4d4ab55b",
    "non-conviction-expungement-under-ala-code-15-27-1-a-and-15-27-2-a"
  ],
  [
    "Q-1c1d81d2035e0ec75e0f",
    "pardoned-felony-expungement-under-ala-code-15-27-2-c"
  ]
];
const fixtures=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
// Reuse the retained automation-status witness; no funding or availability is inferred.
fixtures.push({"pathwayKey": "LA:automated-expungement-status-verification-art-985-2", "profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted", "court_requirements_completed": "yes", "financial_obligations": "I am not sure", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Automated-expungement status verification (Art. 985.2)", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}});
// Reuse retained MA facts and the exact automatic-route label; no relief is inferred.
fixtures.push({"pathwayKey": "MA:automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c", "jurisdiction": "MA", "pathwayId": "automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c", "profileVersion": "2026-06-19-source-conversion-1", "publicRoute": "/expungement-ai/screening/massachusetts", "evaluationEndpoint": "POST /api/expungement-ai/screening", "answers": {"age_at_offense": "30", "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted", "financial_obligations": "Yes", "identity_error": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Automatic non-conviction sealing for not-guilty, no-bill, or no-probable-cause outcomes (\u00a7 100C)", "record_documents": "Yes", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}, "rounds": [{"round": 0, "droppedAsNotEvaluatorQuestions": ["court_requirements_completed", "pardon_status", "state_exclusion_categories", "trafficking_status"]}, {"round": 1, "requested": ["age_at_offense", "identity_error"], "supplied": {"age_at_offense": "30", "identity_error": "Yes"}}], "expected": {"pathwayId": "adult-conviction-sealing-under-m-g-l-c-276-100a", "resultCode": "not_covered_yet", "paymentAllowed": false}});
// Preserve the two identified source forms; no registered value binding or fulfillment record is inferred.
const maSourceFormIds={"adult-conviction-sealing-under-m-g-l-c-276-100a": ["MA:LegalEase massachusetts/fillable-jud-mps-Petition-to-Seal.pdf:416f9a1d1a7ade6e71ffe3964a30c2d247bd1aca3982f4ff8e55550a730506ce"], "automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c": [], "court-requested-sealing-for-dismissal-or-nolle-prosequi-100c": ["MA:LegalEase massachusetts/jud-tc-Petition-to-Seal-Criminal-Records-for-Nolle-Prosequi-or-Dismissal.pdf:f83d441b6ddaf1efd02349519256996aea6e7c4bd812f3f1515ba89b58815bb0"], "juvenile-record-sealing-under-100b": ["MA:LegalEase massachusetts/jud-tc-Petition-to-Seal-Criminal-Records-for-Nolle-Prosequi-or-Dismissal.pdf:f83d441b6ddaf1efd02349519256996aea6e7c4bd812f3f1515ba89b58815bb0"], "marijuana-only-expungement": ["MA:LegalEase massachusetts/jud-tc-Petition-to-Seal-Criminal-Records-for-Nolle-Prosequi-or-Dismissal.pdf:f83d441b6ddaf1efd02349519256996aea6e7c4bd812f3f1515ba89b58815bb0"], "non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k": ["MA:LegalEase massachusetts/jud-tc-Petition-to-Seal-Criminal-Records-for-Nolle-Prosequi-or-Dismissal.pdf:f83d441b6ddaf1efd02349519256996aea6e7c4bd812f3f1515ba89b58815bb0"], "time-based-expungement-under-100f-100j": [], "adult-conviction-sealing": ["ME:LegalEase Maine/MJB-Form-jv-043.pdf:79d0e40df56d060a4bd51f9f022cc95b444b5791f486c3e7c92640d76ed095e7", "ME:LegalEase Maine/MJB-Form-cr-289.pdf:bbf89387690d1ab17984c5b799366a26196e8d71b5172bc2768f593b819a7423", "ME:LegalEase Maine/MJB-Form-cr-218.pdf:82a9e8084346aa736cf25dc6c663d511e96e7205900b97a7dc2adc4ceec905d4"], "adult-non-conviction-record-relief": []};
const maAdditionalRoutes=["juvenile-record-sealing-under-100b", "marijuana-only-expungement", "non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k"];
const maMeRoutes=["time-based-expungement-under-100f-100j", "adult-conviction-sealing", "adult-non-conviction-record-relief"];
// Exact retained Maine screening facts plus the non-conviction route label; no relief inferred.
fixtures.push(...[{"pathwayKey": "ME:adult-non-conviction-record-relief", "jurisdiction": "ME", "pathwayId": "adult-non-conviction-record-relief", "profileVersion": "2026-06-19-source-conversion-1", "publicRoute": "/expungement-ai/screening/maine", "evaluationEndpoint": "POST /api/expungement-ai/screening", "answers": {"age_at_offense": "30", "case_outcome": "Arrest or citation with no charge filed", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Felony", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Adult non-conviction record relief", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "trafficking_status": "No"}, "rounds": [{"round": 0, "droppedAsNotEvaluatorQuestions": ["state_exclusion_categories"]}, {"round": 1, "requested": ["age_at_offense", "resolved_timing_bucket"], "supplied": {"age_at_offense": "30", "resolved_timing_bucket": "gt_10_years"}}], "expected": {"pathwayId": "adult-conviction-sealing", "resultCode": "needs_more_info", "paymentAllowed": false}}]);
const category = 'offense_category';
const maps = ['screeningAnswers', 'prefilledAnswers', 'packetAnswers'];
const safety = snapshot => ({
  pathwayId: snapshot.pathwayId, resultCode: snapshot.resultCode,
  paymentAllowed: snapshot.paymentAllowed, selectedTrackId: snapshot.selectedTrackId,
  packetPlan: snapshot.packetPlan, requiredInputIds: snapshot.requiredInputIds,
  packetFamilyIdentifiers: snapshot.packetFamilyIdentifiers
});
let checks = 0, redFailures = 0;
const records = new Map();
function check(name, fn) {
  try { fn(); checks++; } catch (error) { console.error(JSON.stringify({failedCheck:name,checks})); throw error; }
}
for (const [questionRecordId, route, state = 'AL'] of cases) {
  const profile=getProfileByJurisdiction(state);
  const historyContext={ME:maMeCategoryIsHistory,MA:maMeRoutes.includes(route)?maMeCategoryIsHistory:maAdditionalRoutes.includes(route)?maAdditionalCategoryIsHistory:maThreeRouteCategoryIsHistory,LA:laThreeRouteCategoryIsHistory,KY:kyThreeRouteCategoryIsHistory,HI:hiThreeRouteCategoryIsHistory,IA:iaCategoryIsHistory}[state]??alThreeRouteCategoryIsHistory;
  const hiCourtOrder=state==='HI'&&['dui-under-21-conviction','first-time-drug-conviction'].includes(route);
  const result=['MA','ME'].includes(state)?{"adult-conviction-sealing-under-m-g-l-c-276-100a": "not_covered_yet", "automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c": "guidance_only", "court-requested-sealing-for-dismissal-or-nolle-prosequi-100c": "guidance_only", "juvenile-record-sealing-under-100b": "not_covered_yet", "marijuana-only-expungement": "guidance_only", "non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k": "guidance_only", "time-based-expungement-under-100f-100j": "not_covered_yet", "adult-conviction-sealing": "needs_more_info", "adult-non-conviction-record-relief": "guidance_only"}[route]:state==='LA'?(route==='non-conviction-arrest-expungement'?'packet_ready_with_caution':'guidance_only'):state==='KY'?(route==='misdemeanor-violation-traffic-conviction'?'not_covered_yet':'needs_review'):state==='HI'&&(route==='nonconviction-arrest-expungement'||hiCourtOrder)?'packet_ready_with_caution':state==='IA'&&route!=='minor-prostitution-7251'?'needs_review':'guidance_only';
  const payment=result==='packet_ready_with_caution';
  const historySource={ME:'ma_me_category_history',MA:maMeRoutes.includes(route)?'ma_me_category_history':maAdditionalRoutes.includes(route)?'ma_additional_category_history':'ma_three_route_category_history',LA:'la_three_route_category_history',KY:'ky_three_route_category_history',HI:'hi_three_route_category_history',IA:'ia_three_route_category_history'}[state]??'al_three_route_category_history';
  const historyReason={ME:"These source-bound consumers use separate disposition, offense-level, timing and court facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility.",MA:maMeRoutes.includes(route)?"These source-bound consumers use separate disposition, offense-level, timing and court facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility.":"These source-bound Massachusetts consumers use separate disposition, offense-level, timing and court facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility.",LA:"These source-bound Louisiana consumers use separate disposition, charge, timing, redaction and automation-status facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility.",KY:"These source-bound Kentucky consumers use separate charge, disposition, offense-level and timing facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility.",HI:'These source-bound Hawaii consumers use separate disposition, charge and court-order facts. Earlier offense categories remain optional literal history and establish neither statutory classification nor eligibility.',IA:'These source-bound Iowa consumers use separate charge, disposition, age and timing facts. Earlier offense categories remain optional literal history and establish neither statutory classification nor eligibility.'}[state]??'These source-bound Alabama guidance consumers do not bind an offense category to a document. Earlier category answers remain optional literal history; disposition, pardon, trafficking and exclusion facts remain separate.';
  const witness=fixtures.find(f=>f.pathwayKey===`${state}:${route}`);assert(witness);
  // The HI conviction witnesses omit the required court-order confirmation; with it the paid packet opens.
  const answers=hiCourtOrder?{...structuredClone(witness.answers),hi_court_order_confirmed:'Yes'}:structuredClone(witness.answers);
  // Declared HI DUI successor: rule-09 belongs to the drug route; its sibling expectation stays fixed.
  const reason=['MA','ME'].includes(state)?{"adult-conviction-sealing-under-m-g-l-c-276-100a": "ma.intentional_unsupported_route", "automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c": "ma.guidance_only_no_user_filed_court_petition", "court-requested-sealing-for-dismissal-or-nolle-prosequi-100c": "ma.lawrence_hold_guidance_only", "juvenile-record-sealing-under-100b": "ma.intentional_unsupported_route", "marijuana-only-expungement": "ma.lawrence_hold_guidance_only", "non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k": "ma.lawrence_hold_guidance_only", "time-based-expungement-under-100f-100j": "ma.intentional_unsupported_route", "adult-conviction-sealing": "me.route_identified_packet_not_yet_available", "adult-non-conviction-record-relief": "me.lawrence_hold_guidance_only"}[route]:state==='LA'?(route==='non-conviction-arrest-expungement'?'la.compiled_rule_match.rule-09-if-article-894-b-was-not-already-completed-but-appears-':route==='expungement-by-redaction-for-multi-person-records'?'la.lawrence_hold_guidance_only':'la.guidance_only_no_user_filed_court_petition'):state==='KY'?(result==='not_covered_yet'?'ky.intentional_unsupported_route':'ky.waiting_rule_not_executed'):hiCourtOrder?(route==='dui-under-21-conviction'?'hi.dui_pathway_context':'hi.compiled_rule_match.rule-09-the-source-identifies-hrs-706-622-5-and-706-622-8-first'):payment?'hi.compiled_rule_match.rule-04-a-complete-application-valid-government-photo-id-paymen':result==='needs_review'?'ia.waiting_rule_not_executed':state.toLowerCase()+'.guidance_only_no_user_filed_court_petition';
  const authoritative = evaluate({ jurisdiction: state, profileVersion: profile.profileVersion,
    matterId: `synthetic-${questionRecordId}`, answers });
  check(`${route}: exact conditional information authority`, () => {
    assert.equal(authoritative.evaluation.pathwayId, route);
    assert.equal(authoritative.evaluation.resultCode, result);
    assert.equal(authoritative.evaluation.reasons[0].code, reason);
    assert.equal(authoritative.evaluation.paymentAllowed, payment);
    assert.deepEqual(authoritative.evaluation.packetPlan.sourceFormIds,
      ['MA','ME'].includes(state) ? maSourceFormIds[route] : state === 'IA' && ['public-intoxication-12346', 'underage-alcohol-12347'].includes(route)
        ? ['IA:LegalEase Iowa/2_86_4_123_PAULA_Expungement_18A04436D4107.pdf:8b2c33815548615733f01f964340fc39efcd8c252ad8c3ee50b97b0639753ffc'] : []);
  });
  const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers,
    packetAnswers: {}, dependencies: {}, capturedAt: '2026-10-17T00:00:00.000Z' });
  assert(seed);
  const original = { status: 'unverified', reason: 'synthetic_current_source_witness', revision: 0,
    draftHash: seed.hash, draftSnapshot: seed.snapshot };
  records.set(`synthetic-${questionRecordId}`, structuredClone(original));
  if(process.argv.includes('--regression-only')){
    const m=P.protectedPacketInformationModelFor(original);assert(m);
    try{assert(!m.builderQuestions.some(q=>q.id===category));assert(!m.missingInputIds.includes(category));}
    catch(error){redFailures++;console.error(JSON.stringify({route,missing:m.missingInputIds.includes(category),error:error.message}));}
    continue;
  }
  check(`${route}: actual fulfillment refusal`,()=>{
    const refusal=packetFulfillmentAuthority(state,route,'checkout creation');assert.equal(refusal.allowed,false);
    assert.equal(refusal.reason,`${state}:${route}: NO_RECORD. No Grade-A fulfillment record binds ${state}:${route}; a route nobody has written a record for fails closed.`);
    const price=createConsumerPaymentPlaceholder({...seed.snapshot,state},route);assert.equal(price.enabled,false);assert.equal(price.amountCents,undefined);
  });
  for(const [label,delta,result,code]of [
    ['federal',{jurisdiction_scope:'Federal'},'hard_stop',state.toLowerCase()+'.federal_or_out_of_scope'],
    ...(state==='AL'?[['excluded',{state_exclusion_categories:['Violent offense']},'likely_not_eligible','al.state_exclusion_selected']]:state==='HI'&&route==='nonconviction-arrest-expungement'?[['conviction excluded',{case_outcome:'Felony conviction'},'likely_not_eligible','hi.hi_831_3_2_nonconviction_required_not_eligible']]:[['ownership refused',{ownership_scope:'No'},'hard_stop',state.toLowerCase()+'.ownership_scope_hard_stop']]),
    ['uncertain',{case_outcome:'I am not sure'},'needs_review',state.toLowerCase()+'.source_fact_unknown']
  ])check(`${route}: ${label} keeps predecessor outcome and saved history`,()=>{
    const input={...answers,...delta};
    const a=evaluate({jurisdiction:state,profileVersion:profile.profileVersion,matterId:'synthetic-boundary-'+questionRecordId,answers:input});
    assert.equal(a.evaluation.resultCode,result);assert.equal(a.evaluation.reasons[0].code,code);assert.equal(a.evaluation.paymentAllowed,false);
    assert.throws(()=>evaluate({jurisdiction:state,profileVersion:profile.profileVersion,answers:{...input,offense_category:'Injected category'}}),/Unknown question ids: offense_category/);
    if(label==='uncertain'){
      const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:input,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
      for(const raw of [undefined,'Literal court category',{unknown:true},['Earlier category','Another category']]){
        const snapshot=structuredClone(seed.snapshot);if(raw!==undefined)snapshot.packetAnswers.offense_category=structuredClone(raw);
        const record={status:'unverified',revision:0,draftSnapshot:snapshot,draftHash:P.protectedPacketDraftHash(snapshot)};
        const evaluated=P.evaluateProtectedPacketFacts(snapshot).evaluation;
        assert.equal(evaluated.resultCode,result);assert.equal(evaluated.reasons[0].code,code);assert.equal(evaluated.paymentAllowed,false);
        assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,record);
      }
    }
  });
  const model = record => P.protectedPacketInformationModelFor(record);
  check(`${route}: no new category gate or inferred classification`, () => {
    const m = model(original);
    assert(m);
    if(state==='HI'||state==='IA'||state==='KY'||state==='LA'||state==='MA'||state==='ME')assert.equal(m.questions.find(q=>q.id==='offense_level')?.required,true);
    assert(!m.builderQuestions.some(q => q.id === category));
    assert(!m.missingInputIds.includes(category));
    for (const map of maps) assert(!Object.hasOwn(seed.snapshot[map], category));
  });
  check(`${route}: existing saved-item model retains optional literal context`, () => {
    const item = { id: `synthetic-${questionRecordId}`, state, resultCode: result, artifactRefs: {
      commercialFlow: { screening: { profileVersion: profile.profileVersion, pathwayId: route,
        packetPlan: seed.snapshot.packetPlan, answers }, packetInformation: { answers: { [category]: 'Saved court category' } } }
    } };
    const before = structuredClone(item), m = P.packetInformationModelFor(item);
    assert(m);
    assert.equal(m.questions.find(q => q.id === category)?.required, false);
    assert.equal(m.builderQuestions.find(q => q.id === category)?.required, false);
    assert.equal(m.initialAnswers[category], 'Saved court category');
    assert.deepEqual(item, before);
  });
  for (const map of maps) for (const raw of ['Literal court category', { value: 'Amended literal category', unknown: false },
    { unknown: true }, null, ['Old incompatible category shape']]) {
    const record = structuredClone(original);
    record.draftSnapshot[map][category] = structuredClone(raw);
    record.draftHash = P.protectedPacketDraftHash(record.draftSnapshot);
    const before = structuredClone(record);
    check(`${route}: optional raw history ${map}/${JSON.stringify(raw)}`, () => {
      const m = model(record);
      assert(m);
      assert.equal(m.questions.find(q => q.id === category)?.required, false);
      assert.equal(m.builderQuestions.find(q => q.id === category)?.required, false);
      assert(!m.missingInputIds.includes(category));
      assert.deepEqual(record, before);
      assert.deepEqual(safety(record.draftSnapshot), safety(seed.snapshot));
      const patch = P.packetInformationPatch({ existingItem: { id: `synthetic-${questionRecordId}`, jurisdiction: state, artifactRefs: {} },
        answers: {}, protectedVerification: record });
      assert(patch);
      assert.deepEqual(patch.protectedTransition.nextVerification, before);
    });
  }
  check(`${route}: source, route and new consumer refusals`, () => {
    assert(historyContext(profile, route, null));
    for (const mutate of [p => p.jurisdiction.code = 'NY', p => p.profileVersion = 'changed',
      p => p.source.sourceCorpusSha256 = 'changed',
      p => p.pathways.find(row => row.id === route).automatic = 'changed',
      p => p.packetGenerator.pathways.find(row => row.pathwayId === route).formCandidates.push('new-form'),
      p => p.questions.push({ id: category, type: 'text_or_unknown' })]) {
      const changed = structuredClone(profile); mutate(changed);
      assert.equal(historyContext(changed, route, null), false);
    }
    assert.equal(historyContext(profile, route, { routeKey: `${state}:${route}` }), false);
    for (const sibling of profile.pathways.filter(row => !cases.some(c => c[1] === row.id && (state !== 'MA' || (maAdditionalRoutes.includes(c[1]) === maAdditionalRoutes.includes(route) && maMeRoutes.includes(c[1]) === maMeRoutes.includes(route)))))) {
      assert.equal(historyContext(profile, sibling.id, null), false);
    }
  });
  check(`${route}: exact collection dispositions and explicit overrides`, () => {
    const input = { jurisdiction: state, pathwayId: route, requiredInputIds: [category, 'offense_level'],
      serverFacts: {}, screeningAnswers: answers, savedAnswers: {}, specification: null, questionById: new Map() };
    const resolved = resolvePacketCollection(input);
    assert.deepEqual(resolved.facts.find(f => f.factId === category), {
      factId: category, collection: 'conditional', phase: 'known', group: null, active: false, optional: true,
      source: historySource,
      reason: historyReason
    });
    assert.equal(resolved.derivedFacts[category], undefined);
    assert.notEqual(resolved.facts.find(f=>f.factId==='offense_level')?.source,historySource);
    for (const extra of [
      { recordOwnQuestionIds: new Set([category]) },
      { override: { routeKey: `${state}:${route}`, classes: { [category]: 'render_required' } } },
      { override: { routeKey: `${state}:${route}`, needsHumanClassification: [category] } }
    ]) assert.notEqual(resolvePacketCollection({ ...input, ...extra }).facts.find(f => f.factId === category).source,
      historySource);
  });
}

if(process.argv.includes('--regression-only'))process.exit(redFailures?1:0);

// Run the real HTTP handler with isolated in-memory auth/store boundaries.
// No session, consent, entitlement, network or database fixture is created.
let authenticated = true, verified = true, owner = 'synthetic-al-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: records.get(id).draftSnapshot.jurisdiction, artifactRefs: {} });
globalThis.__alCategoryTransport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: owner }),
  getBriefcaseItem: async (user, id) => user === 'synthetic-al-owner' && records.has(id) ? itemFor(id) : null,
  readProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId }) => {
    assert.equal(consumerAuthUserId, 'synthetic-al-owner');
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  persistProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId, transition }) => {
    assert.equal(consumerAuthUserId, 'synthetic-al-owner');
    assert.equal(transition.expectedPriorRevision, records.get(briefcaseItemId).revision);
    records.set(briefcaseItemId, structuredClone(transition.nextVerification)); saves++;
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  decorateBriefcaseItemForPresentation: async () => ({ commercialActions: {} }),
  protectedPacketVerificationSeedFromTrustedSource: () => { throw Error('No substitute source'); },
  readTrustedBriefcasePresentationSource: () => { throw Error('No substitute source'); }
};
const apiUrl = pathToFileURL(`${process.cwd()}/src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts`).href;
let source = fs.readFileSync(new URL(apiUrl), 'utf8');
for (const [bindings, module] of [
  [['getRcapBriefcaseAuthState'], '@/lib/rcap/briefcase/auth'],
  [['getBriefcaseItem'], '@/lib/expungement-ai/briefcase'],
  [['decorateBriefcaseItemForPresentation', 'protectedPacketVerificationSeedFromTrustedSource', 'readTrustedBriefcasePresentationSource'], '@/lib/expungement-ai/briefcase-presentation-authority'],
  [['persistProtectedPacketVerification', 'readProtectedPacketVerification'], '@/lib/expungement-ai/verification-cas']
]) {
  const pattern = new RegExp('import \\{\\s*' + bindings.join(',\\s*') + '\\s*\\} from "' + module + '";');
  assert(pattern.test(source));
  source = source.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__alCategoryTransport.${name}(...args);`).join('\n'));
}
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),
  { data: { url: apiUrl, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText } });
const API = await import(apiUrl);
const post = (id, answers, extra = {}) => API.POST(new Request(`http://isolated.invalid/api/expungement-ai/briefcase/${id}/packet-information`,
  { method: 'POST', body: JSON.stringify({ expectedRevision: records.get(id).revision, answers, ...extra }) }),
{ params: Promise.resolve({ itemId: id }) });
for (const [id, original] of [...records]) {
  const state=original.draftSnapshot.jurisdiction,result=original.draftSnapshot.resultCode,payment=original.draftSnapshot.paymentAllowed;
  const stored = structuredClone(original);
  stored.draftSnapshot.screeningAnswers[category] = 'Original court category';
  stored.draftSnapshot.prefilledAnswers[category] = { value: 'Earlier unresolved category', unknown: true };
  stored.draftSnapshot.packetAnswers[category] = 'Independent packet category';
  stored.draftHash = P.protectedPacketDraftHash(stored.draftSnapshot);
  records.set(id, stored);
  const otherMatters = [...records].filter(([key]) => key !== id).map(([key, value]) => [key, structuredClone(value)]);
  let response = await post(id, {});
  check(`${id}: HTTP no-op preserves every raw copy`, () => { assert.equal(response.status, 200); assert.deepEqual(records.get(id), stored); });
  response = await post(id, { [category]: { value: 'Participant amendment', unknown: false } });
  const body = await response.json();
  check(`${id}: explicit amendment archives raw history without authority`, () => {
    assert.equal(response.status, 200);
    const next = records.get(id);
    assert.deepEqual(next.draftSnapshot.packetAnswers[category], { value: 'Participant amendment', unknown: false });
    for (const map of maps) {
      assert(Array.isArray(next.draftSnapshot.dependencies.semanticAnswerHistory), "explicit amendment must retain semantic answer history");
      const history = next.draftSnapshot.dependencies.semanticAnswerHistory.find(h =>
        h.factId === category && h.source === map && h.meaning === 'prior_factual_pathway_answer');
      assert(history, `${map} history retained`);
      assert.deepEqual(history.value, stored.draftSnapshot[map][category]);
      assert.equal(history.routeKey, `${state}:${original.draftSnapshot.pathwayId}`);
    }
    assert.deepEqual(safety(next.draftSnapshot), safety(original.draftSnapshot));
    assert.equal(next.draftSnapshot.paymentAllowed, payment);
    assert.equal(next.draftSnapshot.resultCode, result);
    assert.equal(next.status, 'unverified');
    assert.equal(body.readyToGenerate, false);
    assert(!body.missingInputIds.includes(category));
    assert.equal(body.reviewQuestions.find(q => q.id === category).required, false);
    for (const [key, value] of otherMatters) assert.deepEqual(records.get(key), value);
  });
  response = await post(id, { [category]: { unknown: true } });
  check(`${id}: explicit unknown stays unknown`, () => {
    assert.equal(response.status, 200);
    assert.deepEqual(records.get(id).draftSnapshot.packetAnswers[category], { unknown: true });
    assert.deepEqual(safety(records.get(id).draftSnapshot), safety(original.draftSnapshot));
  });
  const incomplete=['New category','Other category'];
  response=await post(id,{[category]:incomplete});
  const incompleteBody=await response.json();
  check(`${id}: incomplete text draft remains literal without new authority`,()=>{
    assert.equal(response.status,200);assert.deepEqual(records.get(id).draftSnapshot.packetAnswers[category],incomplete);
    assert.equal(records.get(id).draftSnapshot.paymentAllowed,payment);assert.equal(incompleteBody.readyToGenerate,false);
  });
  const stable=structuredClone(records.get(id));
  response=await post(id,{[category]:{unexpected:true}});
  check(`${id}: unsupported draft object refused`,()=>{assert.equal(response.status,400);assert.deepEqual(records.get(id),stable);});
  const before = structuredClone(records.get(id)), savesBefore = saves;
  for (const [kind, status, error] of [['stale', 409, 'revision_conflict'], ['anonymous', 401, 'auth_required'],
    ['unverified', 403, 'verified_account_required'], ['other-owner', 404, 'matter_not_found']]) {
    authenticated = kind !== 'anonymous'; verified = kind !== 'unverified';
    owner = kind === 'other-owner' ? 'another-owner' : 'synthetic-al-owner';
    response = await post(id, { [category]: 'Forbidden amendment' }, kind === 'stale' ? { expectedRevision: 0 } : {});
    const denial = await response.json();
    check(`${id}: ${kind} refusal`, () => {
      assert.equal(response.status, status); assert.equal(denial.error, error);
      assert.deepEqual(records.get(id), before); assert.equal(saves, savesBefore);
    });
  }
  authenticated = true; verified = true; owner = 'synthetic-al-owner';
}
delete globalThis.__alCategoryTransport;
console.log(JSON.stringify({ status: 'PASS_AL_CATEGORY_HISTORY', checks, originalIds: cases.map(row => row[0]),
  scope: 'isolated collection/protected transitions/HTTP transport; no hosted owner, database or delivery proof' }));
