import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const mutation=process.argv.find(arg=>arg.startsWith('--mutation='))?.slice(11);
const mutations={
 remainder_4:["\"dc_juvenile_sealing_16_2335\"", "\"unassigned-route\""],
 remainder_3:["\"dc_auto_sealing_16_805\"", "\"unassigned-route\""],
 remainder_2:["\"dc_auto_expungement_16_802\"", "\"unassigned-route\""],
 remainder_1:["\"automatic-sealing-943-0595\"", "\"unassigned-route\""],
 remainder_0:["\"administrative-expunction-mistaken-or-unlawful-arrest\"", "\"unassigned-route\""],
 ma_0:["\"adult-conviction-sealing-under-m-g-l-c-276-100a\"", "\"unassigned-route\""],
 ma_1:["\"automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c\"", "\"unassigned-route\""],
 ma_2:["\"court-requested-sealing-for-dismissal-or-nolle-prosequi-100c\"", "\"unassigned-route\""],
 ma_context:["contactRepresentationHash(profile) === \"f81a71dd750ea489f1c29074b571512bd5cb7c78c5dd924c1f6e7cb7122c0f0d\"", "true"],
 ma_next_0:["\"juvenile-record-sealing-under-100b\"", "\"unassigned-route\""],
 ma_next_1:["\"marijuana-only-expungement\"", "\"unassigned-route\""],
 ma_next_2:["\"non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k\"", "\"unassigned-route\""],
 ma_next_context:["contactRepresentationHash(profile) === \"f81a71dd750ea489f1c29074b571512bd5cb7c78c5dd924c1f6e7cb7122c0f0d\"", "true"],
 mame_0:["\"time-based-expungement-under-100f-100j\"", "\"unassigned-route\""],
 mame_1:["\"adult-conviction-sealing\"", "\"unassigned-route\""],
 mame_2:["\"adult-non-conviction-record-relief\"", "\"unassigned-route\""],
 ma_remaining_context:["contactRepresentationHash(profile) === \"f81a71dd750ea489f1c29074b571512bd5cb7c78c5dd924c1f6e7cb7122c0f0d\"", "true"],
 me_context:["contactRepresentationHash(profile) === \"d49e7b9cb025700b9c352d78e1e9044c41b99bd0695b61eda373215034d78f5a\"", "true"],
 me_remaining_0:["\"juvenile-sealing\"", "\"unassigned-route\""],
 me_remaining_1:["\"pardon-route\"", "\"unassigned-route\""],
 me_remaining_2:["\"sex-trafficking-sexual-exploitation-survivor-sealing\"", "\"unassigned-route\""],
 me_remaining_context:["contactRepresentationHash(profile) === \"d49e7b9cb025700b9c352d78e1e9044c41b99bd0695b61eda373215034d78f5a\"", "true"],

 hi_0:['"dui-under-21-conviction"','"unassigned-route"'],
 hi_1:['"first-time-drug-conviction"','"unassigned-route"'],
 hi_2:['"nonconviction-arrest-expungement"','"unassigned-route"'],
 hi_context:['contactRepresentationHash(profile) === "9b1a121be377fa34e6425d96f7edb82428321b60a757870f8dc4878ebfb27ece"','true'],
 la_0:['"expungement-by-redaction-for-multi-person-records"','"unassigned-route"'],
 la_1:['"non-conviction-arrest-expungement"','"unassigned-route"'],
 la_2:['"automated-expungement-status-verification-art-985-2"','"unassigned-route"'],
 la_context:['contactRepresentationHash(profile) === "a0bf1a76b91c555e5b0cca05b96d6b9a34721db466c7beffdc20fbd86f1e36e6"','true'],
 ky_0:["\"misdemeanor-violation-traffic-conviction\"", "\"unassigned-route\""],
 ky_1:["\"nonconviction-431076\"", "\"unassigned-route\""],
 ky_2:["\"void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276\"", "\"unassigned-route\""],
 ky_3:["\"juvenile-automatic-dismissal\"", "\"unassigned-route\""],
 ky_4:["\"juvenile-petition-610330\"", "\"unassigned-route\""],
 ky_context:["[\"misdemeanor-violation-traffic-conviction\", \"nonconviction-431076\", \"void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276\", \"juvenile-automatic-dismissal\", \"juvenile-petition-610330\"].includes(pathwayId ?? \"\")\n            && contactRepresentationHash(profile) === \"4e84c6d8ba6469a095c50f09cacfb5518c4132d049fbf068513c6eb925e6a364\"", "[\"misdemeanor-violation-traffic-conviction\", \"nonconviction-431076\", \"void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276\", \"juvenile-automatic-dismissal\", \"juvenile-petition-610330\"].includes(pathwayId ?? \"\")"],

 fl_sealing:['"court-ordered-sealing-943-059"','"unassigned-route"'],
 fl_juvenile:['"early-juvenile-expunction-943-0515"','"unassigned-route"'],
 fl_trafficking:['"human-trafficking-victim-expunction-943-0583"','"unassigned-route"'],
 fl_diversion:['"juvenile-diversion-expunction-943-0582"','"unassigned-route"'],
 fl_defense:['"lawful-self-defense-expunction-943-0578"','"unassigned-route"'],
 ga_automatic:['"automatic-restriction-of-qualifying-post-july-1-2013-non-convictions"','"unassigned-route"'],
 ga_context:['pathwayId === "automatic-restriction-of-qualifying-post-july-1-2013-non-convictions"\n            && contactRepresentationHash(profile) === "2c60e17a1f424dc325d41bd3533fbf5e10ed8e65316c1920fb809faea4b07cef"','pathwayId === "automatic-restriction-of-qualifying-post-july-1-2013-non-convictions"'],

 inactive:['"co_petition_record_type_history", "dc_fl_petition_record_type_history",','"co_petition_record_type_history",'],
 unknown_marker:['dcFlPetitionRecordIsHistory(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))','false'],
 context:['["dc_motion_seal_misdemeanor_conviction_5yr_16_806", "dc_motion_seal_nonconviction_16_806", "dc_auto_expungement_16_802", "dc_auto_sealing_16_805", "dc_juvenile_sealing_16_2335"].includes(pathwayId ?? "")\n        && contactRepresentationHash(profile) === "bcc070d365fb97ad2cd7a5296ca4c8ba516dcf37708fb2b5c852c0d5d1566830"','["dc_motion_seal_misdemeanor_conviction_5yr_16_806", "dc_motion_seal_nonconviction_16_806", "dc_auto_expungement_16_802", "dc_auto_sealing_16_805", "dc_juvenile_sealing_16_2335"].includes(pathwayId ?? "")'],
 fl_context:['contactRepresentationHash(profile) === "aca558d3077491f0c09abe838d08b926c0cbe8b194ac1c4500d93520d9a32034"','true'],
 ownership:['dcFlPetitionRecordHistory && !overrideClass && !needsHuman.has(factId)','dcFlPetitionRecordHistory'],
 collection:['if (factId === "record_type" && dcFlPetitionRecordHistory','if (factId === "record_type" && false'],
 loss:['const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds);','const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds); delete shapesPreserved.packetAnswers.record_type;'],
 priority:['const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds);','const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds); if (Array.isArray(shapesPreserved.packetAnswers.record_type)) shapesPreserved.packetAnswers.record_type = "Conviction";'],
 question:['function dcFlPetitionRecordHistoryQuestion(question, history) {','function dcFlPetitionRecordHistoryQuestion(question, history) { return question;']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`import {writeSync} from 'node:fs';let d;export function initialize(x){d=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith(d[2])){if(!r.source.includes(d[0]))throw Error('mutation target absent');writeSync(2,JSON.stringify({appliedMutation:d[3]})+'\\n');return {...r,source:r.source.replace(d[0],d[1])}}return r}`),{data:[...mutations[mutation],['me_remaining_0','me_remaining_1','me_remaining_2','me_remaining_context','mame_0','mame_1','mame_2','ma_remaining_context','me_context','ma_next_0','ma_next_1','ma_next_2','ma_next_context','remainder_0','remainder_1','remainder_2','remainder_3','remainder_4','hi_0','hi_1','hi_2','hi_context','la_0','la_1','la_2','la_context','ky_0','ky_1','ky_2','ky_3','ky_4','ky_context','collection','context','fl_context','ownership','fl_sealing','fl_juvenile','fl_trafficking','fl_diversion','fl_defense','ga_automatic','ga_context','ma_0','ma_1','ma_2','ma_context'].includes(mutation)?'/packet-collection.ts':'/packet-information.ts',mutation]});}
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {createConsumerPaymentPlaceholder}=await import('../src/lib/expungement-ai/payment-adapter.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {dcFlPetitionRecordIsHistory:history,resolvePacketCollection}=await import('../src/lib/expungement-ai/packet-collection.ts');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
// GA-17 Q-8105d5d0b28ebd1e4a67 / Q-c8633872a982712e7803 / Q-94c8f0620f0384854d98.
// GA-17 Q-ab7cc6744570b24e17d4 / Q-481c00319478c8236160 / Q-1ee2fb0eca77febaf2b6.
// GA-17 Q-748f73bc4bcf41923fcc / Q-6acd9d8d275e7be59682 / Q-8c94453e5af32f59406d / QD-fb5a90b4c42ab7e486c1.
// GA-17 Q-4c4d60127b04b08d3f41 / Q-d6c2af7ef42f979932f3 / Q-50a58ca23c5c2ba26a76.
// GA-17 Q-213a19004dbda41dfce2 / Q-e7a0b9cbb9047649e8e0 / Q-6b16d8ce7d8fc029c19e.
// Current held consumer proof; the historical blank builder is not re-certified.
const read=p=>JSON.parse(fs.readFileSync(p));
// GA-17 Q-6add858b65f867a82b70 / Q-502bf587f9925e5e6e79 / Q-00caec14a5a59750b527: exact source-bound Kentucky record history.
// GA17 Q-688bf057ef651e46a54b / Q-6e06a84342a41f34e1d2 / Q-7ed646d227c26f9acc32: exact Maine record history.
// GA17 Q-0c86d50a75c852085df7 / Q-f66a6b6b457285d85751 / Q-8a323b249717d2c2b890: exact MA and ME literal record history.
// GA-17 Q-fb2109e5a0379589fe4c / Q-9026faa3fca7a143a0df / Q-bf040ed86c19172840d6: literal history on exact Massachusetts consumers.
// GA-17 Q-f998590180601fe00713 / Q-30353f219d82ca7eeb62: existing juvenile collection, not relief authority.
// GA-17 Q-46a17f0eb164e9cdcf27 / Q-47d5c5f19e70f0fbcbec / Q-73e3915ed9d087f8b531 / Q-6fce98651a27d2a3b8c6 / Q-65a2e556a51d224b2917: literal record history on existing guidance surfaces.
// GA-17 Q-50dcf8b1a91162a70705 / Q-5ec575d17ded0b87051d / Q-79e780778f4a487dd39b: literal history on exact Massachusetts consumers.
// HI DUI reason-only successor is declared in test-hi-dui-rule-citation.mjs; predecessor hashes below remain fixed.
const cases=[
 {"state": "KY", "route": "juvenile-automatic-dismissal", "result": "guidance_only", "payment": false, "reason": "ky.guidance_only_no_user_filed_court_petition"},
 {"state": "KY", "route": "juvenile-petition-610330", "result": "guidance_only", "payment": false, "reason": "ky.guidance_only_no_user_filed_court_petition"},
 {"state": "FL", "route": "administrative-expunction-mistaken-or-unlawful-arrest", "result": "guidance_only", "payment": false, "reason": "fl.administrative_conditional_information"},
 {"state": "FL", "route": "automatic-sealing-943-0595", "result": "guidance_only", "payment": false, "reason": "fl.automatic_conditional_information"},
 {"state": "DC", "route": "dc_auto_expungement_16_802", "result": "guidance_only", "payment": false, "reason": "dc.expungement_general_information"},
 {"state": "DC", "route": "dc_auto_sealing_16_805", "result": "guidance_only", "payment": false, "reason": "dc.sealing_general_information"},
 {"state": "DC", "route": "dc_juvenile_sealing_16_2335", "result": "guidance_only", "payment": false, "reason": "dc.juvenile_general_information"},
 {"state": "MA", "route": "adult-conviction-sealing-under-m-g-l-c-276-100a", "result": "not_covered_yet", "payment": false, "reason": "ma.intentional_unsupported_route"},
 {"state": "MA", "route": "automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c", "result": "guidance_only", "payment": false, "reason": "ma.guidance_only_no_user_filed_court_petition"},
 {"state": "MA", "route": "court-requested-sealing-for-dismissal-or-nolle-prosequi-100c", "result": "guidance_only", "payment": false, "reason": "ma.lawrence_hold_guidance_only"},
 {"state": "MA", "route": "juvenile-record-sealing-under-100b", "result": "not_covered_yet", "payment": false, "reason": "ma.intentional_unsupported_route"},
 {"state": "MA", "route": "marijuana-only-expungement", "result": "guidance_only", "payment": false, "reason": "ma.lawrence_hold_guidance_only"},
 {"state": "MA", "route": "non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k", "result": "guidance_only", "payment": false, "reason": "ma.lawrence_hold_guidance_only"},
 {"state": "MA", "route": "time-based-expungement-under-100f-100j", "result": "not_covered_yet", "payment": false, "reason": "ma.intentional_unsupported_route"},
 {"state": "ME", "route": "adult-conviction-sealing", "result": "needs_more_info", "payment": false, "reason": "me.route_identified_packet_not_yet_available"},
 {"state": "ME", "route": "adult-non-conviction-record-relief", "result": "guidance_only", "payment": false, "reason": "me.lawrence_hold_guidance_only"},
 {"state": "ME", "route": "juvenile-sealing", "result": "guidance_only", "payment": false, "reason": "me.lawrence_hold_guidance_only"},
 {"state": "ME", "route": "pardon-route", "result": "guidance_only", "payment": false, "reason": "me.lawrence_hold_guidance_only"},
 {"state": "ME", "route": "sex-trafficking-sexual-exploitation-survivor-sealing", "result": "not_covered_yet", "payment": false, "reason": "me.intentional_unsupported_route"},

 {"state": "HI", "route": "dui-under-21-conviction", "result": "packet_ready_with_caution", "payment": true, "predecessorReason": "hi.compiled_rule_match.rule-01-a-written-hcjdc-application-may-cover-qualifying-arrest", "reason": "hi.dui_pathway_context"},
 {"state": "HI", "route": "first-time-drug-conviction", "result": "packet_ready_with_caution", "payment": true, "reason": "hi.compiled_rule_match.route-first-time-drug-conviction"},
 {"state": "HI", "route": "nonconviction-arrest-expungement", "result": "packet_ready_with_caution", "payment": true, "reason": "hi.compiled_rule_match.rule-04-a-complete-application-valid-government-photo-id-paymen"},
 {"state": "LA", "route": "expungement-by-redaction-for-multi-person-records", "result": "guidance_only", "payment": false, "reason": "la.lawrence_hold_guidance_only"},
 {"state": "LA", "route": "non-conviction-arrest-expungement", "result": "packet_ready_with_caution", "payment": true, "reason": "la.compiled_rule_match.rule-09-if-article-894-b-was-not-already-completed-but-appears-"},
 {"state": "LA", "route": "automated-expungement-status-verification-art-985-2", "result": "guidance_only", "payment": false, "reason": "la.guidance_only_no_user_filed_court_petition"},
 {"state": "KY", "route": "misdemeanor-violation-traffic-conviction", "result": "not_covered_yet", "payment": false, "reason": "ky.intentional_unsupported_route"},
 {"state": "KY", "route": "nonconviction-431076", "result": "needs_review", "payment": false, "reason": "ky.waiting_rule_not_executed"},
 {"state": "KY", "route": "void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276", "result": "needs_review", "payment": false, "reason": "ky.waiting_rule_not_executed"},

 {state:'DC',route:'dc_motion_seal_misdemeanor_conviction_5yr_16_806',result:'not_covered_yet',payment:false,reason:'dc.intentional_unsupported_route'},
 {state:'DC',route:'dc_motion_seal_nonconviction_16_806',result:'not_covered_yet',payment:false,reason:'dc.intentional_unsupported_route'},
 {state:'FL',route:'court-ordered-expunction-943-0585',result:'needs_review',payment:false,reason:'fl.waiting_rule_not_executed'},
 {"state":"FL","route":"court-ordered-sealing-943-059","result":"guidance_only","payment":false,"reason":"fl.guidance_only_no_user_filed_court_petition"},
 {"state":"FL","route":"early-juvenile-expunction-943-0515","result":"not_covered_yet","payment":false,"reason":"fl.intentional_unsupported_route"},
 {"state":"FL","route":"human-trafficking-victim-expunction-943-0583","result":"needs_review","payment":false,"reason":"fl.waiting_rule_not_executed"},
 {"state": "FL", "route": "juvenile-diversion-expunction-943-0582", "result": "guidance_only", "payment": false, "reason": "fl.juvenileDiversion_conditional_information"},
 {"state": "FL", "route": "lawful-self-defense-expunction-943-0578", "result": "guidance_only", "payment": false, "reason": "fl.selfDefense_conditional_information"},
 {"state": "GA", "route": "automatic-restriction-of-qualifying-post-july-1-2013-non-convictions", "result": "guidance_only", "payment": false, "reason": "ga.guidance_only_no_user_filed_court_petition"}
];
const predecessorHashes={"juvenile-automatic-dismissal":"a1777d9642aedbbfea82e888401dbb6af801d0085be5b18b4e3ed4c25294d2f6","juvenile-petition-610330":"775a82c178c9830391d9881fdecfe2bacb7d1a6771fcd7aa8aba530491a41ada","administrative-expunction-mistaken-or-unlawful-arrest":"85c16d422982e2f39a1d42eebf6468df07f589e491fd6e5edeef4d33bbfc0ba5","automatic-sealing-943-0595":"e47e4b18d6cdfa52b01df022079b44a832b068c673358df6b54c2093a06f94be","dc_auto_expungement_16_802":"c4fbe13478d80bd3613bba94658e5ad4798939a90f57dfe651a9aaddcc5af0cf","dc_auto_sealing_16_805":"983874a4c5eb49ffb982f151535fe748a0679d1fe9bc4a956a52a6a623f3cb18","dc_juvenile_sealing_16_2335":"c7feee63999ce9de5b928253b31347adccd5831307f0738313171147f548d18d","adult-conviction-sealing-under-m-g-l-c-276-100a":"702f775cdd74ce6a872b98a50381274b14a7c257707c54b2d1dc792531a87d7b","automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c":"ef24253671c6afdb2a8d1848088adf80401bbd20fff6689d57e29367f420b022","court-requested-sealing-for-dismissal-or-nolle-prosequi-100c":"c8c661a9849b978e86d3416bd9e760a43ae01d16ec6f49377e7c66589e46bd2d","dui-under-21-conviction":"aabcc56534a4f8ab7430985ae5783ffd123c283d82d535ece206a83c65e77eaa","first-time-drug-conviction":"4377a4d8e6311a46e63b1f8cbae954b478d001a6e36ea3058d366a3eed958aff","nonconviction-arrest-expungement":"1b9ad6627cb5b76894c7054474647dac7d77d5e38f6c075c7ea3012d6ee3e812","expungement-by-redaction-for-multi-person-records":"fac5462a969717f29f8487e5e121f0dd5cee11ae88b4a7eccad7ff1686123397","non-conviction-arrest-expungement":"022c3d72f61a6fabde08904670972cba90b57fab4f8e33c366902ca5cbcf2929","automated-expungement-status-verification-art-985-2":"49a76568f19070cfd1856e9306cc935d05439b0359a239a6fb2e648158ce310e","misdemeanor-violation-traffic-conviction":"c0899ab93902c859a3cf1c6af06a10d646587e746bcabe46179d1bb1e31d383c","nonconviction-431076":"531875c911e7dc0288319c9d9fe9c6329f37fed9ec3c58790818e17d8e717a7c","void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276":"172efe74ee336e832e100d74ee05d6b1090165a80bd9cf58879f06d0167b82d4","dc_motion_seal_misdemeanor_conviction_5yr_16_806":"2151f25f31aa842d96d4cf4eae4e51c4c06f723a4b990f9e8922dd8c9f6d3fbd","dc_motion_seal_nonconviction_16_806":"da1a999021ebf099a165e1d30f62c25c58bcb0c4e5ca709f0ccf57f39d8089fb","court-ordered-expunction-943-0585":"89d9f01b4f3283b3760e4a21fca075bc948a96d2c5d973aa78f023c4dee107c1","court-ordered-sealing-943-059":"b91cd98fe3b9f673023369ff6f28eee0e5b61282a527b0aa97b96605b90d9df1","early-juvenile-expunction-943-0515":"f073d4e9daabbfb2953196c4a069094062f9f3ced9ad764c8a2926ec916210b1","human-trafficking-victim-expunction-943-0583":"e6502befee04de2d1258dc7bffcfa40081f3f49c49be74ed7c792b04275378de","juvenile-diversion-expunction-943-0582":"0835b875bbe4d563029141334795658e1784baacd5c72c9b90b2b03647a7cd76","lawful-self-defense-expunction-943-0578":"2167351db9f9e46b127b24b0120f8aea47f568417dd07bd703679ccccfeef1e5","automatic-restriction-of-qualifying-post-july-1-2013-non-convictions":"e84c65022897f61a29de80a8dd9615737b38e3d9245a17879c1f301bfd52f21c","juvenile-record-sealing-under-100b":"930d73d4d9ea9631bc81b588221238a283f5201bf5c364064c9d32090b6694fc","marijuana-only-expungement":"4a81466693c8c731eaf19f3d1d404c6333fc5b19d4c113d91bc55fcb892efd11","non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k":"633ca0e3e30f53dbf8e353d107bb12a36fcc8b670b46c87200564f076c704f8a","time-based-expungement-under-100f-100j":"da5b638ccad091e578656137cc0ee971409c2487693d37d032d703674ca91f48","adult-conviction-sealing":"ac3197e46eee43cce229c8ee1cf0f1ac7072483da70f528659057784dd8d1d39","adult-non-conviction-record-relief":"db0a3318ab6fb771b6cfe4e0fa5c65459cf979a08e17250755cae8bc88017ec8","juvenile-sealing":"c86b39a5481408b1d7b3e2ee2e0529ff6af25dc0f732df5bcdfb1c1ba42dd6ae","pardon-route":"d807fe75313a489ef39254fe46eb1c9b4419406da1d29980893dbad9b9845e25","sex-trafficking-sexual-exploitation-survivor-sealing":"4213572de02bc74ddf8c0ab738b53d3f3480cc8d92075c5d801cbec62ecb6bd6"};
const witnesses=read('data/rcap-ledger/public-witness-fixtures.json').fixtures;
// Synthetic juvenile contexts reuse the held KY witness facts and exact route labels; they grant no relief.
witnesses.push(...[{"pathwayKey": "KY:juvenile-automatic-dismissal", "jurisdiction": "KY", "pathwayId": "juvenile-automatic-dismissal", "profileVersion": "2026-06-19-source-conversion-1", "publicRoute": "/expungement-ai/screening/kentucky", "evaluationEndpoint": "POST /api/expungement-ai/screening", "answers": {"age_at_offense": "17", "case_outcome": "Juvenile adjudication or offense committed as a minor", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Juvenile automatic expungement on qualifying dismissal", "record_documents": "Yes", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}, "rounds": [{"round": 0, "droppedAsNotEvaluatorQuestions": ["court_requirements_completed", "state_exclusion_categories", "trafficking_status"]}, {"round": 1, "requested": ["age_at_offense"], "supplied": {"age_at_offense": "30"}}], "expected": {"pathwayId": "felony-conviction-431073", "resultCode": "guidance_only", "paymentAllowed": false}}, {"pathwayKey": "KY:juvenile-petition-610330", "jurisdiction": "KY", "pathwayId": "juvenile-petition-610330", "profileVersion": "2026-06-19-source-conversion-1", "publicRoute": "/expungement-ai/screening/kentucky", "evaluationEndpoint": "POST /api/expungement-ai/screening", "answers": {"age_at_offense": "17", "case_outcome": "Juvenile adjudication or offense committed as a minor", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Juvenile petition to vacate and expunge under KRS 610.330", "record_documents": "Yes", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}, "rounds": [{"round": 0, "droppedAsNotEvaluatorQuestions": ["court_requirements_completed", "state_exclusion_categories", "trafficking_status"]}, {"round": 1, "requested": ["age_at_offense"], "supplied": {"age_at_offense": "30"}}], "expected": {"pathwayId": "felony-conviction-431073", "resultCode": "guidance_only", "paymentAllowed": false}}]);
// Synthetic contexts reuse the retained state witness and exact route label; no endorsement or relief is inferred.
witnesses.push(...[{"pathwayKey": "FL:administrative-expunction-mistaken-or-unlawful-arrest", "jurisdiction": "FL", "pathwayId": "administrative-expunction-mistaken-or-unlawful-arrest", "profileVersion": "2026-06-19-source-conversion-1", "publicRoute": "/expungement-ai/screening/florida", "evaluationEndpoint": "POST /api/expungement-ai/screening", "answers": {"age_at_offense": "30", "case_outcome": "Arrest or citation with no charge filed", "court_requirements_completed": "yes", "financial_obligations": "Yes", "identity_error": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Administrative expunction - mistaken or unlawful arrest", "prior_relief": "Yes", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "state_exclusion_categories": ["None of these"], "trafficking_status": "No"}, "rounds": [{"round": 0, "droppedAsNotEvaluatorQuestions": ["pardon_status"]}, {"round": 1, "requested": ["age_at_offense", "identity_error", "prior_relief", "resolved_timing_bucket"], "supplied": {"age_at_offense": "30", "identity_error": "Yes", "prior_relief": "Yes", "resolved_timing_bucket": "gt_10_years"}}], "expected": {"pathwayId": "court-ordered-expunction-943-0585", "resultCode": "needs_review", "paymentAllowed": false}}, {"pathwayKey": "FL:automatic-sealing-943-0595", "jurisdiction": "FL", "pathwayId": "automatic-sealing-943-0595", "profileVersion": "2026-06-19-source-conversion-1", "publicRoute": "/expungement-ai/screening/florida", "evaluationEndpoint": "POST /api/expungement-ai/screening", "answers": {"age_at_offense": "30", "case_outcome": "Arrest or citation with no charge filed", "court_requirements_completed": "yes", "financial_obligations": "Yes", "identity_error": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Automatic sealing - 943.0595", "prior_relief": "Yes", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "state_exclusion_categories": ["None of these"], "trafficking_status": "No"}, "rounds": [{"round": 0, "droppedAsNotEvaluatorQuestions": ["pardon_status"]}, {"round": 1, "requested": ["age_at_offense", "identity_error", "prior_relief", "resolved_timing_bucket"], "supplied": {"age_at_offense": "30", "identity_error": "Yes", "prior_relief": "Yes", "resolved_timing_bucket": "gt_10_years"}}], "expected": {"pathwayId": "court-ordered-expunction-943-0585", "resultCode": "needs_review", "paymentAllowed": false}}, {"pathwayKey": "DC:dc_auto_expungement_16_802", "jurisdiction": "DC", "pathwayId": "dc_auto_expungement_16_802", "profileVersion": "2026-06-19-source-conversion-1", "publicRoute": "/expungement-ai/screening/district-of-columbia", "evaluationEndpoint": "POST /api/expungement-ai/screening", "answers": {"actual_innocence_basis": "The offense did not occur", "age_at_offense": "30", "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted", "court_requirements_completed": "yes", "dc_offense_severity_group": "Not in Offense Severity Group 1, 2, or 3", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Automatic expungement under D.C. Code \u00a7 16-802", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}, "rounds": [{"round": 0, "droppedAsNotEvaluatorQuestions": ["pardon_status", "state_exclusion_categories", "trafficking_status"]}, {"round": 1, "requested": ["age_at_offense", "resolved_timing_bucket"], "supplied": {"age_at_offense": "30", "resolved_timing_bucket": "gt_10_years"}}], "expected": {"pathwayId": "dc_actual_innocence_expungement_16_803", "resultCode": "needs_review", "paymentAllowed": false}}, {"pathwayKey": "DC:dc_auto_sealing_16_805", "jurisdiction": "DC", "pathwayId": "dc_auto_sealing_16_805", "profileVersion": "2026-06-19-source-conversion-1", "publicRoute": "/expungement-ai/screening/district-of-columbia", "evaluationEndpoint": "POST /api/expungement-ai/screening", "answers": {"actual_innocence_basis": "The offense did not occur", "age_at_offense": "30", "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted", "court_requirements_completed": "yes", "dc_offense_severity_group": "Not in Offense Severity Group 1, 2, or 3", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Automatic sealing under D.C. Code \u00a7 16-805", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}, "rounds": [{"round": 0, "droppedAsNotEvaluatorQuestions": ["pardon_status", "state_exclusion_categories", "trafficking_status"]}, {"round": 1, "requested": ["age_at_offense", "resolved_timing_bucket"], "supplied": {"age_at_offense": "30", "resolved_timing_bucket": "gt_10_years"}}], "expected": {"pathwayId": "dc_actual_innocence_expungement_16_803", "resultCode": "needs_review", "paymentAllowed": false}}, {"pathwayKey": "DC:dc_juvenile_sealing_16_2335", "jurisdiction": "DC", "pathwayId": "dc_juvenile_sealing_16_2335", "profileVersion": "2026-06-19-source-conversion-1", "publicRoute": "/expungement-ai/screening/district-of-columbia", "evaluationEndpoint": "POST /api/expungement-ai/screening", "answers": {"actual_innocence_basis": "The offense did not occur", "age_at_offense": "17", "case_outcome": "Juvenile adjudication or offense committed as a minor", "court_requirements_completed": "yes", "dc_offense_severity_group": "Not in Offense Severity Group 1, 2, or 3", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Juvenile sealing under D.C. Code \u00a7 16-2335", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}, "rounds": [{"round": 0, "droppedAsNotEvaluatorQuestions": ["pardon_status", "state_exclusion_categories", "trafficking_status"]}, {"round": 1, "requested": ["age_at_offense", "resolved_timing_bucket"], "supplied": {"age_at_offense": "30", "resolved_timing_bucket": "gt_10_years"}}], "expected": {"pathwayId": "dc_actual_innocence_expungement_16_803", "resultCode": "needs_review", "paymentAllowed": false}}]);
// The automatic MA guidance context reuses retained MA witness facts and the exact route label; no relief is inferred.
witnesses.push(...[{"pathwayKey": "MA:automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c", "jurisdiction": "MA", "pathwayId": "automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c", "profileVersion": "2026-06-19-source-conversion-1", "publicRoute": "/expungement-ai/screening/massachusetts", "evaluationEndpoint": "POST /api/expungement-ai/screening", "answers": {"age_at_offense": "30", "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted", "financial_obligations": "Yes", "identity_error": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Automatic non-conviction sealing for not-guilty, no-bill, or no-probable-cause outcomes (\u00a7 100C)", "record_documents": "Yes", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}, "rounds": [{"round": 0, "droppedAsNotEvaluatorQuestions": ["court_requirements_completed", "pardon_status", "state_exclusion_categories", "trafficking_status"]}, {"round": 1, "requested": ["age_at_offense", "identity_error"], "supplied": {"age_at_offense": "30", "identity_error": "Yes"}}], "expected": {"pathwayId": "adult-conviction-sealing-under-m-g-l-c-276-100a", "resultCode": "not_covered_yet", "paymentAllowed": false}}]);
// Reuse Maine public screening facts with the exact non-conviction route label; no relief is inferred.
witnesses.push(...[{"pathwayKey": "ME:adult-non-conviction-record-relief", "jurisdiction": "ME", "pathwayId": "adult-non-conviction-record-relief", "profileVersion": "2026-06-19-source-conversion-1", "publicRoute": "/expungement-ai/screening/maine", "evaluationEndpoint": "POST /api/expungement-ai/screening", "answers": {"age_at_offense": "30", "case_outcome": "Arrest or citation with no charge filed", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Felony", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Adult non-conviction record relief", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "trafficking_status": "No"}, "rounds": [{"round": 0, "droppedAsNotEvaluatorQuestions": ["state_exclusion_categories"]}, {"round": 1, "requested": ["age_at_offense", "resolved_timing_bucket"], "supplied": {"age_at_offense": "30", "resolved_timing_bucket": "gt_10_years"}}], "expected": {"pathwayId": "adult-conviction-sealing", "resultCode": "needs_more_info", "paymentAllowed": false}}]);
// Synthetic inputs reuse FL conditional-information cases and GA public screening facts.
// They do not establish diversion, certification, restriction, or fulfillment authority.
witnesses.push(...[
  {
    "pathwayKey": "FL:juvenile-diversion-expunction-943-0582",
    "profileVersion": "2026-06-19-source-conversion-1",
    "answers": {
      "age_at_offense": 17,
      "case_outcome": "Juvenile adjudication or offense committed as a minor",
      "court_requirements_completed": "yes",
      "financial_obligations": "Yes",
      "identity_error": "Yes",
      "jurisdiction_scope": "State or local",
      "new_convictions_during_waiting_period": "No",
      "offense_level": "Misdemeanor",
      "ownership_scope": "Yes",
      "pending_cases": "No",
      "possible_pathway_context": "Juvenile diversion expunction - 943.0582",
      "prior_relief": "Yes",
      "record_documents": "Yes",
      "resolved_timing_bucket": "gt_10_years",
      "sentence_completion_date": "Yes",
      "special_preconditions_confirmed": "Yes",
      "state_exclusion_categories": [
        "None of these"
      ],
      "trafficking_status": "No"
    }
  },
  {
    "pathwayKey": "FL:lawful-self-defense-expunction-943-0578",
    "profileVersion": "2026-06-19-source-conversion-1",
    "answers": {
      "age_at_offense": 30,
      "case_outcome": "Arrest or citation with no charge filed",
      "court_requirements_completed": "yes",
      "financial_obligations": "Yes",
      "identity_error": "Yes",
      "jurisdiction_scope": "State or local",
      "new_convictions_during_waiting_period": "No",
      "offense_level": "Misdemeanor",
      "ownership_scope": "Yes",
      "pending_cases": "No",
      "possible_pathway_context": "Lawful self-defense expunction - 943.0578",
      "prior_relief": "Yes",
      "record_documents": "Yes",
      "resolved_timing_bucket": "gt_10_years",
      "sentence_completion_date": "Yes",
      "special_preconditions_confirmed": "Yes",
      "state_exclusion_categories": [
        "None of these"
      ],
      "trafficking_status": "No"
    }
  },
  {
    "pathwayKey": "GA:automatic-restriction-of-qualifying-post-july-1-2013-non-convictions",
    "profileVersion": "2026-06-19-source-conversion-1",
    "answers": {
      "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted",
      "court_requirements_completed": "yes",
      "financial_obligations": "Yes",
      "jurisdiction_scope": "State or local",
      "new_convictions_during_waiting_period": "No",
      "offense_level": "Misdemeanor",
      "ownership_scope": "Yes",
      "pardon_status": "No",
      "pending_cases": "No",
      "possible_pathway_context": "Automatic restriction of qualifying post-July 1, 2013 non-convictions",
      "prior_relief": "Yes",
      "record_documents": "Yes",
      "resolved_timing_bucket": "gt_10_years",
      "sentence_completion_date": "Yes",
      "special_preconditions_confirmed": "Yes",
      "state_exclusion_categories": [
        "None of these"
      ]
    }
  }
]);
// Reuse the adopted HCJDC positive inputs: conviction plus an existing court order.
// Synthetic answers grant no order, identity, entitlement or fulfillment authority.
for(const witness of witnesses.filter(w=>w.pathwayKey.startsWith('HI:'))){
 if(witness.pathwayId==='dui-under-21-conviction')Object.assign(witness.answers,{case_outcome:'Misdemeanor conviction',age_at_offense:20,hi_court_order_confirmed:'Yes'});
 if(witness.pathwayId==='first-time-drug-conviction')Object.assign(witness.answers,{case_outcome:'Misdemeanor conviction',hi_court_order_confirmed:'Yes'});
}
// Reuse the retained LA status-guidance witness; no automation or funding is inferred.
const laStatus=read('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json').additionalSubgroups.find(s=>s.id==='LA-9852-status-financial-witness-20261014');
assert(laStatus);
witnesses.push({pathwayKey:'LA:automated-expungement-status-verification-art-985-2',profileVersion:'2026-06-19-source-conversion-1',answers:structuredClone(laStatus.freshBaselineReproduction.answers)});
// Run this same behavioural assertion on the predecessor before implementing the correction.
if(process.argv.includes('--regression-only')){
 let failures=0;
 for(const {state,route}of cases){
  const witness=witnesses.find(f=>f.pathwayKey===`${state}:${route}`);assert(witness);
  const authoritative=evaluate({jurisdiction:state,profileVersion:witness.profileVersion,matterId:'synthetic-red-'+route,answers:witness.answers});
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:witness.answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
  const model=P.protectedPacketInformationModelFor({status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot});assert(model);
  try{assert(!model.missingInputIds.includes('record_type'));assert(!model.builderQuestions.some(q=>q.id==='record_type'));console.log(JSON.stringify({route,status:'PASS'}));}
  catch(error){failures++;console.error(JSON.stringify({route,failedCheck:'blank generic record labels must not be required',missing:model.missingInputIds.includes('record_type'),error:error.message}));}
 }
 process.exit(failures?1:0);
}
const maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
const rawCases=['Arrest or charge','Court case','Conviction','Juvenile matter','I am not sure',
 ['Arrest or charge','Court case','Conviction'],['Juvenile matter','Conviction'],
 {unknown:true,value:'Court case'},null];
const records=new Map();let checks=0, httpCases=0;
const check=(name,fn)=>{try{fn();checks++;}catch(error){console.error(JSON.stringify({failedCheck:name,checks}));error.message=name+': '+error.message;throw error;}};
// Q-4897a00f86c67fc5c57a: current deferred felony result has no packet plan or record_type consumer.
check('KY felony: no collection consumer; saved overlapping labels remain literal',()=>{
 const w=witnesses.find(w=>w.pathwayKey==='KY:felony-conviction-431073');assert(w);
 for(const delta of [{},{case_outcome:'Felony conviction'},{case_outcome:'I am not sure'},{ownership_scope:'No'}]){
  const answers={...w.answers,...delta};
  const a=evaluate({jurisdiction:'KY',profileVersion:w.profileVersion,matterId:'synthetic-ky-felony-disposition',answers});
  assert.equal(a.evaluation.resultCode,delta.ownership_scope?'hard_stop':'guidance_only');
  assert.equal(a.evaluation.paymentAllowed,false);assert.equal(a.evaluation.packetPlan,undefined);
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
  for(const map of maps)for(const raw of rawCases){
   const snapshot=structuredClone(seed.snapshot);snapshot[map].record_type=structuredClone(raw);
   const record={status:'unverified',revision:0,draftSnapshot:snapshot,draftHash:P.protectedPacketDraftHash(snapshot)};
   const before=structuredClone(record),m=P.protectedPacketInformationModelFor(record);assert(m);
   assert(!m.questions.some(q=>q.id==='record_type'));assert(!m.missingInputIds.includes('record_type'));
   assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);
   assert.deepEqual(record,before);
  }
 }
 assert.equal(packetFulfillmentAuthority('KY','felony-conviction-431073','checkout creation').allowed,false);
});
const safety=s=>Object.fromEntries(['pathwayId','resultCode','paymentAllowed','selectedTrackId','packetPlan','requiredInputIds'].map(k=>[k,s[k]]));
for(const context of cases){
const {state,route,result,payment,reason}=context,key=`${state}:${route}`;
const witness=witnesses.find(f=>f.pathwayKey===key);assert(witness);
check(key+': exact source purpose and unchanged authority',()=>{
 assert.equal(packetSpecificationFor(key),undefined);
 const profile=getProfileByJurisdiction(state);assert(history(profile,route,undefined));
 assert(!profile.questions.some(q=>q.id==='record_type'));
 for(const change of [p=>p.source.sourceCorpusSha256='wrong',p=>p.questions.push({id:'record_type'})]){const p=structuredClone(profile);change(p);assert(!history(p,route,undefined));}
 for(const other of profile.pathways.filter(p=>!cases.some(c=>c.state===state&&c.route===p.id)))assert(!history(profile,other.id,undefined));assert(!history(profile,route,{routeKey:key}));
 const input={jurisdiction:state,pathwayId:route,requiredInputIds:['record_type'],serverFacts:{},screeningAnswers:{},savedAnswers:{},specification:null,questionById:new Map()};
 const fact=resolvePacketCollection(input).facts[0];assert.equal(fact.source,'dc_fl_petition_record_type_history');assert.equal(fact.active,false);assert.equal(fact.optional,true);
 assert.notEqual(resolvePacketCollection({...input,recordOwnQuestionIds:new Set(['record_type'])}).facts[0].source,fact.source);
 for(const override of [{classes:{record_type:'unresolved'}},{needsHumanClassification:['record_type']}]){
  const protectedFact=resolvePacketCollection({...input,override:{routeKey:key,note:'synthetic explicit ownership',...override}}).facts[0];
  assert.notEqual(protectedFact.source,fact.source);assert.equal(protectedFact.collection,'unresolved');
 }
 for(const factId of state==='ME'?["case_outcome", "offense_level", "court", "financial_obligations", "age_at_offense", "discharge_date", "pending_cases"]:state==='KY'?['case_outcome','offense_level','age_at_offense','release_date','pending_cases']:state==='MA'?['case_outcome','offense_level','court','sentence_completion_date','age_at_offense','financial_obligations']:state==='HI'?['case_outcome','offense_level','age_at_offense','court','hi_court_order_confirmed']:state==='LA'?['case_outcome','offense_level','court','criminal_history','financial_obligations']:[])
  assert.notEqual(resolvePacketCollection({...input,requiredInputIds:[factId]}).facts[0].source,fact.source);
 for(const other of profile.pathways.filter(p=>!cases.some(c=>c.state===state&&c.route===p.id)))assert.notEqual(resolvePacketCollection({...input,pathwayId:other.id}).facts[0].source,fact.source);
 const authority=packetFulfillmentAuthority(state,route,'checkout creation');
 assert.equal(authority.allowed,false);
 assert.equal(authority.reason,`${key}: NO_RECORD. No Grade-A fulfillment record binds ${key}; a route nobody has written a record for fails closed.`);
});
for(const [label,delta,expectedResult,expectedReason]of [
 ['refused ownership',{ownership_scope:'No'},'hard_stop',state.toLowerCase()+'.ownership_scope_hard_stop'],
 ['uncertain disposition',{case_outcome:'I am not sure'},'needs_review',state.toLowerCase()+'.source_fact_unknown'],
 ...(state==='LA'?[['federal refusal',{jurisdiction_scope:'Federal'},'hard_stop','la.federal_or_out_of_scope']]:state!=='HI'?[]:route==='nonconviction-arrest-expungement'?
  [['conviction excluded',{case_outcome:'Felony conviction'},'likely_not_eligible','hi.hi_831_3_2_nonconviction_required_not_eligible']]:[
   ['no court order',{hi_court_order_confirmed:'No'},'likely_not_eligible','hi.hi_court_order_not_confirmed_not_eligible'],
   ['uncertain court order',{hi_court_order_confirmed:'I am not sure'},'needs_review','hi.source_fact_unknown'],
   ['missing court order',{hi_court_order_confirmed:undefined},'needs_review','hi.hi_court_order_confirmation_missing']])
])check(key+': '+label+' keeps its actual predecessor outcome and raw history',()=>{
 const answers={...witness.answers,...delta};
 const a=evaluate({jurisdiction:state,profileVersion:witness.profileVersion,matterId:'synthetic-boundary-'+route,answers});
 assert.equal(a.evaluation.resultCode,expectedResult);assert.equal(a.evaluation.paymentAllowed,false);assert.equal(a.evaluation.reasons[0].code,expectedReason);
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
 for(const raw of rawCases){
  const snapshot=structuredClone(seed.snapshot);snapshot.packetAnswers.record_type=structuredClone(raw);
  const r=P.evaluateProtectedPacketFacts(snapshot).evaluation;
  assert.equal(r.resultCode,expectedResult);assert.equal(r.paymentAllowed,false);assert.equal(r.reasons[0].code,expectedReason);
  const record={status:'unverified',revision:0,draftSnapshot:snapshot,draftHash:P.protectedPacketDraftHash(snapshot)};
  assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,record);
 }
});
for(const [label,outcome] of [['original-witness',witness.answers.case_outcome],['separate-matter-same-route',witness.answers.case_outcome]]){
 const answers={...witness.answers,case_outcome:outcome};
 const a=evaluate({jurisdiction:state,profileVersion:witness.profileVersion,matterId:'synthetic-'+route+'-'+label,answers});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
 assert.equal(seed.hash,predecessorHashes[route],"actual captured predecessor draft hash unchanged");
 const original={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
 records.set('synthetic-'+route+'-'+label,original);
 check(key+'/'+label+': public packet surface retains optional overlapping history',()=>{
  for(const raw of [undefined,['Arrest or charge','Court case','Conviction'],{unknown:true,value:'Court case'}]){
   const item={state,paymentAllowed:payment,resultCode:result,artifactRefs:{commercialFlow:{
    screening:{pathwayId:route,packetPlan:seed.snapshot.packetPlan,answers},
    packetInformation:{answers:raw===undefined?{}:{record_type:raw},prefilledAnswers:{}}
   }}};
   const before=structuredClone(item);const m=P.packetInformationModelFor(item);assert(m);
   assert(!m.missingInputIds.includes('record_type'));
   if(raw===undefined)assert(!m.builderQuestions.some(q=>q.id==='record_type'));
   else{const q=m.questions.find(q=>q.id==='record_type');assert(q);assert.equal(q.required,false);assert(q.helperText.includes('overlap'));}
   assert.deepEqual(item,before);
  }
 });
 check(label+': actual route state, fulfillment refusal and blank-history suppression',()=>{
  assert.equal(a.evaluation.pathwayId,route);assert.equal(a.evaluation.resultCode,result);assert.equal(a.evaluation.paymentAllowed,payment);const price=createConsumerPaymentPlaceholder({...seed.snapshot,state},route);assert.equal(price.enabled,false);assert.equal(price.amountCents,undefined);
  assert.equal(a.evaluation.reasons[0].code,reason);
  const m=P.protectedPacketInformationModelFor(original);assert(m);
  assert(!m.builderQuestions.some(q=>q.id==='record_type'));assert(!m.missingInputIds.includes('record_type'));
  const q=m.questions.find(q=>q.id==='record_type');if(q){assert.equal(q.required,false);assert(q.helperText.includes('overlap'));}
 });
 for(const map of maps)for(const raw of rawCases){
  const record=structuredClone(original);record.draftSnapshot[map].record_type=structuredClone(raw);
  record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);
  check(`${label}/${map}/${JSON.stringify(raw)}: no exclusive-value or juvenile inference`,()=>{
   const m=P.protectedPacketInformationModelFor(record);assert(m);const q=m.questions.find(q=>q.id==='record_type');assert(q);assert.equal(q.required,false);assert(q.helperText.includes('overlap'));assert(q.translations.es.helperText.includes('coincidir'));
   assert(!m.missingInputIds.includes('record_type'));
   if(JSON.stringify(raw)===JSON.stringify(['Juvenile matter','Conviction'])){const retained=m.builderQuestions.find(q=>q.id==='record_type');assert(retained);assert.equal(retained.required,false);}
   const r=P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation;
   assert.equal(r.pathwayId,route);assert.equal(r.resultCode,result);assert.equal(r.paymentAllowed,payment);const price=createConsumerPaymentPlaceholder({...record.draftSnapshot,state},route);assert.equal(price.enabled,false);
   assert.equal(r.reasons[0].code,reason);
   assert.deepEqual(safety(record.draftSnapshot),safety(seed.snapshot));
   assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);
   assert.deepEqual(record,before);
  });
 }
}
}
// Existing unsupported/held results and fulfillment refusal remain separate from history.
// Legal classification and route selection remain governed by their existing answers.
// Run the real HTTP handler with isolated in-memory auth/store boundaries.
// No session, consent, entitlement, network or database fixture is created.
let authenticated = true, verified = true, owner = 'synthetic-dc-fl-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: records.get(id).draftSnapshot.jurisdiction, artifactRefs: {} });
globalThis.__dcFlPetitionHistoryTransport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: owner }),
  getBriefcaseItem: async (user, id) => user === 'synthetic-dc-fl-owner' && records.has(id) ? itemFor(id) : null,
  readProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId }) => {
    assert.equal(consumerAuthUserId, 'synthetic-dc-fl-owner');
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  persistProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId, transition }) => {
    assert.equal(consumerAuthUserId, 'synthetic-dc-fl-owner');
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
  source = source.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__dcFlPetitionHistoryTransport.${name}(...args);`).join('\n'));
}
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),
  { data: { url: apiUrl, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText } });
const API = await import(apiUrl);
const post = (id, answers, extra = {}) => API.POST(new Request(`http://isolated.invalid/api/expungement-ai/briefcase/${id}/packet-information`,
  { method: 'POST', body: JSON.stringify({ expectedRevision: records.get(id).revision, answers, ...extra }) }),
{ params: Promise.resolve({ itemId: id }) });
for(const [id,original] of [...records]){
 const {payment,reason}=cases.find(c=>c.route===original.draftSnapshot.pathwayId);
 const stored=structuredClone(original);
 stored.draftSnapshot.screeningAnswers.record_type=['Arrest or charge','Court case','Conviction'];
 stored.draftSnapshot.prefilledAnswers.record_type={unknown:true,value:'Court case'};
 stored.draftSnapshot.packetAnswers.record_type=['Juvenile matter','Conviction'];
 stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);records.set(id,stored);
 const otherMatters=[...records].filter(([k])=>k!==id).map(([k,v])=>[k,structuredClone(v)]);
 let response=await post(id,{});httpCases++;
 check(id+': HTTP no-op keeps overlapping history',()=>{assert.equal(response.status,200);assert.deepEqual(records.get(id),stored);});
 response=await post(id,{participant_full_legal_name:'Synthetic '+id});httpCases++;
 check(id+': unrelated permitted save preserves all original raw record labels',()=>{assert.equal(response.status,200);const next=records.get(id);for(const map of maps)assert.deepEqual(next.draftSnapshot[map].record_type,stored.draftSnapshot[map].record_type);assert.equal(next.draftSnapshot.paymentAllowed,payment);});
 for(const value of ['Court case','I am not sure']){
  response=await post(id,{record_type:value});httpCases++;const body=await response.json();
  check(id+': explicit optional history amendment '+value+' archives every raw label',()=>{
   assert.equal(response.status,200);const next=records.get(id);assert.equal(next.draftSnapshot.packetAnswers.record_type,value);
   for(const map of maps){const entry=next.draftSnapshot.dependencies.semanticAnswerHistory.find(h=>h.factId==='record_type'&&h.source===map);assert(entry,map);assert.deepEqual(entry.value,stored.draftSnapshot[map].record_type);
    for(const fact of ['case_outcome','offense_level','age_at_offense','age','sentence_completion_date'])assert.deepEqual(next.draftSnapshot[map][fact],stored.draftSnapshot[map][fact]);}
   assert.equal(next.draftSnapshot.paymentAllowed,payment);assert.equal(next.status,'unverified');assert.equal(body.readyToGenerate,false);assert(!body.missingInputIds.includes('record_type'));
   assert.equal(P.evaluateProtectedPacketFacts(next.draftSnapshot).evaluation.reasons[0].code,reason);
   for(const[k,v]of otherMatters)assert.deepEqual(records.get(k),v);
  });
 }
 const stable=structuredClone(records.get(id));
 response=await post(id,{record_type:['Court case','Conviction']});httpCases++;const rejected=await response.json();
 check(id+': new unsupported multi-value rewrite refused without losing historical arrays',()=>{
  assert.equal(response.status,422);assert.equal(rejected.error,'invalid_packet_answers');assert.deepEqual(records.get(id),stable);
 });
 const savesBefore=saves;
 for(const [kind,status,error]of [['stale',409,'revision_conflict'],['anonymous',401,'auth_required'],['unverified',403,'verified_account_required'],['other-owner',404,'matter_not_found']]){
  authenticated=kind!=='anonymous';verified=kind!=='unverified';owner=kind==='other-owner'?'another-owner':'synthetic-dc-fl-owner';
  response=await post(id,{record_type:'Court case'},kind==='stale'?{expectedRevision:0}:{});httpCases++;const body=await response.json();
  check(id+': '+kind,()=>{assert.equal(response.status,status);assert.equal(body.error,error);assert.deepEqual(records.get(id),stable);assert.equal(saves,savesBefore);});
 }
 authenticated=true;verified=true;owner='synthetic-dc-fl-owner';
}
delete globalThis.__dcFlPetitionHistoryTransport;
console.log(JSON.stringify({status:'PASS_DC_FL_PETITION_OPTIONAL_HISTORY',checks,httpCases,originalIds:["Q-688bf057ef651e46a54b","Q-6e06a84342a41f34e1d2","Q-7ed646d227c26f9acc32","Q-0c86d50a75c852085df7","Q-f66a6b6b457285d85751","Q-8a323b249717d2c2b890","Q-fb2109e5a0379589fe4c","Q-9026faa3fca7a143a0df","Q-bf040ed86c19172840d6",'Q-f998590180601fe00713','Q-30353f219d82ca7eeb62','Q-4897a00f86c67fc5c57a','Q-4c4d60127b04b08d3f41','Q-d6c2af7ef42f979932f3','Q-50a58ca23c5c2ba26a76','Q-213a19004dbda41dfce2','Q-e7a0b9cbb9047649e8e0','Q-6b16d8ce7d8fc029c19e','Q-6add858b65f867a82b70','Q-502bf587f9925e5e6e79','Q-00caec14a5a59750b527','Q-748f73bc4bcf41923fcc','Q-6acd9d8d275e7be59682','Q-8c94453e5af32f59406d','Q-8105d5d0b28ebd1e4a67','Q-c8633872a982712e7803','Q-94c8f0620f0384854d98','Q-ab7cc6744570b24e17d4','Q-481c00319478c8236160','Q-1ee2fb0eca77febaf2b6','QD-fb5a90b4c42ab7e486c1','Q-46a17f0eb164e9cdcf27','Q-47d5c5f19e70f0fbcbec','Q-73e3915ed9d087f8b531','Q-6fce98651a27d2a3b8c6','Q-65a2e556a51d224b2917','Q-50dcf8b1a91162a70705','Q-5ec575d17ded0b87051d','Q-79e780778f4a487dd39b'],routes:cases.map(c=>c.state+':'+c.route),limits:['Existing DC/FL/GA outcomes, HI and LA screening readiness and KY unsupported/held/guidance outcomes retained; actual NO_RECORD checkout and payment refusal unchanged; no whole GA17 closure.','No database, output rendering, source change, hosted authorization or commercial delivery; draft EN/ES needs qualified review.']}));
