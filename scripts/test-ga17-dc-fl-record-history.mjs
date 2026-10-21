import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const mutation=process.argv.find(arg=>arg.startsWith('--mutation='))?.slice(11);
const mutations={
 ok_context:["export function okCategoryAndRecordAreHistory(profile, pathwayId, specification) {", "export function okCategoryAndRecordAreHistory(profile, pathwayId, specification) { return true;"],
 ok_route_0:["\"acquittal-dismissal-or-other-no-conviction-expungement\", // GA12 Q-7c344b62b8005b8c0856 / GA17 Q-1af92bac0be9e8f1d3c1", "\"unassigned-ok-route\", // GA12 Q-7c344b62b8005b8c0856 / GA17 Q-1af92bac0be9e8f1d3c1"],
 ok_route_1:["\"arrest-with-no-charges-filed\", // GA12 Q-64ac71408f9198d6c6bb / GA17 Q-c2eae6c2aea996936af8", "\"unassigned-ok-route\", // GA12 Q-64ac71408f9198d6c6bb / GA17 Q-c2eae6c2aea996936af8"],
 ok_route_2:["\"conviction-reversed-and-case-dismissed\", // GA12 Q-44758205328791de54b2 / GA17 Q-b2307423d9b47d9a1af7", "\"unassigned-ok-route\", // GA12 Q-44758205328791de54b2 / GA17 Q-b2307423d9b47d9a1af7"],
 ok_route_3:["\"deferred-sentence-court-record-expungement-under-991-c\", // GA12 Q-c7f7c05e9424141d43d5 / GA17 Q-bd410275cf3de6c271db", "\"unassigned-ok-route\", // GA12 Q-c7f7c05e9424141d43d5 / GA17 Q-bd410275cf3de6c271db"],
 ok_route_4:["\"dna-factual-innocence-expungement\", // GA12 Q-3e40c600977518a9ad95 / GA17 Q-694560c7c95fb47ca5ac", "\"unassigned-ok-route\", // GA12 Q-3e40c600977518a9ad95 / GA17 Q-694560c7c95fb47ca5ac"],
 ok_route_5:["\"felony-reclassified-as-a-misdemeanor\", // GA12 Q-d3ad0203b6c3121ae86e / GA17 Q-606eea91d3a3a9d1820d", "\"unassigned-ok-route\", // GA12 Q-d3ad0203b6c3121ae86e / GA17 Q-606eea91d3a3a9d1820d"],
 ok_route_6:["\"fine-only-misdemeanor-conviction-expungement\", // GA12 Q-5733847ce93786556162 / GA17 Q-4932a2b1edb791de2454", "\"unassigned-ok-route\", // GA12 Q-5733847ce93786556162 / GA17 Q-4932a2b1edb791de2454"],
 ok_route_7:["\"human-trafficking-survivor-relief\", // GA12 Q-c54f700a248b3499c184 / GA17 Q-82571d80cc42abd806af", "\"unassigned-ok-route\", // GA12 Q-c54f700a248b3499c184 / GA17 Q-82571d80cc42abd806af"],
 ok_route_8:["\"juvenile-record-expungement\", // GA12 Q-ef76f429778c93c43b10 / GA17 Q-b1d0bc75d75f9113d995", "\"unassigned-ok-route\", // GA12 Q-ef76f429778c93c43b10 / GA17 Q-b1d0bc75d75f9113d995"],
 ok_route_9:["\"misdemeanor-deferred-dismissal-expungement\", // GA12 Q-bdf0e7619ddfad13d1b8 / GA17 Q-572c0c7e28831927a19a", "\"unassigned-ok-route\", // GA12 Q-bdf0e7619ddfad13d1b8 / GA17 Q-572c0c7e28831927a19a"],
 ok_route_10:["\"nonviolent-felony-deferred-dismissal-expungement\", // GA12 Q-41b39b9d0aa40bacd744 / GA17 Q-77a18d8e1ed50ccabe51", "\"unassigned-ok-route\", // GA12 Q-41b39b9d0aa40bacd744 / GA17 Q-77a18d8e1ed50ccabe51"],
 ok_route_11:["\"not-more-than-two-eligible-felony-convictions-expungement\", // GA12 Q-7e9846761b731ed1bd35 / GA17 Q-5036cbc1e622a9444933", "\"unassigned-ok-route\", // GA12 Q-7e9846761b731ed1bd35 / GA17 Q-5036cbc1e622a9444933"],
 ok_route_12:["\"one-eligible-nonviolent-felony-conviction-expungement\", // GA12 Q-1b4a5930987a37b89ca1 / GA17 Q-302b485d17fcef854e84", "\"unassigned-ok-route\", // GA12 Q-1b4a5930987a37b89ca1 / GA17 Q-302b485d17fcef854e84"],
 ok_route_13:["\"other-eligible-misdemeanor-conviction-expungement\", // GA12 Q-c0893100ce168c61ea41 / GA17 Q-88799b7d454677674402", "\"unassigned-ok-route\", // GA12 Q-c0893100ce168c61ea41 / GA17 Q-88799b7d454677674402"],
 ok_route_14:["\"pardon-based-expungement\", // GA12 Q-fba22f7979e46d7aa914 / GA17 Q-ea6b30056ceb463744bb", "\"unassigned-ok-route\", // GA12 Q-fba22f7979e46d7aa914 / GA17 Q-ea6b30056ceb463744bb"],
 ok_route_15:["\"up-to-two-felony-deferred-dismissal-expungement\", // GA12 Q-d61d0fbc71aad09c6bb0 / GA17 Q-5abc61f83ae56e7779f7", "\"unassigned-ok-route\", // GA12 Q-d61d0fbc71aad09c6bb0 / GA17 Q-5abc61f83ae56e7779f7"],
 ok_route_16:["\"victim-protective-order-record-relief\", // GA12 Q-cf5ae343b7ff13b09400 / GA17 Q-69fdf8d958deae680d72", "\"unassigned-ok-route\", // GA12 Q-cf5ae343b7ff13b09400 / GA17 Q-69fdf8d958deae680d72"],

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
 r1_context:["contactRepresentationHash(profile) === entry.profileHash", "true"],
 r1_record_arm:["|| r1RecordIsHistory(profile, pathwayId, specification)", ""],
 r1_ut_record_0:["\"path-a-automatic-clean-slate-expungement\", // GA17 Q-5e88cc7ea97bd8745c1f", "\"unassigned-r1-route\", // GA17 Q-5e88cc7ea97bd8745c1f"],
 r1_ut_record_1:["\"path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice\", // GA17 Q-3784a90b21f601fc7637", "\"unassigned-r1-route\", // GA17 Q-3784a90b21f601fc7637"],
 r1_ut_record_2:["\"path-c-clean-slate-eligible-convictions-and-plea-in-abeyance-dismissals\", // GA17 Q-24585f480025fdf4a4cb", "\"unassigned-r1-route\", // GA17 Q-24585f480025fdf4a4cb"],
 r1_ut_record_3:["\"path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility\", // GA17 Q-d8cf948f1c17c4bffa64", "\"unassigned-r1-route\", // GA17 Q-d8cf948f1c17c4bffa64"],
 r1_ut_record_4:["\"path-e-petition-based-non-conviction-expungement\", // GA17 Q-ef44181a41b9119ee4e6", "\"unassigned-r1-route\", // GA17 Q-ef44181a41b9119ee4e6"],
 r1_ut_record_5:["\"path-f-petition-based-conviction-expungement\", // GA17 Q-8ab80724ffff8845f3bd", "\"unassigned-r1-route\", // GA17 Q-8ab80724ffff8845f3bd"],
 r1_ut_record_6:["\"path-i-traffic-offense-expungement-or-deletion\", // GA17 Q-a3934d2a19074726f573", "\"unassigned-r1-route\", // GA17 Q-a3934d2a19074726f573"],
 r1_ut_record_7:["\"path-j-cannabis-possession-petition-without-a-bci-certificate\", // GA17 Q-bd3410d058530b0a0f26", "\"unassigned-r1-route\", // GA17 Q-bd3410d058530b0a0f26"],
 r1_ut_record_8:["\"path-k-pardon-based-expungement\", // GA17 Q-958937ed725e4ea87169", "\"unassigned-r1-route\", // GA17 Q-958937ed725e4ea87169"],
 r1_ut_record_9:["\"path-l-vacatur-human-trafficking-related-expungement\", // GA17 Q-53b2acc2f8354df04528", "\"unassigned-r1-route\", // GA17 Q-53b2acc2f8354df04528"],
 r1_ut_record_10:["\"path-m-juvenile-expungement\", // GA17 Q-2ef0ec2a33a7e70da1e7", "\"unassigned-r1-route\", // GA17 Q-2ef0ec2a33a7e70da1e7"],
 r1_pa_record_0:["\"path-a-non-conviction-expungement\", // GA17 Q-5164c6e021bfd0897e7a", "\"unassigned-r1-route\", // GA17 Q-5164c6e021bfd0897e7a"],
 r1_pa_record_1:["\"path-b-complete-acquittal-not-guilty-expungement\", // GA17 Q-e770b2de507acec4924c", "\"unassigned-r1-route\", // GA17 Q-e770b2de507acec4924c"],
 r1_pa_record_2:["\"path-c-summary-conviction-expungement\", // GA17 Q-0ebc9cb4212495acdc33", "\"unassigned-r1-route\", // GA17 Q-0ebc9cb4212495acdc33"],
 r1_pa_record_3:["\"path-d-ard-expungement\", // GA17 Q-c28384c7cb8b3f5bf23f", "\"unassigned-r1-route\", // GA17 Q-c28384c7cb8b3f5bf23f"],
 r1_pa_record_4:["\"path-e-age-70-expungement\", // GA17 Q-9aed0f34c9788d7a3f09", "\"unassigned-r1-route\", // GA17 Q-9aed0f34c9788d7a3f09"],
 r1_pa_record_5:["\"path-f-deceased-person-expungement\", // GA17 Q-26bf101779eb24857f29", "\"unassigned-r1-route\", // GA17 Q-26bf101779eb24857f29"],
 r1_pa_record_6:["\"path-g-underage-drinking-conviction-expungement\", // GA17 Q-f99c455f93cd674c4b2a", "\"unassigned-r1-route\", // GA17 Q-f99c455f93cd674c4b2a"],
 r1_pa_record_7:["\"path-h-pardon-based-expungement\", // GA17 Q-14a06d05525bfd19ea98", "\"unassigned-r1-route\", // GA17 Q-14a06d05525bfd19ea98"],
 r1_pa_record_8:["\"path-i-petition-for-limited-access\", // GA17 Q-1d329de7345b39063b5e", "\"unassigned-r1-route\", // GA17 Q-1d329de7345b39063b5e"],
 r1_pa_record_9:["\"path-j-clean-slate-automatic-limited-access\", // GA17 Q-79a7e977aac71c792fae", "\"unassigned-r1-route\", // GA17 Q-79a7e977aac71c792fae"],
 r1_pa_record_10:["\"path-k-human-trafficking-vacatur-expungement\", // GA17 Q-afd2b456ce01f7e7429e", "\"unassigned-r1-route\", // GA17 Q-afd2b456ce01f7e7429e"],
 r1_la_record_0:["\"felony-article-893-e-set-aside-followed-by-expungement\", // GA17 Q-4d1424ca5f2137df7aa0", "\"unassigned-r1-route\", // GA17 Q-4d1424ca5f2137df7aa0"],
 r1_la_record_1:["\"felony-ten-year-clean-period-expungement\", // GA17 Q-5f8172fac27c22dd9f75", "\"unassigned-r1-route\", // GA17 Q-5f8172fac27c22dd9f75"],
 r1_la_record_2:["\"first-offender-pardon-felony-expungement\", // GA17 Q-abcb2d7a03cf6b8b18a2", "\"unassigned-r1-route\", // GA17 Q-abcb2d7a03cf6b8b18a2"],
 r1_la_record_3:["\"first-offense-marijuana-expungement-after-90-days-art-998\", // GA17 Q-94f70a6bc5afb8db8b2e", "\"unassigned-r1-route\", // GA17 Q-94f70a6bc5afb8db8b2e"],
 r1_la_record_4:["\"human-trafficking-survivor-expungement-fee-exempt-route\", // GA17 Q-ffc39f9d7d89d27baba6", "\"unassigned-r1-route\", // GA17 Q-ffc39f9d7d89d27baba6"],
 r1_la_record_5:["\"immediate-expungement-after-successful-court-program-completion-art-985-3\", // GA17 Q-836fc9f1ee674d99ab75", "\"unassigned-r1-route\", // GA17 Q-836fc9f1ee674d99ab75"],
 r1_la_record_6:["\"interim-expungement-of-a-felony-arrest-reduced-to-a-misdemeanor-conviction\", // GA17 Q-695fc1058b1ca3cd5828", "\"unassigned-r1-route\", // GA17 Q-695fc1058b1ca3cd5828"],
 r1_la_record_7:["\"misdemeanor-article-894-b-set-aside-followed-by-expungement\", // GA17 Q-ee9e78ee9b492f5731fa", "\"unassigned-r1-route\", // GA17 Q-ee9e78ee9b492f5731fa"],
 r1_la_record_8:["\"misdemeanor-five-year-clean-period-expungement\", // GA17 Q-c3d27d726a5efb8a9e60", "\"unassigned-r1-route\", // GA17 Q-c3d27d726a5efb8a9e60"],
 r1_tx_record_0:["\"automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07\", // GA17 Q-824a1ba5bd22b494dfa1", "\"unassigned-r1-route\", // GA17 Q-824a1ba5bd22b494dfa1"],
 r1_tx_record_1:["\"expunction-after-pardon-or-actual-innocence-relief\", // GA17 Q-c51c4a1d5b7aa734511a", "\"unassigned-r1-route\", // GA17 Q-c51c4a1d5b7aa734511a"],
 r1_tx_record_2:["\"expunction-for-arrest-with-no-charge-filed-after-the-limitations-period\", // GA17 Q-8d122cfbc96cf12d60cb", "\"unassigned-r1-route\", // GA17 Q-8d122cfbc96cf12d60cb"],
 r1_tx_record_3:["\"first-offense-dwi-nondisclosure\", // GA17 Q-35df6f53ee29fa1c90ec", "\"unassigned-r1-route\", // GA17 Q-35df6f53ee29fa1c90ec"],
 r1_tx_record_4:["\"petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725\", // GA17 Q-714293c4107f4534661e", "\"unassigned-r1-route\", // GA17 Q-714293c4107f4534661e"],
 r1_tx_record_5:["\"petitioned-nondisclosure-for-an-eligible-conviction-411-0735\", // GA17 Q-e6978babce1a46e17b47", "\"unassigned-r1-route\", // GA17 Q-e6978babce1a46e17b47"],
 r1_ne_record_0:["\"automatic-nonconviction-sealing\", // GA17 Q-831f2f441d10e55f7960", "\"unassigned-r1-route\", // GA17 Q-831f2f441d10e55f7960"],
 r1_ne_record_1:["\"juvenile-automatic-sealing\", // GA17 Q-acf1a4e859aaaf8006c4", "\"unassigned-r1-route\", // GA17 Q-acf1a4e859aaaf8006c4"],
 r1_ne_record_2:["\"juvenile-petition-backstop\", // GA17 Q-e093af789f1c7c7cfb0f", "\"unassigned-r1-route\", // GA17 Q-e093af789f1c7c7cfb0f"],
 r1_ne_record_3:["\"law-enforcement-error-expungement\", // GA17 Q-66dcd1e23c263ba19cbc", "\"unassigned-r1-route\", // GA17 Q-66dcd1e23c263ba19cbc"],
 r1_ne_record_4:["\"pardon-then-seal\", // GA17 Q-b8fdccd39b9b0190574f", "\"unassigned-r1-route\", // GA17 Q-b8fdccd39b9b0190574f"],
 r1_ne_record_5:["\"set-aside-incarceration-one-year-or-less\", // GA17 Q-5f04b326441400689e07", "\"unassigned-r1-route\", // GA17 Q-5f04b326441400689e07"],
 r1_ne_record_6:["\"set-aside-probation-fine-community-service\", // GA17 Q-d772db95899d4a74d3a0", "\"unassigned-r1-route\", // GA17 Q-d772db95899d4a74d3a0"],
 r1_ne_record_7:["\"trafficking-survivor-set-aside-and-seal\", // GA17 Q-d641e93e73955b0b8ca2", "\"unassigned-r1-route\", // GA17 Q-d641e93e73955b0b8ca2"],
 r1_ri_record_0:["\"path-a-first-offender-conviction-expungement\", // GA17 Q-b76d3d226ef90e273467", "\"unassigned-r1-route\", // GA17 Q-b76d3d226ef90e273467"],
 r1_ri_record_1:["\"path-b-multiple-misdemeanor-expungement\", // GA17 Q-be9c68444b00deaf3e53", "\"unassigned-r1-route\", // GA17 Q-be9c68444b00deaf3e53"],
 r1_ri_record_2:["\"path-c-deferred-sentence-expungement\", // GA17 Q-231f7301ba7ec275311f", "\"unassigned-r1-route\", // GA17 Q-231f7301ba7ec275311f"],
 r1_ri_record_3:["\"path-d-non-conviction-sealing-expungement\", // GA17 Q-315bc91f871d66169b51", "\"unassigned-r1-route\", // GA17 Q-315bc91f871d66169b51"],
 r1_ri_record_4:["\"path-e-filed-complaint-relief-under-12-10-12\", // GA17 Q-837bf7efc9ddfbb653af", "\"unassigned-r1-route\", // GA17 Q-837bf7efc9ddfbb653af"],
 r1_ri_record_5:["\"path-f-marijuana-possession-expungement\", // GA17 Q-e90b9851defd241b9ab1", "\"unassigned-r1-route\", // GA17 Q-e90b9851defd241b9ab1"],
 r1_ri_record_6:["\"path-g-decriminalized-offense-expungement\", // GA17 Q-b9ef500f7b5744a20048", "\"unassigned-r1-route\", // GA17 Q-b9ef500f7b5744a20048"],
 r1_ri_record_7:["\"path-h-commercial-sexual-activity-related-expungement\", // GA17 Q-0cf26464d2bc85c7c351", "\"unassigned-r1-route\", // GA17 Q-0cf26464d2bc85c7c351"],
 r1_vt_record_0:["\"adult-conviction-expungement-narrow-statutory-route\", // GA17 Q-03287db45ca3c582b999", "\"unassigned-r1-route\", // GA17 Q-03287db45ca3c582b999"],
 r1_vt_record_1:["\"adult-felony-conviction-sealing\", // GA17 Q-b96f19af50622e1a38f4", "\"unassigned-r1-route\", // GA17 Q-b96f19af50622e1a38f4"],
 r1_vt_record_2:["\"adult-misdemeanor-conviction-sealing\", // GA17 Q-5ac4b30089f77daf6cd5", "\"unassigned-r1-route\", // GA17 Q-5ac4b30089f77daf6cd5"],
 r1_vt_record_3:["\"dui-sealing\", // GA17 Q-ff9eafce80b006b84c5c", "\"unassigned-r1-route\", // GA17 Q-ff9eafce80b006b84c5c"],
 r1_vt_record_4:["\"juvenile-sealing\", // GA17 Q-d38163b0b33fc71c05bc", "\"unassigned-r1-route\", // GA17 Q-d38163b0b33fc71c05bc"],
 r1_vt_record_5:["\"non-conviction-sealing\", // GA17 Q-59aa1c6c9dcbb615627a", "\"unassigned-r1-route\", // GA17 Q-59aa1c6c9dcbb615627a"],
 r1_vt_record_6:["\"offense-before-age-25-sealing-under-33-v-s-a-5119-g\", // GA17 Q-ab8e14fa6d2ff40f35f4", "\"unassigned-r1-route\", // GA17 Q-ab8e14fa6d2ff40f35f4"],
 r1_vt_record_7:["\"young-adult-sealing-for-offenses-committed-at-ages-18-21\", // GA17 Q-552b6abf121201bf126a", "\"unassigned-r1-route\", // GA17 Q-552b6abf121201bf126a"],
 r1_il_record_0:["\"adult-conviction-sealing\", // GA17 Q-905b302c690c688a50ef", "\"unassigned-r1-route\", // GA17 Q-905b302c690c688a50ef"],
 r1_il_record_1:["\"adult-non-conviction-expungement\", // GA17 Q-a1b55e7d832957cab52a", "\"unassigned-r1-route\", // GA17 Q-a1b55e7d832957cab52a"],
 r1_il_record_2:["\"cannabis-specific-automatic-or-petition-expungement\", // GA17 Q-39fc9cec1bf95bfe925e", "\"unassigned-r1-route\", // GA17 Q-39fc9cec1bf95bfe925e"],
 r1_il_record_3:["\"clean-slate-automatic-sealing\", // GA17 Q-37b8f5e80e350bcca952", "\"unassigned-r1-route\", // GA17 Q-37b8f5e80e350bcca952"],
 r1_il_record_4:["\"expungement-after-eligible-supervision-or-qualified-probation\", // GA17 Q-5a68c2f8e2d58b0f5222", "\"unassigned-r1-route\", // GA17 Q-5a68c2f8e2d58b0f5222"],
 r1_il_record_5:["\"human-trafficking-survivor-vacatur-and-expungement\", // GA17 Q-4093022f362ef2861280", "\"unassigned-r1-route\", // GA17 Q-4093022f362ef2861280"],
 r1_il_record_6:["\"juvenile-automatic-or-petition-expungement\", // GA17 Q-4e2e79db0f82f00c9d5a", "\"unassigned-r1-route\", // GA17 Q-4e2e79db0f82f00c9d5a"],
 r1_nv_record_0:["\"controlled-substance-possession-sealing-under-nrs-453-3365\", // GA17 Q-1db73533e210d247511c", "\"unassigned-r1-route\", // GA17 Q-1db73533e210d247511c"],
 r1_nv_record_1:["\"deferred-judgment-dismissal-and-sealing-under-nrs-176-211\", // GA17 Q-6044b0d44312184fef47", "\"unassigned-r1-route\", // GA17 Q-6044b0d44312184fef47"],
 r1_nv_record_2:["\"general-conviction-record-sealing-under-nrs-179-245\", // GA17 Q-0b3068e00a728e8e9b5f", "\"unassigned-r1-route\", // GA17 Q-0b3068e00a728e8e9b5f"],
 r1_nv_record_3:["\"non-conviction-record-sealing\", // GA17 Q-1c93db2c1e3b044f4da9", "\"unassigned-r1-route\", // GA17 Q-1c93db2c1e3b044f4da9"],
 r1_nv_record_4:["\"reentry-program-sealing-under-nrs-179-259\", // GA17 Q-7fa963ef89606c0195de", "\"unassigned-r1-route\", // GA17 Q-7fa963ef89606c0195de"],
 r1_nv_record_5:["\"removal-of-a-record-from-the-central-repository-after-a-favourable-disposition-under-179a-160\", // GA17 Q-3eeb7101599cd4ef082d", "\"unassigned-r1-route\", // GA17 Q-3eeb7101599cd4ef082d"],
 r1_nv_record_6:["\"trafficking-victim-vacatur-and-sealing-under-nrs-179-247\", // GA17 Q-48f6f067fc1af171781c", "\"unassigned-r1-route\", // GA17 Q-48f6f067fc1af171781c"],
 r1_oh_record_0:["\"adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32\", // GA17 Q-d4ce8aeb5628508912d2", "\"unassigned-r1-route\", // GA17 Q-d4ce8aeb5628508912d2"],
 r1_oh_record_1:["\"adult-non-conviction-sealing-or-expungement-under-2953-33\", // GA17 Q-e0332e8dc4c98130d8d9", "\"unassigned-r1-route\", // GA17 Q-e0332e8dc4c98130d8d9"],
 r1_oh_record_2:["\"certain-firearm-carry-conviction-expungement-under-2953-35\", // GA17 Q-d87c7a2a4e6ba8df8a86", "\"unassigned-r1-route\", // GA17 Q-d87c7a2a4e6ba8df8a86"],
 r1_oh_record_3:["\"human-trafficking-survivor-conviction-expungement-under-2953-36\", // GA17 Q-5d9ed4f45d2af7006e2f", "\"unassigned-r1-route\", // GA17 Q-5d9ed4f45d2af7006e2f"],
 r1_oh_record_4:["\"human-trafficking-survivor-non-conviction-expungement-under-2953-521\", // GA17 Q-7c86feef8f3c97e28642", "\"unassigned-r1-route\", // GA17 Q-7c86feef8f3c97e28642"],
 r1_oh_record_5:["\"marijuana-hashish-possession-expungement-under-2953-321\", // GA17 Q-463c45ad2785b6a60935", "\"unassigned-r1-route\", // GA17 Q-463c45ad2785b6a60935"],
// r1 route mutants

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
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`import {writeSync} from 'node:fs';let d;export function initialize(x){d=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith(d[2])){if(!r.source.includes(d[0]))throw Error('mutation target absent');writeSync(2,JSON.stringify({appliedMutation:d[3]})+'\\n');return {...r,source:r.source.replace(d[0],d[1])}}return r}`),{data:[...mutations[mutation],["ok_context", "ok_route_0", "ok_route_1", "ok_route_2", "ok_route_3", "ok_route_4", "ok_route_5", "ok_route_6", "ok_route_7", "ok_route_8", "ok_route_9", "ok_route_10", "ok_route_11", "ok_route_12", "ok_route_13", "ok_route_14", "ok_route_15", "ok_route_16",'me_remaining_0','me_remaining_1','me_remaining_2','me_remaining_context','mame_0','mame_1','mame_2','ma_remaining_context','me_context','ma_next_0','ma_next_1','ma_next_2','ma_next_context','remainder_0','remainder_1','remainder_2','remainder_3','remainder_4','hi_0','hi_1','hi_2','hi_context','la_0','la_1','la_2','la_context','ky_0','ky_1','ky_2','ky_3','ky_4','ky_context','collection','context','fl_context','ownership','fl_sealing','fl_juvenile','fl_trafficking','fl_diversion','fl_defense','ga_automatic','ga_context','ma_0','ma_1','ma_2','ma_context'].includes(mutation)||/^r1_(context|collection|level|record_arm)$|^r1_[a-z]{2}_(category|record)_\d+$/.test(mutation)?'/packet-collection.ts':'/packet-information.ts',mutation]});}
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
// Onboarding CI runs this file as --shard=i/n legs (every n-th case from i); without the flag every case runs.
const shard=process.argv.find(arg=>arg.startsWith('--shard='))?.slice(8).split('/').map(Number)??[0,1];
assert(shard.length===2&&shard.every(Number.isInteger)&&shard[0]>=0&&shard[0]<shard[1],'--shard=i/n needs 0<=i<n');
// Shard-union self-check: the n legs, picked by the same rule the case loop uses, run every case exactly once between them.
const caseKey=c=>c.state+':'+c.route, leg=l=>cases.filter((_,i)=>i%shard[1]===l);
assert.equal(new Set(cases.map(caseKey)).size,cases.length,'case keys must be unique for the shard union to mean anything');
assert.deepEqual(Array.from({length:shard[1]},(_,l)=>leg(l).map(caseKey)).flat().sort(),cases.map(caseKey).sort(),'the shards must cover every case exactly once');
const predecessorHashes={"acquittal-dismissal-or-other-no-conviction-expungement":"bdb0c18eaef23800427218517c4346f05506eada984e10ecaaed90610a3065d7","arrest-with-no-charges-filed":"87dbf3ac8979fd47c842540aaa4451501b1bb80f9b0446e8c56eaf170e324bd9","conviction-reversed-and-case-dismissed":"42ae70f147939f04b56fa37bec7ac10920948b088570a317a2d2941742aa0dfc","deferred-sentence-court-record-expungement-under-991-c":"ab8022b2e824bf1b1310587deb0e7806651e64e9dccc0c4e5bde702309c3fda8","dna-factual-innocence-expungement":"8deb0875c91a7a9e2eb2564f8b94d142361e9af93c4dea489dbf30992f4ef8f8","felony-reclassified-as-a-misdemeanor":"9a4064525ebb76f6cd1b96356db3066d466f788b15146ad79838d063ae99cd1f","fine-only-misdemeanor-conviction-expungement":"ead387f42a675377514ec4aeed0cebeddc98c9c6a1a6687f818597639a8584d4","human-trafficking-survivor-relief":"edbc9a3bd23e72b5f7ff2a2f048639eb533ce674fe31ace90a954fbe9a46fb26","juvenile-record-expungement":"2d9eae18d4f767bf1beec008e9687b7f00859e084ee24012294cd523076b0037","misdemeanor-deferred-dismissal-expungement":"461d6649026a3b47a1af2a41b4f7bf3751006aaa0afc622f082d9b05842f9864","nonviolent-felony-deferred-dismissal-expungement":"61779e2ef209ee34b3b2a248c83b84b951c833a3ddc4978ad54ec68c89657041","not-more-than-two-eligible-felony-convictions-expungement":"c3425bb3d989e97bfd460195d5e173ff1da2a60dcaabcc1c2a2f6c926bcb97d8","one-eligible-nonviolent-felony-conviction-expungement":"e6fc221b1fe4ba9363af0ebeaae151419a5a23db5828963d3dd9941afa7598de","other-eligible-misdemeanor-conviction-expungement":"cd644e29f4748c44f38d9403ac1ed82e8ee4cc36cd0a2a3d4a211f158f9bb838","pardon-based-expungement":"c292b623d70dd68567fd7916ff10a78c514a40d616ffa7c7f701a6e4588933f5","up-to-two-felony-deferred-dismissal-expungement":"2701b609f6537bb1a1d2128960efd40566cf9cebfb0e7c717767c99724315821","victim-protective-order-record-relief":"9054e99277cb5bb2a9ee6e0d7d9e34ee995c2db17a3f14b96b65c814bf56576e","juvenile-automatic-dismissal":"a1777d9642aedbbfea82e888401dbb6af801d0085be5b18b4e3ed4c25294d2f6","juvenile-petition-610330":"775a82c178c9830391d9881fdecfe2bacb7d1a6771fcd7aa8aba530491a41ada","administrative-expunction-mistaken-or-unlawful-arrest":"85c16d422982e2f39a1d42eebf6468df07f589e491fd6e5edeef4d33bbfc0ba5","automatic-sealing-943-0595":"e47e4b18d6cdfa52b01df022079b44a832b068c673358df6b54c2093a06f94be","dc_auto_expungement_16_802":"c4fbe13478d80bd3613bba94658e5ad4798939a90f57dfe651a9aaddcc5af0cf","dc_auto_sealing_16_805":"983874a4c5eb49ffb982f151535fe748a0679d1fe9bc4a956a52a6a623f3cb18","dc_juvenile_sealing_16_2335":"c7feee63999ce9de5b928253b31347adccd5831307f0738313171147f548d18d","adult-conviction-sealing-under-m-g-l-c-276-100a":"702f775cdd74ce6a872b98a50381274b14a7c257707c54b2d1dc792531a87d7b","automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c":"ef24253671c6afdb2a8d1848088adf80401bbd20fff6689d57e29367f420b022","court-requested-sealing-for-dismissal-or-nolle-prosequi-100c":"c8c661a9849b978e86d3416bd9e760a43ae01d16ec6f49377e7c66589e46bd2d","dui-under-21-conviction":"aabcc56534a4f8ab7430985ae5783ffd123c283d82d535ece206a83c65e77eaa","first-time-drug-conviction":"4377a4d8e6311a46e63b1f8cbae954b478d001a6e36ea3058d366a3eed958aff","nonconviction-arrest-expungement":"1b9ad6627cb5b76894c7054474647dac7d77d5e38f6c075c7ea3012d6ee3e812","expungement-by-redaction-for-multi-person-records":"fac5462a969717f29f8487e5e121f0dd5cee11ae88b4a7eccad7ff1686123397","non-conviction-arrest-expungement":"022c3d72f61a6fabde08904670972cba90b57fab4f8e33c366902ca5cbcf2929","automated-expungement-status-verification-art-985-2":"49a76568f19070cfd1856e9306cc935d05439b0359a239a6fb2e648158ce310e","misdemeanor-violation-traffic-conviction":"c0899ab93902c859a3cf1c6af06a10d646587e746bcabe46179d1bb1e31d383c","nonconviction-431076":"531875c911e7dc0288319c9d9fe9c6329f37fed9ec3c58790818e17d8e717a7c","void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276":"172efe74ee336e832e100d74ee05d6b1090165a80bd9cf58879f06d0167b82d4","dc_motion_seal_misdemeanor_conviction_5yr_16_806":"2151f25f31aa842d96d4cf4eae4e51c4c06f723a4b990f9e8922dd8c9f6d3fbd","dc_motion_seal_nonconviction_16_806":"da1a999021ebf099a165e1d30f62c25c58bcb0c4e5ca709f0ccf57f39d8089fb","court-ordered-expunction-943-0585":"89d9f01b4f3283b3760e4a21fca075bc948a96d2c5d973aa78f023c4dee107c1","court-ordered-sealing-943-059":"b91cd98fe3b9f673023369ff6f28eee0e5b61282a527b0aa97b96605b90d9df1","early-juvenile-expunction-943-0515":"f073d4e9daabbfb2953196c4a069094062f9f3ced9ad764c8a2926ec916210b1","human-trafficking-victim-expunction-943-0583":"e6502befee04de2d1258dc7bffcfa40081f3f49c49be74ed7c792b04275378de","juvenile-diversion-expunction-943-0582":"0835b875bbe4d563029141334795658e1784baacd5c72c9b90b2b03647a7cd76","lawful-self-defense-expunction-943-0578":"2167351db9f9e46b127b24b0120f8aea47f568417dd07bd703679ccccfeef1e5","automatic-restriction-of-qualifying-post-july-1-2013-non-convictions":"e84c65022897f61a29de80a8dd9615737b38e3d9245a17879c1f301bfd52f21c","juvenile-record-sealing-under-100b":"930d73d4d9ea9631bc81b588221238a283f5201bf5c364064c9d32090b6694fc","marijuana-only-expungement":"4a81466693c8c731eaf19f3d1d404c6333fc5b19d4c113d91bc55fcb892efd11","non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k":"633ca0e3e30f53dbf8e353d107bb12a36fcc8b670b46c87200564f076c704f8a","time-based-expungement-under-100f-100j":"da5b638ccad091e578656137cc0ee971409c2487693d37d032d703674ca91f48","adult-conviction-sealing":"ac3197e46eee43cce229c8ee1cf0f1ac7072483da70f528659057784dd8d1d39","adult-non-conviction-record-relief":"db0a3318ab6fb771b6cfe4e0fa5c65459cf979a08e17250755cae8bc88017ec8","juvenile-sealing":"c86b39a5481408b1d7b3e2ee2e0529ff6af25dc0f732df5bcdfb1c1ba42dd6ae","pardon-route":"d807fe75313a489ef39254fe46eb1c9b4419406da1d29980893dbad9b9845e25","sex-trafficking-sexual-exploitation-survivor-sealing":"4213572de02bc74ddf8c0ab738b53d3f3480cc8d92075c5d801cbec62ecb6bd6"};
// GA17 OK: exact original record associations, independent of category semantics.
cases.push(...[
  {
    "state": "OK",
    "route": "acquittal-dismissal-or-other-no-conviction-expungement",
    "result": "needs_review",
    "payment": false,
    "reason": "ok.waiting_rule_not_executed"
  },
  {
    "state": "OK",
    "route": "arrest-with-no-charges-filed",
    "result": "guidance_only",
    "payment": false,
    "reason": "ok.guidance_only_no_user_filed_court_petition"
  },
  {
    "state": "OK",
    "route": "conviction-reversed-and-case-dismissed",
    "result": "guidance_only",
    "payment": false,
    "reason": "ok.guidance_only_no_user_filed_court_petition"
  },
  {
    "state": "OK",
    "route": "deferred-sentence-court-record-expungement-under-991-c",
    "result": "guidance_only",
    "payment": false,
    "reason": "ok.guidance_only_no_user_filed_court_petition"
  },
  {
    "state": "OK",
    "route": "dna-factual-innocence-expungement",
    "result": "guidance_only",
    "payment": false,
    "reason": "ok.guidance_only_no_user_filed_court_petition"
  },
  {
    "state": "OK",
    "route": "felony-reclassified-as-a-misdemeanor",
    "result": "guidance_only",
    "payment": false,
    "reason": "ok.guidance_only_no_user_filed_court_petition"
  },
  {
    "state": "OK",
    "route": "fine-only-misdemeanor-conviction-expungement",
    "result": "guidance_only",
    "payment": false,
    "reason": "ok.guidance_only_no_user_filed_court_petition"
  },
  {
    "state": "OK",
    "route": "human-trafficking-survivor-relief",
    "result": "needs_review",
    "payment": false,
    "reason": "ok.waiting_rule_not_executed"
  },
  {
    "state": "OK",
    "route": "juvenile-record-expungement",
    "result": "needs_review",
    "payment": false,
    "reason": "ok.waiting_rule_not_executed"
  },
  {
    "state": "OK",
    "route": "misdemeanor-deferred-dismissal-expungement",
    "result": "guidance_only",
    "payment": false,
    "reason": "ok.guidance_only_no_user_filed_court_petition"
  },
  {
    "state": "OK",
    "route": "nonviolent-felony-deferred-dismissal-expungement",
    "result": "guidance_only",
    "payment": false,
    "reason": "ok.guidance_only_no_user_filed_court_petition"
  },
  {
    "state": "OK",
    "route": "not-more-than-two-eligible-felony-convictions-expungement",
    "result": "guidance_only",
    "payment": false,
    "reason": "ok.guidance_only_no_user_filed_court_petition"
  },
  {
    "state": "OK",
    "route": "one-eligible-nonviolent-felony-conviction-expungement",
    "result": "guidance_only",
    "payment": false,
    "reason": "ok.guidance_only_no_user_filed_court_petition"
  },
  {
    "state": "OK",
    "route": "other-eligible-misdemeanor-conviction-expungement",
    "result": "guidance_only",
    "payment": false,
    "reason": "ok.guidance_only_no_user_filed_court_petition"
  },
  {
    "state": "OK",
    "route": "pardon-based-expungement",
    "result": "needs_review",
    "payment": false,
    "reason": "ok.waiting_rule_not_executed"
  },
  {
    "state": "OK",
    "route": "up-to-two-felony-deferred-dismissal-expungement",
    "result": "needs_review",
    "payment": false,
    "reason": "ok.waiting_rule_not_executed"
  },
  {
    "state": "OK",
    "route": "victim-protective-order-record-relief",
    "result": "guidance_only",
    "payment": false,
    "reason": "ok.guidance_only_no_user_filed_court_petition"
  }
]);
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
// GA17 R1 table states: original associations; outcomes, predecessor draft hashes and synthetic witnesses measured at the base.
const r1States={
 UT:{"separateFacts":["case_outcome","offense_level","source_question_12_6-what-was-the-charge-and-statute","source_question_13_7-was-it-a-felony-class-a-misdemeanor-cl","source_question_14_8-was-it-domestic-violence-assault-sex-r","source_question_31_check-traffic-deletion-or-traffic-petiti"],"witnesses":{"path-a-automatic-clean-slate-expungement":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Misdemeanor conviction","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path A — Automatic Clean Slate expungement","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Acquitted or found not guilty","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path B — Automatic expungement after acquittal or dismissal with prejudice","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"path-c-clean-slate-eligible-convictions-and-plea-in-abeyance-dismissals":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Dismissed, no-billed, nolle prosequi, or not prosecuted","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path C — Clean Slate eligible convictions and plea-in-abeyance dismissals","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"path-k-pardon-based-expungement":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Misdemeanor conviction","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path K — Pardon-based expungement","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}}},"routes":{"path-a-automatic-clean-slate-expungement":{"questionRecordId":"Q-5e88cc7ea97bd8745c1f","result":"guidance_only","payment":false,"reason":"ut.guidance_only_no_user_filed_court_petition","seedHash":"57b6298a8d940101aea4776e0cc158824a0ae04c2adb17741ed754aeadeaf823"},"path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice":{"questionRecordId":"Q-3784a90b21f601fc7637","result":"guidance_only","payment":false,"reason":"ut.guidance_only_no_user_filed_court_petition","seedHash":"7edf65ff4553e4eaf9d6e159c41267cb8adc5d79a900c4ee5bdd828a739a7623"},"path-c-clean-slate-eligible-convictions-and-plea-in-abeyance-dismissals":{"questionRecordId":"Q-24585f480025fdf4a4cb","result":"guidance_only","payment":false,"reason":"ut.guidance_only_no_user_filed_court_petition","seedHash":"107270a59b15e7d2091f97b8bc5569fcd2a3d993ce0ac0fc242094aafc9d06c1"},"path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility":{"questionRecordId":"Q-d8cf948f1c17c4bffa64","result":"needs_review","payment":false,"reason":"ut.waiting_rule_not_executed","seedHash":"309faf86e23c0caf31980d74bf22b9b176231eb6985f371c2a237e5f562c10bc"},"path-e-petition-based-non-conviction-expungement":{"questionRecordId":"Q-ef44181a41b9119ee4e6","result":"needs_review","payment":false,"reason":"ut.waiting_rule_not_executed","seedHash":"d226bdb32edf72e40816b2bdf8c9962dffc7a17f14e32a0ffe82b366d95e7a53"},"path-f-petition-based-conviction-expungement":{"questionRecordId":"Q-8ab80724ffff8845f3bd","result":"guidance_only","payment":false,"reason":"ut.guidance_only_no_user_filed_court_petition","seedHash":"58c959a2af75247bd6feb5eff720c405f47441c42e4c8df7636c40654b2f5b6b"},"path-i-traffic-offense-expungement-or-deletion":{"questionRecordId":"Q-a3934d2a19074726f573","result":"packet_ready_with_caution","payment":true,"reason":"ut.compiled_rule_match.route-path-i-traffic-offense-expungement-or-deletion","seedHash":"e9f5f0769de2163139e581e6a57e9851994e3fbe5925e3729e06f3c236af770e"},"path-j-cannabis-possession-petition-without-a-bci-certificate":{"questionRecordId":"Q-bd3410d058530b0a0f26","result":"guidance_only","payment":false,"reason":"ut.guidance_only_no_user_filed_court_petition","seedHash":"8c4998c085fb7c24583167d4de4fb7b393573d0a00f89c558b38a1b246346f5e"},"path-k-pardon-based-expungement":{"questionRecordId":"Q-958937ed725e4ea87169","result":"guidance_only","payment":false,"reason":"ut.guidance_only_no_user_filed_court_petition","seedHash":"60e04b320fd766d3a0c3a5acb359f2572fe2b0f417bcf3e189ab8bb3b02f0ade"},"path-l-vacatur-human-trafficking-related-expungement":{"questionRecordId":"Q-53b2acc2f8354df04528","result":"guidance_only","payment":false,"reason":"ut.guidance_only_no_user_filed_court_petition","seedHash":"3d5c5323561921d37e2e1e6cee28e643facf8894d8938fb035f719cf730245b6"},"path-m-juvenile-expungement":{"questionRecordId":"Q-2ef0ec2a33a7e70da1e7","result":"guidance_only","payment":false,"reason":"ut.guidance_only_no_user_filed_court_petition","seedHash":"169cd35d83a2cde09361b68bac7f0b895992c164ee32fd3a73bb2cd614a7d3ff"}}},
 PA:{"separateFacts":["case_outcome","offense_level","source_question_09_6-what-was-the-charge-and-statute","source_question_10_7-what-was-the-grade","source_question_26_16-was-there-any-charge-involving-violen"],"witnesses":{"path-b-complete-acquittal-not-guilty-expungement":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Acquitted or found not guilty","court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path B — Complete-acquittal / not-guilty expungement","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"path-c-summary-conviction-expungement":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Other conviction or adjudication","court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path C — Summary-conviction expungement","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"path-d-ard-expungement":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Dismissed, no-billed, nolle prosequi, or not prosecuted","court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path D — ARD expungement","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"path-e-age-70-expungement":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Misdemeanor conviction","court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path E — Age-70 expungement","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"path-f-deceased-person-expungement":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Misdemeanor conviction","court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path F — Deceased-person expungement","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"path-g-underage-drinking-conviction-expungement":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Other conviction or adjudication","court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path G — Underage-drinking conviction expungement","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"path-h-pardon-based-expungement":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Pardoned conviction","court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path H — Pardon-based expungement","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"path-i-petition-for-limited-access":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Misdemeanor conviction","court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path I — Petition for limited access","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"path-j-clean-slate-automatic-limited-access":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Misdemeanor conviction","court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path J — Clean Slate automatic limited access","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"path-k-human-trafficking-vacatur-expungement":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Other conviction or adjudication","court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path K — Human-trafficking vacatur / expungement","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}}},"routes":{"path-a-non-conviction-expungement":{"questionRecordId":"Q-5164c6e021bfd0897e7a","result":"needs_review","payment":false,"reason":"pa.waiting_rule_not_executed","seedHash":"58d6479bcdf565ab730405face3dad915983a33972ba7c1fe349fd81664575c1"},"path-b-complete-acquittal-not-guilty-expungement":{"questionRecordId":"Q-e770b2de507acec4924c","result":"guidance_only","payment":false,"reason":"pa.approved_release_guidance_only","seedHash":"93f1c0011936f40455f6253561e29e7ce6dfdc2be569aa324ffd690fafd5013f"},"path-c-summary-conviction-expungement":{"questionRecordId":"Q-0ebc9cb4212495acdc33","result":"guidance_only","payment":false,"reason":"pa.approved_release_guidance_only","seedHash":"3abd741188cd36b8e10cc0f823e6d845659638e2986c47e40852be8608c69d13"},"path-d-ard-expungement":{"questionRecordId":"Q-c28384c7cb8b3f5bf23f","result":"guidance_only","payment":false,"reason":"pa.approved_release_guidance_only","seedHash":"7c1813b6f87c9d8a2ae59132f5c46d73a7f71ca30306bceed701d51752ea7f7d"},"path-e-age-70-expungement":{"questionRecordId":"Q-9aed0f34c9788d7a3f09","result":"guidance_only","payment":false,"reason":"pa.approved_release_guidance_only","seedHash":"dc6b6252dcfbe2464806f6d32f781b81eaf3c64bdcb3d5004109e47c25035ce4"},"path-f-deceased-person-expungement":{"questionRecordId":"Q-26bf101779eb24857f29","result":"guidance_only","payment":false,"reason":"pa.approved_release_guidance_only","seedHash":"4187a65dac16312db2e28ced158130a70e1b241b401ebdcd67b43e826fb0088e"},"path-g-underage-drinking-conviction-expungement":{"questionRecordId":"Q-f99c455f93cd674c4b2a","result":"guidance_only","payment":false,"reason":"pa.approved_release_guidance_only","seedHash":"a944ec7c5a345e7b4e2a34af28106d64b44777c8cee5af18774457ed2621c2ad"},"path-h-pardon-based-expungement":{"questionRecordId":"Q-14a06d05525bfd19ea98","result":"guidance_only","payment":false,"reason":"pa.approved_release_guidance_only","seedHash":"6d5d08bb8d3da5a0546822628305229e57bc1d8b24f051698e0f7591c770afec"},"path-i-petition-for-limited-access":{"questionRecordId":"Q-1d329de7345b39063b5e","result":"guidance_only","payment":false,"reason":"pa.approved_release_guidance_only","seedHash":"85829635c51cf63fd62132548905a4b3092b5c26e5eae7d397073e6773f8b606"},"path-j-clean-slate-automatic-limited-access":{"questionRecordId":"Q-79a7e977aac71c792fae","result":"guidance_only","payment":false,"reason":"pa.guidance_only_no_user_filed_court_petition","seedHash":"317751bbcf3512fec94c7b5b6be509acd81a89f45f1df7ea22950915abcf7b92"},"path-k-human-trafficking-vacatur-expungement":{"questionRecordId":"Q-afd2b456ce01f7e7429e","result":"guidance_only","payment":false,"reason":"pa.approved_release_guidance_only","seedHash":"4d4f6dd9929b14e16c879b2f39f5af9de4e2e5eab70e1361a35547120e28566f"}}},
 LA:{"separateFacts":["case_outcome","offense_level","source_question_02_step-2-did-the-arrest-result-in-a-convic"],"witnesses":{},"routes":{"felony-article-893-e-set-aside-followed-by-expungement":{"questionRecordId":"Q-4d1424ca5f2137df7aa0","result":"packet_ready_with_caution","payment":true,"reason":"la.compiled_rule_match.route-felony-article-893-e-set-aside-followed-by-expungement","seedHash":"90302397628045b667edc8bbf9962a8ade39a0e6054e200559138b38da6eee4c"},"felony-ten-year-clean-period-expungement":{"questionRecordId":"Q-5f8172fac27c22dd9f75","result":"not_covered_yet","payment":false,"reason":"la.intentional_unsupported_route","seedHash":"e5345b3f85fec00c7829cfa46da5d77209f3c350a33312eb4c33d8cab132f993"},"first-offender-pardon-felony-expungement":{"questionRecordId":"Q-abcb2d7a03cf6b8b18a2","result":"guidance_only","payment":false,"reason":"la.lawrence_hold_guidance_only","seedHash":"4f165bddbe6c75ee7ef72acb9af9316cd0725a06470a829e6b89b8d9b95f8647"},"first-offense-marijuana-expungement-after-90-days-art-998":{"questionRecordId":"Q-94f70a6bc5afb8db8b2e","result":"needs_more_info","payment":false,"reason":"la.route_identified_packet_not_yet_available","seedHash":"26fe900aa81eaffed586fe370ec213edc23eb7e477c952102db5337b5cb5c2f8"},"human-trafficking-survivor-expungement-fee-exempt-route":{"questionRecordId":"Q-ffc39f9d7d89d27baba6","result":"guidance_only","payment":false,"reason":"la.lawrence_hold_guidance_only","seedHash":"b57aafcf84804b6a9679edb537f717b32291f64e8fc9e2e396224e830a3a4441"},"immediate-expungement-after-successful-court-program-completion-art-985-3":{"questionRecordId":"Q-836fc9f1ee674d99ab75","result":"guidance_only","payment":false,"reason":"la.lawrence_hold_guidance_only","seedHash":"7a81d6593fa83c125254ea7855b7f9f9e7bc5a3e6f87725a6ae49e309175a6b7"},"interim-expungement-of-a-felony-arrest-reduced-to-a-misdemeanor-conviction":{"questionRecordId":"Q-695fc1058b1ca3cd5828","result":"guidance_only","payment":false,"reason":"la.lawrence_hold_guidance_only","seedHash":"5820c3013257b04ea3cb473c5288aef6b338458159a872baf8211ed3e9cd7c87"},"misdemeanor-article-894-b-set-aside-followed-by-expungement":{"questionRecordId":"Q-ee9e78ee9b492f5731fa","result":"packet_ready_with_caution","payment":true,"reason":"la.compiled_rule_match.route-misdemeanor-article-894-b-set-aside-followed-by-expungement","seedHash":"ce860e5a92d387b8ddfc9cde694add1691bfb2df1b838b5794880b2e762673b6"},"misdemeanor-five-year-clean-period-expungement":{"questionRecordId":"Q-c3d27d726a5efb8a9e60","result":"not_covered_yet","payment":false,"reason":"la.intentional_unsupported_route","seedHash":"6340f45aa7b6ec5f3ca494ec9ba9296189fe20b3fd311d03b8ee2947e8a2c0b9"}}},
 TX:{"separateFacts":["case_outcome","offense_level"],"witnesses":{"automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Arrest or citation with no charge filed","court_requirements_completed":"yes","financial_obligations":"Yes","identity_error":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pardon_status":"No","pending_cases":"No","possible_pathway_context":"Automatic nondisclosure for qualifying nonviolent misdemeanor deferred adjudication (§ 411.072)","record_documents":"Yes","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes","state_exclusion_categories":["None of these"]}}},"routes":{"automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07":{"questionRecordId":"Q-824a1ba5bd22b494dfa1","result":"guidance_only","payment":false,"reason":"tx.guidance_only_no_user_filed_court_petition","seedHash":"5f75a52fc37e2ab7cbbe91fcd76b564e274ace3d86eaa8382c9fb542ee401a5f"},"expunction-after-pardon-or-actual-innocence-relief":{"questionRecordId":"Q-c51c4a1d5b7aa734511a","result":"guidance_only","payment":false,"reason":"tx.guidance_only_no_user_filed_court_petition","seedHash":"cff5207a5dc5d3b2e06979c7c3433010f66c7aacd07b31cfecf7d9241077e006"},"expunction-for-arrest-with-no-charge-filed-after-the-limitations-period":{"questionRecordId":"Q-8d122cfbc96cf12d60cb","result":"needs_review","payment":false,"reason":"tx.waiting_rule_not_executed","seedHash":"265de88017f4b5f75552b9aa79da93e3a4b40ead4dcc4d953144f3cf1f325615"},"first-offense-dwi-nondisclosure":{"questionRecordId":"Q-35df6f53ee29fa1c90ec","result":"needs_more_info","payment":false,"reason":"tx.nondisclosure_exact_facts_missing","seedHash":"c6d31fbcf240c477212fc1fe9225577c05beb9f51a7f3071403e1488a2799bef"},"petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725":{"questionRecordId":"Q-714293c4107f4534661e","result":"needs_more_info","payment":false,"reason":"tx.nondisclosure_exact_facts_missing","seedHash":"10447310e391d9b17060a146a33fe60240e8f26d80ef4fdc91d0c7bb0459b69e"},"petitioned-nondisclosure-for-an-eligible-conviction-411-0735":{"questionRecordId":"Q-e6978babce1a46e17b47","result":"needs_more_info","payment":false,"reason":"tx.nondisclosure_exact_facts_missing","seedHash":"27c99ca5e11365bcda281b4956060b73e9b9eb2aa818c9d41c59e83ba3fdd6d3"}}},
 NE:{"separateFacts":["case_outcome","offense_level"],"witnesses":{"automatic-nonconviction-sealing":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"age_at_offense":"30","case_outcome":"Misdemeanor conviction","court_requirements_completed":"yes","financial_obligations":"Yes","identity_error":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pardon_status":"No","pending_cases":"No","possible_pathway_context":"Automatic/time-based sealing of non-conviction records under § 29-3523","record_documents":"Yes","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"juvenile-automatic-sealing":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"age_at_offense":"30","case_outcome":"Other conviction or adjudication","court_requirements_completed":"yes","financial_obligations":"Yes","identity_error":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pardon_status":"No","pending_cases":"No","possible_pathway_context":"Juvenile automatic sealing under §§ 43-2,108.01 to 43-2,108.05","record_documents":"Yes","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}}},"routes":{"automatic-nonconviction-sealing":{"questionRecordId":"Q-831f2f441d10e55f7960","result":"guidance_only","payment":false,"reason":"ne.guidance_only_no_user_filed_court_petition","seedHash":"2d1aec6c35baf61f63f29c33affb2b5feae5c0b8d234749b83bb253e11498b50"},"juvenile-automatic-sealing":{"questionRecordId":"Q-acf1a4e859aaaf8006c4","result":"guidance_only","payment":false,"reason":"ne.guidance_only_no_user_filed_court_petition","seedHash":"dc20684fbc6c32553142019dc75e14862b00411841d8bda4bb61211ca74c1c49"},"juvenile-petition-backstop":{"questionRecordId":"Q-e093af789f1c7c7cfb0f","result":"guidance_only","payment":false,"reason":"ne.lawrence_hold_guidance_only","seedHash":"211449f837e5d1deb7faa4c5f7b4acac1650b1391c73eb31c1d20789b50e4acf"},"law-enforcement-error-expungement":{"questionRecordId":"Q-66dcd1e23c263ba19cbc","result":"guidance_only","payment":false,"reason":"ne.lawrence_hold_guidance_only","seedHash":"e0cfe78d606eacd9b1836cdd77a27f3fa2ccf4fb4ef3c95e5d428e51398f2409"},"pardon-then-seal":{"questionRecordId":"Q-b8fdccd39b9b0190574f","result":"guidance_only","payment":false,"reason":"ne.lawrence_hold_guidance_only","seedHash":"9c72f2add3a72f2c38b955b0e34bb512f9e98ca4d2ba0f17be29974ceeac0562"},"set-aside-incarceration-one-year-or-less":{"questionRecordId":"Q-5f04b326441400689e07","result":"packet_ready_with_caution","payment":true,"reason":"ne.compiled_rule_match.rule-05-the-sentence-conditions-must-be-satisfactorily-complete","seedHash":"88183d682bc6d636ae36ff92ee6bd36c961f08c7c6fb6351e6cebf3389a44c73"},"set-aside-probation-fine-community-service":{"questionRecordId":"Q-d772db95899d4a74d3a0","result":"packet_ready_with_caution","payment":true,"reason":"ne.compiled_rule_match.rule-05-the-sentence-conditions-must-be-satisfactorily-complete","seedHash":"e99d3f5e3370d94cdfbaa9f00e7a01f5341b49db3e7dcc7dfaade0486ebbb855"},"trafficking-survivor-set-aside-and-seal":{"questionRecordId":"Q-d641e93e73955b0b8ca2","result":"guidance_only","payment":false,"reason":"ne.lawrence_hold_guidance_only","seedHash":"47a50184197f97671935ffc9055ffa6767f525f2e6b84d03aea5e73a4d903c55"}}},
 RI:{"separateFacts":["case_outcome","offense_level","source_question_02_2-which-court-handled-it","source_question_03_district-court","source_question_04_superior-court","source_question_05_family-court","source_question_09_conviction","source_question_10_dismissal"],"witnesses":{"path-f-marijuana-possession-expungement":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Misdemeanor conviction","court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path F — Marijuana-possession expungement","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}},"path-g-decriminalized-offense-expungement":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"case_outcome":"Misdemeanor conviction","court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Path G — Decriminalized-offense expungement","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes"}}},"routes":{"path-a-first-offender-conviction-expungement":{"questionRecordId":"Q-b76d3d226ef90e273467","result":"needs_review","payment":false,"reason":"ri.waiting_rule_not_executed","seedHash":"aebfb918464cc9374fa47d8147c67b0965f6b338d9be4224ec6176415397f543"},"path-b-multiple-misdemeanor-expungement":{"questionRecordId":"Q-be9c68444b00deaf3e53","result":"needs_review","payment":false,"reason":"ri.waiting_rule_not_executed","seedHash":"5ce8d466fe79fc273900f650210ad04c78b9ce0deed862eae5069f7ec3139689"},"path-c-deferred-sentence-expungement":{"questionRecordId":"Q-231f7301ba7ec275311f","result":"needs_review","payment":false,"reason":"ri.waiting_rule_not_executed","seedHash":"2859c04cecfbf0487af247118af3176c4e141d7eb4438980939a20d545b4523c"},"path-d-non-conviction-sealing-expungement":{"questionRecordId":"Q-315bc91f871d66169b51","result":"needs_review","payment":false,"reason":"ri.waiting_rule_not_executed","seedHash":"d6c2ff851175765c5ec3f34726ee464f9e05f570a4936c4ca7fb61a75687bea6"},"path-e-filed-complaint-relief-under-12-10-12":{"questionRecordId":"Q-837bf7efc9ddfbb653af","result":"needs_review","payment":false,"reason":"ri.waiting_rule_not_executed","seedHash":"e6991da1dcab6b015dc0346628f4932ed6d9b85657a4d17e7490133cd0606fa1"},"path-f-marijuana-possession-expungement":{"questionRecordId":"Q-e90b9851defd241b9ab1","result":"guidance_only","payment":false,"reason":"ri.guidance_only_no_user_filed_court_petition","seedHash":"187abf8fe35b36238ee3c3365395d8758fce09cfc33748e97f8abff84ad145bc"},"path-g-decriminalized-offense-expungement":{"questionRecordId":"Q-b9ef500f7b5744a20048","result":"needs_review","payment":false,"reason":"ri.legal_authority_referral_required","seedHash":"92e128d5b3fbb7d662699da4699ccff5418bdfac26840757a34d64632b69b8c4"},"path-h-commercial-sexual-activity-related-expungement":{"questionRecordId":"Q-0cf26464d2bc85c7c351","result":"needs_review","payment":false,"reason":"ri.waiting_rule_not_executed","seedHash":"bdf18a1f7370e0e7e675d3da7051c1ad2bd8f0f593e292fef6ba352da6e7066a"}}},
 VT:{"separateFacts":["case_outcome","offense_level","source_question_03_was-there-a-conviction-or-was-it-dismiss","source_question_04_what-county-and-court-handled-it","source_question_07_were-all-charges-from-the-same-incident","source_question_11_do-you-have-any-pending-criminal-charges","source_question_12_have-you-had-any-later-convictions","source_question_15_was-the-conviction-for-conduct-that-is-n"],"witnesses":{},"routes":{"adult-conviction-expungement-narrow-statutory-route":{"questionRecordId":"Q-03287db45ca3c582b999","result":"needs_review","payment":false,"reason":"vt.waiting_rule_not_executed","seedHash":"fd57d4759b052644211547ee6ef54923c12c467208fb5b0ca685d8e23604a850"},"adult-felony-conviction-sealing":{"questionRecordId":"Q-b96f19af50622e1a38f4","result":"guidance_only","payment":false,"reason":"vt.guidance_only_no_user_filed_court_petition","seedHash":"254cdfd079276a29fcae96f7dfe2002c74b763d20f00be173b3d94523305f5a7"},"adult-misdemeanor-conviction-sealing":{"questionRecordId":"Q-5ac4b30089f77daf6cd5","result":"guidance_only","payment":false,"reason":"vt.guidance_only_no_user_filed_court_petition","seedHash":"2adea8723ddc380d97aa4a8efbb1aa7f0ff374294f75ac3ebd11aa9e95f1cfa8"},"dui-sealing":{"questionRecordId":"Q-ff9eafce80b006b84c5c","result":"needs_review","payment":false,"reason":"vt.waiting_rule_not_executed","seedHash":"68975b4dfb3b457097a8e91dbec15e3b7756576a192fe9e883ca0195c5b30e33"},"juvenile-sealing":{"questionRecordId":"Q-d38163b0b33fc71c05bc","result":"packet_ready_with_caution","payment":false,"reason":"vt.compiled_rule_match.rule-20-age-18-21-qualifying-crime-30-days-after-sentence-compl","seedHash":"6efa31e8a790655e038a8dc99e4e179a2687cc12ef2bd07dbcb64815023145bb"},"non-conviction-sealing":{"questionRecordId":"Q-59aa1c6c9dcbb615627a","result":"guidance_only","payment":false,"reason":"vt.guidance_only_no_user_filed_court_petition","seedHash":"9922a35e8a5236e1891540c242043bf6c7094f834df429b863b691be9c1c1b4e"},"offense-before-age-25-sealing-under-33-v-s-a-5119-g":{"questionRecordId":"Q-ab8e14fa6d2ff40f35f4","result":"packet_ready_with_caution","payment":false,"reason":"vt.compiled_rule_match.rule-16-qualifying-dui-misdemeanor-10-years-after-sentence-comp","seedHash":"71b91e53cfc939a9e575819f7a2e9a1e4446c913bc2e0f32c9b3d01b121dab06"},"young-adult-sealing-for-offenses-committed-at-ages-18-21":{"questionRecordId":"Q-552b6abf121201bf126a","result":"packet_ready_with_caution","payment":false,"reason":"vt.compiled_rule_match.rule-16-qualifying-dui-misdemeanor-10-years-after-sentence-comp","seedHash":"df8810324f97b014946f64e32ae10187aaf616a3d6c452cb99183c752f266ca5"}}},
 IL:{"separateFacts":["case_outcome","offense_level","source_question_04_what-county-court-and-case-number","source_question_05_was-there-an-arrest-ticket-or-charge-not","source_question_07_what-was-the-exact-charge-and-statute","source_question_12_do-you-have-any-pending-criminal-charges"],"witnesses":{"clean-slate-automatic-sealing":{"profileVersion":"2026-06-19-source-conversion-1","answers":{"age_at_offense":"30","case_outcome":"Misdemeanor conviction","court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","offense_level":"Misdemeanor","ownership_scope":"Yes","pardon_status":"No","pending_cases":"No","possible_pathway_context":"Clean Slate automatic sealing","record_documents":"Yes","resolved_timing_bucket":"gt_10_years","sentence_completion_date":"Yes","special_preconditions_confirmed":"Yes","state_exclusion_categories":["None of these"],"trafficking_status":"No"}}},"routes":{"adult-conviction-sealing":{"questionRecordId":"Q-905b302c690c688a50ef","result":"packet_ready_with_caution","payment":true,"reason":"il.compiled_rule_match.rule-06-order-of-supervision-successfully-completed-expungement","seedHash":"5697dd4c6d29e218be6a051db4f23584eddea1cd8cee0b964f380dd44b03162b"},"adult-non-conviction-expungement":{"questionRecordId":"Q-a1b55e7d832957cab52a","result":"not_covered_yet","payment":false,"reason":"il.intentional_unsupported_route","seedHash":"dc16fa820329e97439c8bf6e620b7a9eeefb25d8f5747920343fd4aab042a6a8"},"cannabis-specific-automatic-or-petition-expungement":{"questionRecordId":"Q-39fc9cec1bf95bfe925e","result":"needs_review","payment":false,"reason":"il.waiting_rule_not_executed","seedHash":"2d15ff3f4b001c1909ddba935423cd6e5d0d531810fa24b5b85f4cbc32957e5b"},"clean-slate-automatic-sealing":{"questionRecordId":"Q-37b8f5e80e350bcca952","result":"guidance_only","payment":false,"reason":"il.guidance_only_no_user_filed_court_petition","seedHash":"f3a36fb3197a82097787f273c68e9bef8aa7662fef9987fc0cf292c776799829"},"expungement-after-eligible-supervision-or-qualified-probation":{"questionRecordId":"Q-5a68c2f8e2d58b0f5222","result":"needs_review","payment":false,"reason":"il.waiting_rule_not_executed","seedHash":"93ee8f9f628fb717e7bcd248c356b020b767e8df2386134f23b8f5eb68e14d73"},"human-trafficking-survivor-vacatur-and-expungement":{"questionRecordId":"Q-4093022f362ef2861280","result":"not_covered_yet","payment":false,"reason":"il.intentional_unsupported_route","seedHash":"60802193128d430e187c016ac88e0e4f0796c450263f963e5d654f72833e5293"},"juvenile-automatic-or-petition-expungement":{"questionRecordId":"Q-4e2e79db0f82f00c9d5a","result":"not_covered_yet","payment":false,"reason":"il.intentional_unsupported_route","seedHash":"1b5cecd17e073f439768074691da74513da8d09fd2b1c205b37d1fa1eed4cacd"}}},
 NV:{"separateFacts":["case_outcome","offense_level","source_question_01_step-1-was-there-a-conviction"],"witnesses":{},"routes":{"controlled-substance-possession-sealing-under-nrs-453-3365":{"questionRecordId":"Q-1db73533e210d247511c","result":"guidance_only","payment":false,"reason":"nv.guidance_only_no_user_filed_court_petition","seedHash":"8a8607ad6fc97e65b9de4a96f46cec9dd49a2ff0e409e2ea200c695e345a606c"},"deferred-judgment-dismissal-and-sealing-under-nrs-176-211":{"questionRecordId":"Q-6044b0d44312184fef47","result":"needs_review","payment":false,"reason":"nv.waiting_rule_not_executed","seedHash":"2ec119abcc4342bdc49f8d809310d1c94cb74fbb579c53d3eba9c2401f7f2cfe"},"general-conviction-record-sealing-under-nrs-179-245":{"questionRecordId":"Q-0b3068e00a728e8e9b5f","result":"needs_review","payment":false,"reason":"nv.waiting_rule_not_executed","seedHash":"163a34b6b4a245af57db3a39ab4fcbf11268c1724a67065726e69e1e1983c5bb"},"non-conviction-record-sealing":{"questionRecordId":"Q-1c93db2c1e3b044f4da9","result":"needs_review","payment":false,"reason":"nv.waiting_rule_not_executed","seedHash":"70745db7691c7f12bfe10f5a686611ee8befcd031ef76afae37b42d1dcc315c6"},"reentry-program-sealing-under-nrs-179-259":{"questionRecordId":"Q-7fa963ef89606c0195de","result":"guidance_only","payment":false,"reason":"nv.guidance_only_no_user_filed_court_petition","seedHash":"c0a5e8819ce5b83dab018a8ffdc790bbe35bcd2bab6892ce8f108a9d98d09bfc"},"removal-of-a-record-from-the-central-repository-after-a-favourable-disposition-under-179a-160":{"questionRecordId":"Q-3eeb7101599cd4ef082d","result":"guidance_only","payment":false,"reason":"nv.guidance_only_no_user_filed_court_petition","seedHash":"524f4ec3a0879e056c282f734f324aeb41025d8f956d19c5c7031e358587b7a8"},"trafficking-victim-vacatur-and-sealing-under-nrs-179-247":{"questionRecordId":"Q-48f6f067fc1af171781c","result":"needs_review","payment":false,"reason":"nv.waiting_rule_not_executed","seedHash":"6fe214ed83e279d76a3e63ca47cf756ce95fb259b2e6f01d12fcc82eb489271c"}}},
 OH:{"separateFacts":["case_outcome","offense_level"],"witnesses":{},"routes":{"adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32":{"questionRecordId":"Q-d4ce8aeb5628508912d2","result":"needs_review","payment":false,"reason":"oh.route_gate_pending_lawrence_review","seedHash":"b741b3c1d7de91b36465b7b4e921f4bc1aabce1548a703ba98a4125380688d4b"},"adult-non-conviction-sealing-or-expungement-under-2953-33":{"questionRecordId":"Q-e0332e8dc4c98130d8d9","result":"packet_ready_with_caution","payment":true,"reason":"oh.compiled_rule_match.rule-05-grand-jury-no-bill-non-conviction-sealing-or-expungemen","seedHash":"ca3008c3eac9e0d7c633cad7dec05de77799478bc07a7d4c19f0407e619ba753"},"certain-firearm-carry-conviction-expungement-under-2953-35":{"questionRecordId":"Q-d87c7a2a4e6ba8df8a86","result":"needs_review","payment":false,"reason":"oh.waiting_rule_not_executed","seedHash":"ef7cf165e2b5760ac0e08738e5eb3030b17f0ac749cdb950d077232f6edd603c"},"human-trafficking-survivor-conviction-expungement-under-2953-36":{"questionRecordId":"Q-5d9ed4f45d2af7006e2f","result":"needs_review","payment":false,"reason":"oh.waiting_rule_not_executed","seedHash":"a33261ea1973d130f0437c67a1e09215e17ab6f01440a30307ea393057ffb03f"},"human-trafficking-survivor-non-conviction-expungement-under-2953-521":{"questionRecordId":"Q-7c86feef8f3c97e28642","result":"needs_review","payment":false,"reason":"oh.waiting_rule_not_executed","seedHash":"4c10995adcf58dc1c5c1e6f6d5d889bf74ff341d2f3f6776f4c7e56f75108737"},"marijuana-hashish-possession-expungement-under-2953-321":{"questionRecordId":"Q-463c45ad2785b6a60935","result":"needs_review","payment":false,"reason":"oh.waiting_rule_not_executed","seedHash":"8dec3b45d00d7475eb78a0329ccc35403ad2408d5ff341803398d1579febf7ee"}}},
};
for(const [state,r1] of Object.entries(r1States))for(const [route,row] of Object.entries(r1.routes)){
 cases.push({state,route,result:row.result,payment:row.payment,reason:row.reason});
 if(r1.witnesses[route])witnesses.push({pathwayKey:`${state}:${route}`,...r1.witnesses[route]});
}
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
// GA12 Q-f96c5ed3f036716c4879 / GA17 Q-ecd8c474ef5fd2388e5e: no packet consumer, not a history-arm repair.
check('OK Clean Slate: no consumer and no invented packet gate',()=>{
 const profile=getProfileByJurisdiction('OK'),route='clean-slate-automatic-expungement';
 const originalAnswers={"age_at_offense": "30", "case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Clean Slate automatic expungement", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "trafficking_status": "No"};
 assert(!history(profile,route,undefined));
 for(const delta of [{},{case_outcome:'I am not sure'},{ownership_scope:'No'},{jurisdiction_scope:'Federal'}]){
  const answers={...originalAnswers,...delta};
  const a=evaluate({jurisdiction:'OK',profileVersion:profile.profileVersion,matterId:'synthetic-ok-automatic-no-consumer',answers});
  assert.equal(a.evaluation.resultCode,delta.ownership_scope||delta.jurisdiction_scope?'hard_stop':'guidance_only');
  assert.equal(a.evaluation.paymentAllowed,false);assert.equal(a.evaluation.packetPlan,undefined);
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-21T00:00:00Z'});assert(seed);
  for(const factId of ['offense_category','record_type'])for(const map of maps)for(const raw of rawCases){
   const snapshot=structuredClone(seed.snapshot);snapshot[map][factId]=structuredClone(raw);
   const record={status:'unverified',revision:0,draftSnapshot:snapshot,draftHash:P.protectedPacketDraftHash(snapshot)};
   const before=structuredClone(record),m=P.protectedPacketInformationModelFor(record);assert(m);
   assert(!m.questions.some(q=>q.id===factId));assert(!m.missingInputIds.includes(factId));
   assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);
   assert.deepEqual(record,before);
  }
 }
 assert.equal(packetFulfillmentAuthority('OK',route,'checkout creation').allowed,false);
});
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
const ran=[];
for(const context of leg(shard[0])){
ran.push(caseKey(context));
const {state,route,result,payment,reason}=context,key=`${state}:${route}`;
const r1Row=r1States[state]?.routes[route];
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
 for(const factId of r1Row?r1States[state].separateFacts:state==='OK'?['case_outcome','offense_level','court','charge','disposition_date','sentence_completion_date','trafficking_status','pardon_status']:state==='ME'?["case_outcome", "offense_level", "court", "financial_obligations", "age_at_offense", "discharge_date", "pending_cases"]:state==='KY'?['case_outcome','offense_level','age_at_offense','release_date','pending_cases']:state==='MA'?['case_outcome','offense_level','court','sentence_completion_date','age_at_offense','financial_obligations']:state==='HI'?['case_outcome','offense_level','age_at_offense','court','hi_court_order_confirmed']:state==='LA'?['case_outcome','offense_level','court','criminal_history','financial_obligations']:[])
  assert.notEqual(resolvePacketCollection({...input,requiredInputIds:[factId]}).facts[0].source,fact.source);
 for(const other of profile.pathways.filter(p=>!cases.some(c=>c.state===state&&c.route===p.id)))assert.notEqual(resolvePacketCollection({...input,pathwayId:other.id}).facts[0].source,fact.source);
 const authority=packetFulfillmentAuthority(state,route,'checkout creation');
 assert.equal(authority.allowed,false);
 assert.equal(authority.reason,`${key}: NO_RECORD. No Grade-A fulfillment record binds ${key}; a route nobody has written a record for fails closed.`);
});
for(const [label,delta,expectedResult,expectedReason]of [
 ['refused ownership',{ownership_scope:'No'},'hard_stop',state.toLowerCase()+'.ownership_scope_hard_stop'],
 ['uncertain disposition',{case_outcome:'I am not sure'},'needs_review',state.toLowerCase()+'.source_fact_unknown'],
 ...(r1Row?[['federal refusal',{jurisdiction_scope:'Federal'},'hard_stop',state.toLowerCase()+'.federal_or_out_of_scope']]:state==='OK'?[['federal refusal',{jurisdiction_scope:'Federal'},'hard_stop','ok.federal_or_out_of_scope']]:state==='LA'?[['federal refusal',{jurisdiction_scope:'Federal'},'hard_stop','la.federal_or_out_of_scope']]:state!=='HI'?[]:route==='nonconviction-arrest-expungement'?
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
 assert.equal(seed.hash,r1Row?r1Row.seedHash:predecessorHashes[route],"actual captured predecessor draft hash unchanged");
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
// Bind the shard self-check to what the loop actually ran, not to what leg() intends.
assert.deepEqual(ran,leg(shard[0]).map(caseKey),'the case loop must run exactly this leg');
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
console.log(JSON.stringify({status:'PASS_DC_FL_PETITION_OPTIONAL_HISTORY',shard:shard.join('/'),ran,checks,httpCases,originalIds:[...Object.values(r1States).flatMap(r1=>Object.values(r1.routes).map(row=>row.questionRecordId)),"Q-1af92bac0be9e8f1d3c1", "Q-c2eae6c2aea996936af8", "Q-b2307423d9b47d9a1af7", "Q-bd410275cf3de6c271db", "Q-694560c7c95fb47ca5ac", "Q-606eea91d3a3a9d1820d", "Q-4932a2b1edb791de2454", "Q-82571d80cc42abd806af", "Q-b1d0bc75d75f9113d995", "Q-572c0c7e28831927a19a", "Q-77a18d8e1ed50ccabe51", "Q-5036cbc1e622a9444933", "Q-302b485d17fcef854e84", "Q-88799b7d454677674402", "Q-ea6b30056ceb463744bb", "Q-5abc61f83ae56e7779f7", "Q-69fdf8d958deae680d72", "Q-f96c5ed3f036716c4879", "Q-ecd8c474ef5fd2388e5e","Q-688bf057ef651e46a54b","Q-6e06a84342a41f34e1d2","Q-7ed646d227c26f9acc32","Q-0c86d50a75c852085df7","Q-f66a6b6b457285d85751","Q-8a323b249717d2c2b890","Q-fb2109e5a0379589fe4c","Q-9026faa3fca7a143a0df","Q-bf040ed86c19172840d6",'Q-f998590180601fe00713','Q-30353f219d82ca7eeb62','Q-4897a00f86c67fc5c57a','Q-4c4d60127b04b08d3f41','Q-d6c2af7ef42f979932f3','Q-50a58ca23c5c2ba26a76','Q-213a19004dbda41dfce2','Q-e7a0b9cbb9047649e8e0','Q-6b16d8ce7d8fc029c19e','Q-6add858b65f867a82b70','Q-502bf587f9925e5e6e79','Q-00caec14a5a59750b527','Q-748f73bc4bcf41923fcc','Q-6acd9d8d275e7be59682','Q-8c94453e5af32f59406d','Q-8105d5d0b28ebd1e4a67','Q-c8633872a982712e7803','Q-94c8f0620f0384854d98','Q-ab7cc6744570b24e17d4','Q-481c00319478c8236160','Q-1ee2fb0eca77febaf2b6','QD-fb5a90b4c42ab7e486c1','Q-46a17f0eb164e9cdcf27','Q-47d5c5f19e70f0fbcbec','Q-73e3915ed9d087f8b531','Q-6fce98651a27d2a3b8c6','Q-65a2e556a51d224b2917','Q-50dcf8b1a91162a70705','Q-5ec575d17ded0b87051d','Q-79e780778f4a487dd39b'],routes:cases.map(c=>c.state+':'+c.route),limits:['Existing DC/FL/GA outcomes, HI and LA screening readiness and KY unsupported/held/guidance outcomes retained; actual NO_RECORD checkout and payment refusal unchanged; no whole GA17 closure.','No database, output rendering, source change, hosted authorization or commercial delivery; draft EN/ES needs qualified review.']}));
