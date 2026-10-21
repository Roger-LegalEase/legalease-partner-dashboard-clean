import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

register('./lib/ts-esm-loader.mjs', import.meta.url);
const mutation=process.argv.find(arg=>arg.startsWith('--mutation='))?.slice(11);
const mutations={
 ok_context:["export function okCategoryAndRecordAreHistory(profile, pathwayId, specification) {", "export function okCategoryAndRecordAreHistory(profile, pathwayId, specification) { return true;"],
 ok_collection:["okCategoryHistory ||", "false ||"],
 ok_level:["factId === \"offense_category\" && !overrideClass", "(factId === \"offense_category\" || okCategoryHistory && factId === \"offense_level\") && !overrideClass"],
 ok_question:["\"ok_category_history\", \"ma_me_category_history\"", "\"disabled_ok_category_history\", \"ma_me_category_history\""],
 ok_history:["okCategoryAndRecordAreHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))", "false"],
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

 r1_context:["contactRepresentationHash(profile) === entry.profileHash", "true"],
 r1_collection:["r1CategoryHistory ||", "false ||"],
 r1_level:["factId === \"offense_category\" && !overrideClass", "(factId === \"offense_category\" || r1CategoryHistory && factId === \"offense_level\") && !overrideClass"],
 r1_question:["\"ok_category_history\", \"r1_category_history\"", "\"ok_category_history\", \"disabled_r1_category_history\""],
 r1_history:["r1CategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))", "false"],
 r1_ut_category_0:["\"path-a-automatic-clean-slate-expungement\", // GA12 Q-252e5eaceeb14868ecfd", "\"unassigned-r1-route\", // GA12 Q-252e5eaceeb14868ecfd"],
 r1_ut_category_1:["\"path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice\", // GA12 Q-fa8ce3d47b028a9a9297", "\"unassigned-r1-route\", // GA12 Q-fa8ce3d47b028a9a9297"],
 r1_ut_category_2:["\"path-c-clean-slate-eligible-convictions-and-plea-in-abeyance-dismissals\", // GA12 Q-2333bc4d3b484d36fdbc", "\"unassigned-r1-route\", // GA12 Q-2333bc4d3b484d36fdbc"],
 r1_ut_category_3:["\"path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility\", // GA12 Q-e9f3971de039d6458dcc", "\"unassigned-r1-route\", // GA12 Q-e9f3971de039d6458dcc"],
 r1_ut_category_4:["\"path-e-petition-based-non-conviction-expungement\", // GA12 Q-cf0b883c11fa0a6f2fc3", "\"unassigned-r1-route\", // GA12 Q-cf0b883c11fa0a6f2fc3"],
 r1_ut_category_5:["\"path-f-petition-based-conviction-expungement\", // GA12 Q-650fb69353356a405ac7", "\"unassigned-r1-route\", // GA12 Q-650fb69353356a405ac7"],
 r1_ut_category_6:["\"path-i-traffic-offense-expungement-or-deletion\", // GA12 Q-6f5514279e5ffa50cb3e", "\"unassigned-r1-route\", // GA12 Q-6f5514279e5ffa50cb3e"],
 r1_ut_category_7:["\"path-j-cannabis-possession-petition-without-a-bci-certificate\", // GA12 Q-313866182a1e4777029e", "\"unassigned-r1-route\", // GA12 Q-313866182a1e4777029e"],
 r1_ut_category_8:["\"path-k-pardon-based-expungement\", // GA12 Q-906056c11b74201b4da6", "\"unassigned-r1-route\", // GA12 Q-906056c11b74201b4da6"],
 r1_ut_category_9:["\"path-l-vacatur-human-trafficking-related-expungement\", // GA12 Q-d9d380005932a99444a6", "\"unassigned-r1-route\", // GA12 Q-d9d380005932a99444a6"],
 r1_ut_category_10:["\"path-m-juvenile-expungement\", // GA12 Q-2fe99c51c62078f670e8", "\"unassigned-r1-route\", // GA12 Q-2fe99c51c62078f670e8"],
 r1_pa_category_0:["\"path-a-non-conviction-expungement\", // GA12 Q-6303976ad4b8ae1e924f", "\"unassigned-r1-route\", // GA12 Q-6303976ad4b8ae1e924f"],
 r1_pa_category_1:["\"path-b-complete-acquittal-not-guilty-expungement\", // GA12 Q-bbf51562519786068cc5", "\"unassigned-r1-route\", // GA12 Q-bbf51562519786068cc5"],
 r1_pa_category_2:["\"path-c-summary-conviction-expungement\", // GA12 Q-ebfada9e873528bccd38", "\"unassigned-r1-route\", // GA12 Q-ebfada9e873528bccd38"],
 r1_pa_category_3:["\"path-d-ard-expungement\", // GA12 Q-f82ac89b0b9cd5a6f0b0", "\"unassigned-r1-route\", // GA12 Q-f82ac89b0b9cd5a6f0b0"],
 r1_pa_category_4:["\"path-e-age-70-expungement\", // GA12 Q-ad80963961e658f9a1e4", "\"unassigned-r1-route\", // GA12 Q-ad80963961e658f9a1e4"],
 r1_pa_category_5:["\"path-f-deceased-person-expungement\", // GA12 Q-a106d2f89ee5932928db", "\"unassigned-r1-route\", // GA12 Q-a106d2f89ee5932928db"],
 r1_pa_category_6:["\"path-g-underage-drinking-conviction-expungement\", // GA12 Q-7f0b7762d5aeefdbac2b", "\"unassigned-r1-route\", // GA12 Q-7f0b7762d5aeefdbac2b"],
 r1_pa_category_7:["\"path-h-pardon-based-expungement\", // GA12 Q-7731018f38b0d5c7398e", "\"unassigned-r1-route\", // GA12 Q-7731018f38b0d5c7398e"],
 r1_pa_category_8:["\"path-i-petition-for-limited-access\", // GA12 Q-bcbdcf2105073c71d90d", "\"unassigned-r1-route\", // GA12 Q-bcbdcf2105073c71d90d"],
 r1_pa_category_9:["\"path-j-clean-slate-automatic-limited-access\", // GA12 Q-3b3c3e699bffa01de277", "\"unassigned-r1-route\", // GA12 Q-3b3c3e699bffa01de277"],
 r1_pa_category_10:["\"path-k-human-trafficking-vacatur-expungement\", // GA12 Q-d4df0578591f1bba6c6c", "\"unassigned-r1-route\", // GA12 Q-d4df0578591f1bba6c6c"],
 r1_la_category_0:["\"felony-article-893-e-set-aside-followed-by-expungement\", // GA12 Q-b30729ed956e8d23062e", "\"unassigned-r1-route\", // GA12 Q-b30729ed956e8d23062e"],
 r1_la_category_1:["\"felony-ten-year-clean-period-expungement\", // GA12 Q-b233741a48310919da10", "\"unassigned-r1-route\", // GA12 Q-b233741a48310919da10"],
 r1_la_category_2:["\"first-offender-pardon-felony-expungement\", // GA12 Q-a2228520d97dcc903ff3", "\"unassigned-r1-route\", // GA12 Q-a2228520d97dcc903ff3"],
 r1_la_category_3:["\"first-offense-marijuana-expungement-after-90-days-art-998\", // GA12 Q-028a5d4a6e578c29a060", "\"unassigned-r1-route\", // GA12 Q-028a5d4a6e578c29a060"],
 r1_la_category_4:["\"human-trafficking-survivor-expungement-fee-exempt-route\", // GA12 Q-1f0e7d0488d670e692cd", "\"unassigned-r1-route\", // GA12 Q-1f0e7d0488d670e692cd"],
 r1_la_category_5:["\"immediate-expungement-after-successful-court-program-completion-art-985-3\", // GA12 Q-22065414a244c656a67f", "\"unassigned-r1-route\", // GA12 Q-22065414a244c656a67f"],
 r1_la_category_6:["\"interim-expungement-of-a-felony-arrest-reduced-to-a-misdemeanor-conviction\", // GA12 Q-7500ec895a5603e69c15", "\"unassigned-r1-route\", // GA12 Q-7500ec895a5603e69c15"],
 r1_la_category_7:["\"misdemeanor-article-894-b-set-aside-followed-by-expungement\", // GA12 Q-c2f2a4248850b31ea8ca", "\"unassigned-r1-route\", // GA12 Q-c2f2a4248850b31ea8ca"],
 r1_la_category_8:["\"misdemeanor-five-year-clean-period-expungement\", // GA12 Q-8063c22833109ea3d94e", "\"unassigned-r1-route\", // GA12 Q-8063c22833109ea3d94e"],
 r1_tx_category_0:["\"automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07\", // GA12 Q-97bc2a5f998b912adda8", "\"unassigned-r1-route\", // GA12 Q-97bc2a5f998b912adda8"],
 r1_tx_category_1:["\"expunction-after-pardon-or-actual-innocence-relief\", // GA12 Q-ece677b818ab583b0a14", "\"unassigned-r1-route\", // GA12 Q-ece677b818ab583b0a14"],
 r1_tx_category_2:["\"expunction-for-arrest-with-no-charge-filed-after-the-limitations-period\", // GA12 Q-b8b91c5dff89cb0adb64", "\"unassigned-r1-route\", // GA12 Q-b8b91c5dff89cb0adb64"],
 r1_tx_category_3:["\"first-offense-dwi-nondisclosure\", // GA12 Q-7b044f8b2d70a8798aca", "\"unassigned-r1-route\", // GA12 Q-7b044f8b2d70a8798aca"],
 r1_tx_category_4:["\"petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725\", // GA12 Q-ecdc2323b7eb7e9089ba", "\"unassigned-r1-route\", // GA12 Q-ecdc2323b7eb7e9089ba"],
 r1_tx_category_5:["\"petitioned-nondisclosure-for-an-eligible-conviction-411-0735\", // GA12 Q-2e0fbd26cd239ff0d6e4", "\"unassigned-r1-route\", // GA12 Q-2e0fbd26cd239ff0d6e4"],
 r1_ne_category_0:["\"automatic-nonconviction-sealing\", // GA12 Q-4a545ab85a94be27c95b", "\"unassigned-r1-route\", // GA12 Q-4a545ab85a94be27c95b"],
 r1_ne_category_1:["\"juvenile-automatic-sealing\", // GA12 Q-7d6e2953ebba7db1eb72", "\"unassigned-r1-route\", // GA12 Q-7d6e2953ebba7db1eb72"],
 r1_ne_category_2:["\"juvenile-petition-backstop\", // GA12 Q-d75d629d50ebb8c87426", "\"unassigned-r1-route\", // GA12 Q-d75d629d50ebb8c87426"],
 r1_ne_category_3:["\"law-enforcement-error-expungement\", // GA12 Q-5032ace2532c76a61e7c", "\"unassigned-r1-route\", // GA12 Q-5032ace2532c76a61e7c"],
 r1_ne_category_4:["\"pardon-then-seal\", // GA12 Q-f90e4e8ab93ba8a7096e", "\"unassigned-r1-route\", // GA12 Q-f90e4e8ab93ba8a7096e"],
 r1_ne_category_5:["\"set-aside-incarceration-one-year-or-less\", // GA12 Q-17df472e8ea9aa127584", "\"unassigned-r1-route\", // GA12 Q-17df472e8ea9aa127584"],
 r1_ne_category_6:["\"set-aside-probation-fine-community-service\", // GA12 Q-eea669c83c89361f4041", "\"unassigned-r1-route\", // GA12 Q-eea669c83c89361f4041"],
 r1_ne_category_7:["\"trafficking-survivor-set-aside-and-seal\", // GA12 Q-1fd3143f4dbee8014955", "\"unassigned-r1-route\", // GA12 Q-1fd3143f4dbee8014955"],
 r1_ri_category_0:["\"path-a-first-offender-conviction-expungement\", // GA12 Q-50cca60f5c7926124ba7", "\"unassigned-r1-route\", // GA12 Q-50cca60f5c7926124ba7"],
 r1_ri_category_1:["\"path-b-multiple-misdemeanor-expungement\", // GA12 Q-cb04a7aa485b8e2b72d8", "\"unassigned-r1-route\", // GA12 Q-cb04a7aa485b8e2b72d8"],
 r1_ri_category_2:["\"path-c-deferred-sentence-expungement\", // GA12 Q-953071a0940638aa4080", "\"unassigned-r1-route\", // GA12 Q-953071a0940638aa4080"],
 r1_ri_category_3:["\"path-d-non-conviction-sealing-expungement\", // GA12 Q-f267c2dff27842604000", "\"unassigned-r1-route\", // GA12 Q-f267c2dff27842604000"],
 r1_ri_category_4:["\"path-e-filed-complaint-relief-under-12-10-12\", // GA12 Q-4eb0e509dabbd52d3833", "\"unassigned-r1-route\", // GA12 Q-4eb0e509dabbd52d3833"],
 r1_ri_category_5:["\"path-f-marijuana-possession-expungement\", // GA12 Q-6ee35861d87c035055aa", "\"unassigned-r1-route\", // GA12 Q-6ee35861d87c035055aa"],
 r1_ri_category_6:["\"path-g-decriminalized-offense-expungement\", // GA12 Q-6657da2a38a7cc5786a2", "\"unassigned-r1-route\", // GA12 Q-6657da2a38a7cc5786a2"],
 r1_ri_category_7:["\"path-h-commercial-sexual-activity-related-expungement\", // GA12 Q-882f1028ec5db3a1c041", "\"unassigned-r1-route\", // GA12 Q-882f1028ec5db3a1c041"],
 r1_vt_category_0:["\"adult-conviction-expungement-narrow-statutory-route\", // GA12 Q-08b43436b06a0f4e805b", "\"unassigned-r1-route\", // GA12 Q-08b43436b06a0f4e805b"],
 r1_vt_category_1:["\"adult-felony-conviction-sealing\", // GA12 Q-8d42db81cba3d83cdfc8", "\"unassigned-r1-route\", // GA12 Q-8d42db81cba3d83cdfc8"],
 r1_vt_category_2:["\"adult-misdemeanor-conviction-sealing\", // GA12 Q-547a6af68b039d5a2147", "\"unassigned-r1-route\", // GA12 Q-547a6af68b039d5a2147"],
 r1_vt_category_3:["\"dui-sealing\", // GA12 Q-327fabab0a5a937c065b", "\"unassigned-r1-route\", // GA12 Q-327fabab0a5a937c065b"],
 r1_vt_category_4:["\"juvenile-sealing\", // GA12 Q-43f2d3e844b38b09b29d", "\"unassigned-r1-route\", // GA12 Q-43f2d3e844b38b09b29d"],
 r1_vt_category_5:["\"non-conviction-sealing\", // GA12 Q-91a7d389265ef74bef51", "\"unassigned-r1-route\", // GA12 Q-91a7d389265ef74bef51"],
 r1_vt_category_6:["\"offense-before-age-25-sealing-under-33-v-s-a-5119-g\", // GA12 Q-f1e29e900cf226e0d754", "\"unassigned-r1-route\", // GA12 Q-f1e29e900cf226e0d754"],
 r1_vt_category_7:["\"young-adult-sealing-for-offenses-committed-at-ages-18-21\", // GA12 Q-66970ef1355d84b71232", "\"unassigned-r1-route\", // GA12 Q-66970ef1355d84b71232"],
 r1_il_category_0:["\"adult-conviction-sealing\", // GA12 Q-5694f465c734a658c0e0", "\"unassigned-r1-route\", // GA12 Q-5694f465c734a658c0e0"],
 r1_il_category_1:["\"adult-non-conviction-expungement\", // GA12 Q-1dd94e9fab0cba0e0454", "\"unassigned-r1-route\", // GA12 Q-1dd94e9fab0cba0e0454"],
 r1_il_category_2:["\"cannabis-specific-automatic-or-petition-expungement\", // GA12 Q-59face7f29c93d412462", "\"unassigned-r1-route\", // GA12 Q-59face7f29c93d412462"],
 r1_il_category_3:["\"clean-slate-automatic-sealing\", // GA12 Q-59f40e6c5a862593cb34", "\"unassigned-r1-route\", // GA12 Q-59f40e6c5a862593cb34"],
 r1_il_category_4:["\"expungement-after-eligible-supervision-or-qualified-probation\", // GA12 Q-e875b077b30fe51dbdf1", "\"unassigned-r1-route\", // GA12 Q-e875b077b30fe51dbdf1"],
 r1_il_category_5:["\"human-trafficking-survivor-vacatur-and-expungement\", // GA12 Q-c7f7280000e453756a1d", "\"unassigned-r1-route\", // GA12 Q-c7f7280000e453756a1d"],
 r1_il_category_6:["\"juvenile-automatic-or-petition-expungement\", // GA12 Q-bd7baa2e2c96bc9547a0", "\"unassigned-r1-route\", // GA12 Q-bd7baa2e2c96bc9547a0"],
 r1_nv_category_0:["\"controlled-substance-possession-sealing-under-nrs-453-3365\", // GA12 Q-c5b04053ad25b6bdc48e", "\"unassigned-r1-route\", // GA12 Q-c5b04053ad25b6bdc48e"],
 r1_nv_category_1:["\"deferred-judgment-dismissal-and-sealing-under-nrs-176-211\", // GA12 Q-d37e8d6c0c587f910f10", "\"unassigned-r1-route\", // GA12 Q-d37e8d6c0c587f910f10"],
 r1_nv_category_2:["\"general-conviction-record-sealing-under-nrs-179-245\", // GA12 Q-f64352d6d095968af4a5", "\"unassigned-r1-route\", // GA12 Q-f64352d6d095968af4a5"],
 r1_nv_category_3:["\"non-conviction-record-sealing\", // GA12 Q-649e80666a379d07874e", "\"unassigned-r1-route\", // GA12 Q-649e80666a379d07874e"],
 r1_nv_category_4:["\"reentry-program-sealing-under-nrs-179-259\", // GA12 Q-21a4729656d009a44472", "\"unassigned-r1-route\", // GA12 Q-21a4729656d009a44472"],
 r1_nv_category_5:["\"removal-of-a-record-from-the-central-repository-after-a-favourable-disposition-under-179a-160\", // GA12 Q-f23bb2e343320420f6d4", "\"unassigned-r1-route\", // GA12 Q-f23bb2e343320420f6d4"],
 r1_nv_category_6:["\"trafficking-victim-vacatur-and-sealing-under-nrs-179-247\", // GA12 Q-79bc94877bba645c5ce8", "\"unassigned-r1-route\", // GA12 Q-79bc94877bba645c5ce8"],
 r1_oh_category_0:["\"adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32\", // GA12 Q-789e93d63ae1e416ca52", "\"unassigned-r1-route\", // GA12 Q-789e93d63ae1e416ca52"],
 r1_oh_category_1:["\"adult-non-conviction-sealing-or-expungement-under-2953-33\", // GA12 Q-765489a449327996fbe9", "\"unassigned-r1-route\", // GA12 Q-765489a449327996fbe9"],
 r1_oh_category_2:["\"certain-firearm-carry-conviction-expungement-under-2953-35\", // GA12 Q-bb5520a0a7519366f9e1", "\"unassigned-r1-route\", // GA12 Q-bb5520a0a7519366f9e1"],
 r1_oh_category_3:["\"human-trafficking-survivor-conviction-expungement-under-2953-36\", // GA12 Q-2e36d0b5c1a1925c7c98", "\"unassigned-r1-route\", // GA12 Q-2e36d0b5c1a1925c7c98"],
 r1_oh_category_4:["\"human-trafficking-survivor-non-conviction-expungement-under-2953-521\", // GA12 Q-daf300450ee87dd55597", "\"unassigned-r1-route\", // GA12 Q-daf300450ee87dd55597"],
 r1_oh_category_5:["\"marijuana-hashish-possession-expungement-under-2953-321\", // GA12 Q-99864a8cfd6d49f59819", "\"unassigned-r1-route\", // GA12 Q-99864a8cfd6d49f59819"],
 r1_sc_category_0:["\"diversion-or-program-completion-expungement\", // GA12 Q-3628876a599f755ccb08", "\"unassigned-r1-route\", // GA12 Q-3628876a599f755ccb08"],
 r1_sc_category_1:["\"eligible-conviction-expungement\", // GA12 Q-a01dc251d4bc64a25e86", "\"unassigned-r1-route\", // GA12 Q-a01dc251d4bc64a25e86"],
 r1_sc_category_2:["\"general-sessions-non-conviction-expungement\", // GA12 Q-1e95aceea3b46b97ce1b", "\"unassigned-r1-route\", // GA12 Q-1e95aceea3b46b97ce1b"],
 r1_sc_category_3:["\"human-trafficking-survivor-expungement\", // GA12 Q-4e381f7c25da41b693e3", "\"unassigned-r1-route\", // GA12 Q-4e381f7c25da41b693e3"],
 r1_sc_category_4:["\"juvenile-expungement\", // GA12 Q-66245d5d32703c1edee8", "\"unassigned-r1-route\", // GA12 Q-66245d5d32703c1edee8"],
 r1_sc_category_5:["\"pardon-guidance-for-otherwise-ineligible-convictions\", // GA12 Q-732e7580dcb62e76f411", "\"unassigned-r1-route\", // GA12 Q-732e7580dcb62e76f411"],
 r1_sc_category_6:["\"summary-court-non-conviction-expungement\", // GA12 Q-599b985661fec0558c4b", "\"unassigned-r1-route\", // GA12 Q-599b985661fec0558c4b"],
 r1_sd_category_0:["\"adult-arrest-record-expungement-under-sdcl-23a-3-27\", // GA12 Q-e3265ba918c0807bc1d4", "\"unassigned-r1-route\", // GA12 Q-e3265ba918c0807bc1d4"],
 r1_sd_category_1:["\"automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases\", // GA12 Q-0dd3d4a648d6ab2cace7", "\"unassigned-r1-route\", // GA12 Q-0dd3d4a648d6ab2cace7"],
 r1_sd_category_2:["\"controlled-substance-deferred-disposition-route\", // GA12 Q-6ff783980d482acdedd8", "\"unassigned-r1-route\", // GA12 Q-6ff783980d482acdedd8"],
 r1_sd_category_3:["\"diversion-expungement\", // GA12 Q-8283a2d886845701d5c8", "\"unassigned-r1-route\", // GA12 Q-8283a2d886845701d5c8"],
 r1_sd_category_4:["\"juvenile-delinquency-sealing\", // GA12 Q-0fbe5c9baccd5dfb2743", "\"unassigned-r1-route\", // GA12 Q-0fbe5c9baccd5dfb2743"],
 r1_sd_category_5:["\"juvenile-trafficking-expungement\", // GA12 Q-544a83f317e6925639ae", "\"unassigned-r1-route\", // GA12 Q-544a83f317e6925639ae"],
 r1_sd_category_6:["\"pardon-based-sealing\", // GA12 Q-0f015c8e313a541231b9", "\"unassigned-r1-route\", // GA12 Q-0f015c8e313a541231b9"],
 r1_wa_category_0:["\"adult-felony-vacation-under-rcw-9-94a-640\", // GA12 Q-3b110b6ae08bd64d6bf3", "\"unassigned-r1-route\", // GA12 Q-3b110b6ae08bd64d6bf3"],
 r1_wa_category_1:["\"adult-misdemeanor-gross-misdemeanor-vacation-under-rcw-9-96-060\", // GA12 Q-10152501470126ecc07d", "\"unassigned-r1-route\", // GA12 Q-10152501470126ecc07d"],
 r1_wa_category_2:["\"blake-drug-possession-vacation-and-refund-route\", // GA12 Q-adb77e291db09ef1d5d2", "\"unassigned-r1-route\", // GA12 Q-adb77e291db09ef1d5d2"],
 r1_wa_category_3:["\"juvenile-record-sealing-under-rcw-13-50-260\", // GA12 Q-f58e57c144f081be3514", "\"unassigned-r1-route\", // GA12 Q-f58e57c144f081be3514"],
 r1_wa_category_4:["\"misdemeanor-cannabis-conviction-vacation\", // GA12 Q-4adaa2604fd09aa8f9b5", "\"unassigned-r1-route\", // GA12 Q-4adaa2604fd09aa8f9b5"],
 r1_wa_category_5:["\"non-conviction-record-deletion-under-rcw-10-97-060\", // GA12 Q-9b41697713dead823c63", "\"unassigned-r1-route\", // GA12 Q-9b41697713dead823c63"],
 r1_wa_category_6:["\"victim-survivor-conviction-vacation-route\", // GA12 Q-90c7165ec4b0da2c49d5", "\"unassigned-r1-route\", // GA12 Q-90c7165ec4b0da2c49d5"],
 r1_wv_category_0:["\"accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a\", // GA12 Q-cf92b9ddf3aa29535066", "\"unassigned-r1-route\", // GA12 Q-cf92b9ddf3aa29535066"],
 r1_wv_category_1:["\"first-offense-drug-possession-conditional-discharge-relief\", // GA12 Q-e09c22572076696b75e9", "\"unassigned-r1-route\", // GA12 Q-e09c22572076696b75e9"],
 r1_wv_category_2:["\"juvenile-record-relief\", // GA12 Q-8b168b02120d28ec1967", "\"unassigned-r1-route\", // GA12 Q-8b168b02120d28ec1967"],
 r1_wv_category_3:["\"no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication\", // GA12 Q-4788db0474a27ceae315", "\"unassigned-r1-route\", // GA12 Q-4788db0474a27ceae315"],
 r1_wv_category_4:["\"pardon-based-expungement\", // GA12 Q-438edd691f440307e9c6", "\"unassigned-r1-route\", // GA12 Q-438edd691f440307e9c6"],
 r1_wv_category_5:["\"sex-trafficking-victim-vacatur-and-expungement\", // GA12 Q-766aea3d3342bf31ebfe", "\"unassigned-r1-route\", // GA12 Q-766aea3d3342bf31ebfe"],
 r1_md_category_0:["\"adult-non-conviction-expungement-under-crim-proc-10-105\", // GA12 Q-1ac39767ebd38f67205f", "\"unassigned-r1-route\", // GA12 Q-1ac39767ebd38f67205f"],
 r1_md_category_1:["\"automatic-expungement-under-crim-proc-10-105-1\", // GA12 Q-8bceb546e5c92b856e55", "\"unassigned-r1-route\", // GA12 Q-8bceb546e5c92b856e55"],
 r1_md_category_2:["\"cannabis-specific-expungement\", // GA12 Q-1bfea6abba26156d604b", "\"unassigned-r1-route\", // GA12 Q-1bfea6abba26156d604b"],
 r1_md_category_3:["\"eligible-conviction-expungement-under-crim-proc-10-110\", // GA12 Q-490cfd616dd97bfc8df2", "\"unassigned-r1-route\", // GA12 Q-490cfd616dd97bfc8df2"],
 r1_md_category_4:["\"second-chance-act-shielding\", // GA12 Q-2366ddaaf367add0a243", "\"unassigned-r1-route\", // GA12 Q-2366ddaaf367add0a243"],
 r1_mn_category_0:["\"arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11\", // GA12 Q-0428789b04a87e050967", "\"unassigned-r1-route\", // GA12 Q-0428789b04a87e050967"],
 r1_mn_category_1:["\"automatic-clean-slate-expungement-under-609a-015\", // GA12 Q-3767c02a7587f8046157", "\"unassigned-r1-route\", // GA12 Q-3767c02a7587f8046157"],
 r1_mn_category_2:["\"automatic-mistaken-identity-expungement-under-609a-017\", // GA12 Q-f23035e3845a362b111f", "\"unassigned-r1-route\", // GA12 Q-f23035e3845a362b111f"],
 r1_mn_category_3:["\"cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06\", // GA12 Q-5578048f10653c4f1989", "\"unassigned-r1-route\", // GA12 Q-5578048f10653c4f1989"],
 r1_mn_category_4:["\"petition-based-expungement-under-609a-02-03\", // GA12 Q-522adeef09ebd5543747", "\"unassigned-r1-route\", // GA12 Q-522adeef09ebd5543747"],
 r1_mn_category_5:["\"prosecutor-agreed-sealing-without-a-full-petition-under-609a-025\", // GA12 Q-afb8d1d88357accba349", "\"unassigned-r1-route\", // GA12 Q-afb8d1d88357accba349"],
 r1_nh_category_0:["\"annulment-after-dismissal-acquittal-or-nonprosecution\", // GA12 Q-10e00b3dc3d3a2d6e6bf", "\"unassigned-r1-route\", // GA12 Q-10e00b3dc3d3a2d6e6bf"],
 r1_nh_category_1:["\"annulment-of-a-vacated-conviction\", // GA12 Q-55c5c19af69a1a529308", "\"unassigned-r1-route\", // GA12 Q-55c5c19af69a1a529308"],
 r1_nh_category_2:["\"conviction-annulment-under-rsa-651-5\", // GA12 Q-1a87b0c3031a018211ec", "\"unassigned-r1-route\", // GA12 Q-1a87b0c3031a018211ec"],
 r1_nh_category_3:["\"dwi-dui-annulment\", // GA12 Q-c357f9bda99fc69890dd", "\"unassigned-r1-route\", // GA12 Q-c357f9bda99fc69890dd"],
 r1_nh_category_4:["\"marijuana-possession-annulment-under-rsa-651-5-b\", // GA12 Q-4a033a26b88ca399c1b7", "\"unassigned-r1-route\", // GA12 Q-4a033a26b88ca399c1b7"],
 r1_nh_category_5:["\"out-of-state-federal-or-military-record-guidance\", // GA12 Q-f1b376edb928d6bb9bb7", "\"unassigned-r1-route\", // GA12 Q-f1b376edb928d6bb9bb7"],
 r1_mt_category_0:["\"doj-record-removal-update-request\", // GA12 Q-c3d85e5a096e9c1c35d6", "\"unassigned-r1-route\", // GA12 Q-c3d85e5a096e9c1c35d6"],
 r1_mt_category_1:["\"marijuana-related-redesignation-expungement-under-mmrta\", // GA12 Q-7766060fdc5de774fcb8", "\"unassigned-r1-route\", // GA12 Q-7766060fdc5de774fcb8"],
 r1_mt_category_2:["\"misdemeanor-conviction-expungement-under-mont-code-46-18-1104\", // GA12 Q-aa23f3177f750603d156", "\"unassigned-r1-route\", // GA12 Q-aa23f3177f750603d156"],
 r1_mt_category_3:["\"non-conviction-criminal-history-removal-through-criss\", // GA12 Q-844547836228a5b71b3b", "\"unassigned-r1-route\", // GA12 Q-844547836228a5b71b3b"],
// r1 route mutants

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
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`import {writeSync} from 'node:fs';let d;export function initialize(x){d=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith(d[2])){if(!r.source.includes(d[0]))throw Error('mutation target absent');writeSync(2,JSON.stringify({appliedMutation:d[3]})+'\\n');return {...r,source:r.source.replace(d[0],d[1])}}return r}`),{data:[...mutations[mutation],["ok_context", "ok_collection", "ok_level", "ok_route_0", "ok_route_1", "ok_route_2", "ok_route_3", "ok_route_4", "ok_route_5", "ok_route_6", "ok_route_7", "ok_route_8", "ok_route_9", "ok_route_10", "ok_route_11", "ok_route_12", "ok_route_13", "ok_route_14", "ok_route_15", "ok_route_16",'mame_context','mame_collection','mame_level','mame_route_0','mame_route_1','mame_route_2','ma_next_context','ma_next_collection','ma_next_level','ma_next_route_0','ma_next_route_1','ma_next_route_2','ma_context','ma_collection','ma_level','ma_route_0','ma_route_1','ma_route_2','la_context','la_collection','la_level','la_route_0','la_route_1','la_route_2','ky_context','ky_collection','ky_level','ky_route_0','ky_route_1','ky_route_2','hi_context','hi_collection','hi_level','hi_dui','hi_drug','ia_context','ia_collection','ia_level','collection','context','ownership'].includes(mutation)||/^r1_(context|collection|level|record_arm)$|^r1_[a-z]{2}_(category|record)_\d+$/.test(mutation)?'/packet-collection.ts':'/packet-information.ts',mutation]});}
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {packetFulfillmentAuthority}=await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {createConsumerPaymentPlaceholder}=await import('../src/lib/expungement-ai/payment-adapter.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { r1CategoryIsHistory, okCategoryAndRecordAreHistory, maMeCategoryIsHistory, maAdditionalCategoryIsHistory, maThreeRouteCategoryIsHistory, laThreeRouteCategoryIsHistory, kyThreeRouteCategoryIsHistory, alThreeRouteCategoryIsHistory, hiThreeRouteCategoryIsHistory, iaCategoryIsHistory, resolvePacketCollection } = await import('../src/lib/expungement-ai/packet-collection.ts');

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
// GA12 OK: original source-bound associations; existing cases stay intact.
cases.push(...[
  [
    "Q-7c344b62b8005b8c0856",
    "acquittal-dismissal-or-other-no-conviction-expungement",
    "OK"
  ],
  [
    "Q-64ac71408f9198d6c6bb",
    "arrest-with-no-charges-filed",
    "OK"
  ],
  [
    "Q-44758205328791de54b2",
    "conviction-reversed-and-case-dismissed",
    "OK"
  ],
  [
    "Q-c7f7c05e9424141d43d5",
    "deferred-sentence-court-record-expungement-under-991-c",
    "OK"
  ],
  [
    "Q-3e40c600977518a9ad95",
    "dna-factual-innocence-expungement",
    "OK"
  ],
  [
    "Q-d3ad0203b6c3121ae86e",
    "felony-reclassified-as-a-misdemeanor",
    "OK"
  ],
  [
    "Q-5733847ce93786556162",
    "fine-only-misdemeanor-conviction-expungement",
    "OK"
  ],
  [
    "Q-c54f700a248b3499c184",
    "human-trafficking-survivor-relief",
    "OK"
  ],
  [
    "Q-ef76f429778c93c43b10",
    "juvenile-record-expungement",
    "OK"
  ],
  [
    "Q-bdf0e7619ddfad13d1b8",
    "misdemeanor-deferred-dismissal-expungement",
    "OK"
  ],
  [
    "Q-41b39b9d0aa40bacd744",
    "nonviolent-felony-deferred-dismissal-expungement",
    "OK"
  ],
  [
    "Q-7e9846761b731ed1bd35",
    "not-more-than-two-eligible-felony-convictions-expungement",
    "OK"
  ],
  [
    "Q-1b4a5930987a37b89ca1",
    "one-eligible-nonviolent-felony-conviction-expungement",
    "OK"
  ],
  [
    "Q-c0893100ce168c61ea41",
    "other-eligible-misdemeanor-conviction-expungement",
    "OK"
  ],
  [
    "Q-fba22f7979e46d7aa914",
    "pardon-based-expungement",
    "OK"
  ],
  [
    "Q-d61d0fbc71aad09c6bb0",
    "up-to-two-felony-deferred-dismissal-expungement",
    "OK"
  ],
  [
    "Q-cf5ae343b7ff13b09400",
    "victim-protective-order-record-relief",
    "OK"
  ]
]);
const okExpectations = {
  "acquittal-dismissal-or-other-no-conviction-expungement": {
    "resultCode": "needs_review",
    "reason": "ok.waiting_rule_not_executed",
    "sourceFormIds": []
  },
  "arrest-with-no-charges-filed": {
    "resultCode": "guidance_only",
    "reason": "ok.guidance_only_no_user_filed_court_petition",
    "sourceFormIds": []
  },
  "conviction-reversed-and-case-dismissed": {
    "resultCode": "guidance_only",
    "reason": "ok.guidance_only_no_user_filed_court_petition",
    "sourceFormIds": []
  },
  "deferred-sentence-court-record-expungement-under-991-c": {
    "resultCode": "guidance_only",
    "reason": "ok.guidance_only_no_user_filed_court_petition",
    "sourceFormIds": []
  },
  "dna-factual-innocence-expungement": {
    "resultCode": "guidance_only",
    "reason": "ok.guidance_only_no_user_filed_court_petition",
    "sourceFormIds": []
  },
  "felony-reclassified-as-a-misdemeanor": {
    "resultCode": "guidance_only",
    "reason": "ok.guidance_only_no_user_filed_court_petition",
    "sourceFormIds": []
  },
  "fine-only-misdemeanor-conviction-expungement": {
    "resultCode": "guidance_only",
    "reason": "ok.guidance_only_no_user_filed_court_petition",
    "sourceFormIds": []
  },
  "human-trafficking-survivor-relief": {
    "resultCode": "needs_review",
    "reason": "ok.waiting_rule_not_executed",
    "sourceFormIds": []
  },
  "juvenile-record-expungement": {
    "resultCode": "needs_review",
    "reason": "ok.waiting_rule_not_executed",
    "sourceFormIds": []
  },
  "misdemeanor-deferred-dismissal-expungement": {
    "resultCode": "guidance_only",
    "reason": "ok.guidance_only_no_user_filed_court_petition",
    "sourceFormIds": []
  },
  "nonviolent-felony-deferred-dismissal-expungement": {
    "resultCode": "guidance_only",
    "reason": "ok.guidance_only_no_user_filed_court_petition",
    "sourceFormIds": []
  },
  "not-more-than-two-eligible-felony-convictions-expungement": {
    "resultCode": "guidance_only",
    "reason": "ok.guidance_only_no_user_filed_court_petition",
    "sourceFormIds": []
  },
  "one-eligible-nonviolent-felony-conviction-expungement": {
    "resultCode": "guidance_only",
    "reason": "ok.guidance_only_no_user_filed_court_petition",
    "sourceFormIds": []
  },
  "other-eligible-misdemeanor-conviction-expungement": {
    "resultCode": "guidance_only",
    "reason": "ok.guidance_only_no_user_filed_court_petition",
    "sourceFormIds": []
  },
  "pardon-based-expungement": {
    "resultCode": "needs_review",
    "reason": "ok.waiting_rule_not_executed",
    "sourceFormIds": []
  },
  "up-to-two-felony-deferred-dismissal-expungement": {
    "resultCode": "needs_review",
    "reason": "ok.waiting_rule_not_executed",
    "sourceFormIds": [
      "OK:LegalEase Oklahoma/Oklahoma Statutes \u00a722-18a (2025) - Petition to Expunge Records and Order to Expunge Records. : 2025.html:edada8618ef060157182f4d819abc46400e74687f6b2fd6e936204fe213a0f6a"
    ]
  },
  "victim-protective-order-record-relief": {
    "resultCode": "guidance_only",
    "reason": "ok.guidance_only_no_user_filed_court_petition",
    "sourceFormIds": []
  }
};
const fixtures=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
// GA12 R1 table states: original associations; expectations and synthetic witnesses (no public witness) measured at the base.
const r1States = {
  UT: {"reason": "Earlier Utah categories remain optional literal history. Offense-type facts are asked through separate answers, including the charge-and-statute, offense-class, domestic-violence/assault/sex-related and traffic-rule answers; a category is not evaluated as one, and the route's existing result and payment decision are unchanged.", "witnesses": {"path-a-automatic-clean-slate-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Misdemeanor conviction", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path A — Automatic Clean Slate expungement", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Acquitted or found not guilty", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path B — Automatic expungement after acquittal or dismissal with prejudice", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "path-c-clean-slate-eligible-convictions-and-plea-in-abeyance-dismissals": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path C — Clean Slate eligible convictions and plea-in-abeyance dismissals", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "path-k-pardon-based-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Misdemeanor conviction", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path K — Pardon-based expungement", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}}, "routes": {"path-a-automatic-clean-slate-expungement": {"questionRecordId": "Q-252e5eaceeb14868ecfd", "resultCode": "guidance_only", "reason": "ut.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice": {"questionRecordId": "Q-fa8ce3d47b028a9a9297", "resultCode": "guidance_only", "reason": "ut.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "path-c-clean-slate-eligible-convictions-and-plea-in-abeyance-dismissals": {"questionRecordId": "Q-2333bc4d3b484d36fdbc", "resultCode": "guidance_only", "reason": "ut.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility": {"questionRecordId": "Q-e9f3971de039d6458dcc", "resultCode": "needs_review", "reason": "ut.waiting_rule_not_executed", "sourceFormIds": ["UT:LegalEase Utah/expungements.html:37976f3be7bc8f4201da211d5b61f932a6a7ea13cc575169188d9b79723e2008"], "offenseLevelRequired": true}, "path-e-petition-based-non-conviction-expungement": {"questionRecordId": "Q-cf0b883c11fa0a6f2fc3", "resultCode": "needs_review", "reason": "ut.waiting_rule_not_executed", "sourceFormIds": ["UT:LegalEase Utah/expungements.html:37976f3be7bc8f4201da211d5b61f932a6a7ea13cc575169188d9b79723e2008"], "offenseLevelRequired": true}, "path-f-petition-based-conviction-expungement": {"questionRecordId": "Q-650fb69353356a405ac7", "resultCode": "guidance_only", "reason": "ut.guidance_only_no_user_filed_court_petition", "sourceFormIds": ["UT:LegalEase Utah/expungements.html:37976f3be7bc8f4201da211d5b61f932a6a7ea13cc575169188d9b79723e2008"], "offenseLevelRequired": true}, "path-i-traffic-offense-expungement-or-deletion": {"questionRecordId": "Q-6f5514279e5ffa50cb3e", "resultCode": "packet_ready_with_caution", "reason": "ut.compiled_rule_match.route-path-i-traffic-offense-expungement-or-deletion", "sourceFormIds": ["UT:LegalEase Utah/expungements.html:37976f3be7bc8f4201da211d5b61f932a6a7ea13cc575169188d9b79723e2008"], "offenseLevelRequired": true}, "path-j-cannabis-possession-petition-without-a-bci-certificate": {"questionRecordId": "Q-313866182a1e4777029e", "resultCode": "guidance_only", "reason": "ut.guidance_only_no_user_filed_court_petition", "sourceFormIds": ["UT:LegalEase Utah/expungements.html:37976f3be7bc8f4201da211d5b61f932a6a7ea13cc575169188d9b79723e2008", "UT:LegalEase Utah/1023EX_Order_Cannabis_Conviction.pdf:24868a504130440532dd51f47b212e925815abc91c086a3bf67d5c014b5d002a", "UT:LegalEase Utah/1003EX_Petition_to_Expunge_Records_Cannabis_Conviction.pdf:a8432deaa902e26c18a215d20fcc0f90eaedd5a62c28d0cec79f3f65d17c4352"], "offenseLevelRequired": true}, "path-k-pardon-based-expungement": {"questionRecordId": "Q-906056c11b74201b4da6", "resultCode": "guidance_only", "reason": "ut.guidance_only_no_user_filed_court_petition", "sourceFormIds": ["UT:LegalEase Utah/expungements.html:37976f3be7bc8f4201da211d5b61f932a6a7ea13cc575169188d9b79723e2008"], "offenseLevelRequired": true}, "path-l-vacatur-human-trafficking-related-expungement": {"questionRecordId": "Q-d9d380005932a99444a6", "resultCode": "guidance_only", "reason": "ut.guidance_only_no_user_filed_court_petition", "sourceFormIds": ["UT:LegalEase Utah/expungements.html:37976f3be7bc8f4201da211d5b61f932a6a7ea13cc575169188d9b79723e2008"], "offenseLevelRequired": true}, "path-m-juvenile-expungement": {"questionRecordId": "Q-2fe99c51c62078f670e8", "resultCode": "guidance_only", "reason": "ut.guidance_only_no_user_filed_court_petition", "sourceFormIds": ["UT:LegalEase Utah/expungements.html:37976f3be7bc8f4201da211d5b61f932a6a7ea13cc575169188d9b79723e2008"], "offenseLevelRequired": true}}},
  PA: {"reason": "Earlier Pennsylvania categories remain optional literal history. Offense-type facts are asked through separate answers, including the charge-and-statute answer and the charge-type check; a category is not evaluated as one, and the route stays guidance only or needs review, unpaid.", "witnesses": {"path-b-complete-acquittal-not-guilty-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Acquitted or found not guilty", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path B — Complete-acquittal / not-guilty expungement", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "path-c-summary-conviction-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Other conviction or adjudication", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path C — Summary-conviction expungement", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "path-d-ard-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path D — ARD expungement", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "path-e-age-70-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path E — Age-70 expungement", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "path-f-deceased-person-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path F — Deceased-person expungement", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "path-g-underage-drinking-conviction-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Other conviction or adjudication", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path G — Underage-drinking conviction expungement", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "path-h-pardon-based-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Pardoned conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path H — Pardon-based expungement", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "path-i-petition-for-limited-access": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path I — Petition for limited access", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "path-j-clean-slate-automatic-limited-access": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path J — Clean Slate automatic limited access", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "path-k-human-trafficking-vacatur-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Other conviction or adjudication", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path K — Human-trafficking vacatur / expungement", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}}, "routes": {"path-a-non-conviction-expungement": {"questionRecordId": "Q-6303976ad4b8ae1e924f", "resultCode": "needs_review", "reason": "pa.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "path-b-complete-acquittal-not-guilty-expungement": {"questionRecordId": "Q-bbf51562519786068cc5", "resultCode": "guidance_only", "reason": "pa.approved_release_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "path-c-summary-conviction-expungement": {"questionRecordId": "Q-ebfada9e873528bccd38", "resultCode": "guidance_only", "reason": "pa.approved_release_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "path-d-ard-expungement": {"questionRecordId": "Q-f82ac89b0b9cd5a6f0b0", "resultCode": "guidance_only", "reason": "pa.approved_release_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "path-e-age-70-expungement": {"questionRecordId": "Q-ad80963961e658f9a1e4", "resultCode": "guidance_only", "reason": "pa.approved_release_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "path-f-deceased-person-expungement": {"questionRecordId": "Q-a106d2f89ee5932928db", "resultCode": "guidance_only", "reason": "pa.approved_release_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "path-g-underage-drinking-conviction-expungement": {"questionRecordId": "Q-7f0b7762d5aeefdbac2b", "resultCode": "guidance_only", "reason": "pa.approved_release_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "path-h-pardon-based-expungement": {"questionRecordId": "Q-7731018f38b0d5c7398e", "resultCode": "guidance_only", "reason": "pa.approved_release_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "path-i-petition-for-limited-access": {"questionRecordId": "Q-bcbdcf2105073c71d90d", "resultCode": "guidance_only", "reason": "pa.approved_release_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "path-j-clean-slate-automatic-limited-access": {"questionRecordId": "Q-3b3c3e699bffa01de277", "resultCode": "guidance_only", "reason": "pa.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "path-k-human-trafficking-vacatur-expungement": {"questionRecordId": "Q-d4df0578591f1bba6c6c", "resultCode": "guidance_only", "reason": "pa.approved_release_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}}},
  LA: {"reason": "Earlier Louisiana categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {}, "routes": {"felony-article-893-e-set-aside-followed-by-expungement": {"questionRecordId": "Q-b30729ed956e8d23062e", "resultCode": "packet_ready_with_caution", "reason": "la.compiled_rule_match.route-felony-article-893-e-set-aside-followed-by-expungement", "sourceFormIds": [], "offenseLevelRequired": true}, "felony-ten-year-clean-period-expungement": {"questionRecordId": "Q-b233741a48310919da10", "resultCode": "not_covered_yet", "reason": "la.intentional_unsupported_route", "sourceFormIds": [], "offenseLevelRequired": true}, "first-offender-pardon-felony-expungement": {"questionRecordId": "Q-a2228520d97dcc903ff3", "resultCode": "guidance_only", "reason": "la.lawrence_hold_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "first-offense-marijuana-expungement-after-90-days-art-998": {"questionRecordId": "Q-028a5d4a6e578c29a060", "resultCode": "needs_more_info", "reason": "la.route_identified_packet_not_yet_available", "sourceFormIds": [], "offenseLevelRequired": true}, "human-trafficking-survivor-expungement-fee-exempt-route": {"questionRecordId": "Q-1f0e7d0488d670e692cd", "resultCode": "guidance_only", "reason": "la.lawrence_hold_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "immediate-expungement-after-successful-court-program-completion-art-985-3": {"questionRecordId": "Q-22065414a244c656a67f", "resultCode": "guidance_only", "reason": "la.lawrence_hold_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "interim-expungement-of-a-felony-arrest-reduced-to-a-misdemeanor-conviction": {"questionRecordId": "Q-7500ec895a5603e69c15", "resultCode": "guidance_only", "reason": "la.lawrence_hold_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "misdemeanor-article-894-b-set-aside-followed-by-expungement": {"questionRecordId": "Q-c2f2a4248850b31ea8ca", "resultCode": "packet_ready_with_caution", "reason": "la.compiled_rule_match.route-misdemeanor-article-894-b-set-aside-followed-by-expungement", "sourceFormIds": [], "offenseLevelRequired": true}, "misdemeanor-five-year-clean-period-expungement": {"questionRecordId": "Q-8063c22833109ea3d94e", "resultCode": "not_covered_yet", "reason": "la.intentional_unsupported_route", "sourceFormIds": [], "offenseLevelRequired": true}}},
  TX: {"reason": "Earlier Texas categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {"automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Arrest or citation with no charge filed", "court_requirements_completed": "yes", "financial_obligations": "Yes", "identity_error": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Automatic nondisclosure for qualifying nonviolent misdemeanor deferred adjudication (§ 411.072)", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "state_exclusion_categories": ["None of these"]}}}, "routes": {"automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07": {"questionRecordId": "Q-97bc2a5f998b912adda8", "resultCode": "guidance_only", "reason": "tx.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "expunction-after-pardon-or-actual-innocence-relief": {"questionRecordId": "Q-ece677b818ab583b0a14", "resultCode": "guidance_only", "reason": "tx.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "expunction-for-arrest-with-no-charge-filed-after-the-limitations-period": {"questionRecordId": "Q-b8b91c5dff89cb0adb64", "resultCode": "needs_review", "reason": "tx.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "first-offense-dwi-nondisclosure": {"questionRecordId": "Q-7b044f8b2d70a8798aca", "resultCode": "needs_more_info", "reason": "tx.nondisclosure_exact_facts_missing", "sourceFormIds": ["TX:LegalEase Texas/tx-statewide-expunction-nondisclosure-forms.html:d6f3d47523a2593098bf45c3831aead8265586b31f86200de64eadc30f433abe"], "offenseLevelRequired": true}, "petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725": {"questionRecordId": "Q-ecdc2323b7eb7e9089ba", "resultCode": "needs_more_info", "reason": "tx.nondisclosure_exact_facts_missing", "sourceFormIds": ["TX:LegalEase Texas/tx-statewide-expunction-nondisclosure-forms.html:d6f3d47523a2593098bf45c3831aead8265586b31f86200de64eadc30f433abe"], "offenseLevelRequired": true}, "petitioned-nondisclosure-for-an-eligible-conviction-411-0735": {"questionRecordId": "Q-2e0fbd26cd239ff0d6e4", "resultCode": "needs_more_info", "reason": "tx.nondisclosure_exact_facts_missing", "sourceFormIds": ["TX:LegalEase Texas/tx-statewide-expunction-nondisclosure-forms.html:d6f3d47523a2593098bf45c3831aead8265586b31f86200de64eadc30f433abe"], "offenseLevelRequired": true}}},
  NE: {"reason": "Earlier Nebraska categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {"automatic-nonconviction-sealing": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"age_at_offense": "30", "case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "identity_error": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Automatic/time-based sealing of non-conviction records under § 29-3523", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "juvenile-automatic-sealing": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"age_at_offense": "30", "case_outcome": "Other conviction or adjudication", "court_requirements_completed": "yes", "financial_obligations": "Yes", "identity_error": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Juvenile automatic sealing under §§ 43-2,108.01 to 43-2,108.05", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}}, "routes": {"automatic-nonconviction-sealing": {"questionRecordId": "Q-4a545ab85a94be27c95b", "resultCode": "guidance_only", "reason": "ne.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "juvenile-automatic-sealing": {"questionRecordId": "Q-7d6e2953ebba7db1eb72", "resultCode": "guidance_only", "reason": "ne.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "juvenile-petition-backstop": {"questionRecordId": "Q-d75d629d50ebb8c87426", "resultCode": "guidance_only", "reason": "ne.lawrence_hold_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "law-enforcement-error-expungement": {"questionRecordId": "Q-5032ace2532c76a61e7c", "resultCode": "guidance_only", "reason": "ne.lawrence_hold_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "pardon-then-seal": {"questionRecordId": "Q-f90e4e8ab93ba8a7096e", "resultCode": "guidance_only", "reason": "ne.lawrence_hold_guidance_only", "sourceFormIds": [], "offenseLevelRequired": true}, "set-aside-incarceration-one-year-or-less": {"questionRecordId": "Q-17df472e8ea9aa127584", "resultCode": "packet_ready_with_caution", "reason": "ne.compiled_rule_match.rule-05-the-sentence-conditions-must-be-satisfactorily-complete", "sourceFormIds": [], "offenseLevelRequired": true}, "set-aside-probation-fine-community-service": {"questionRecordId": "Q-eea669c83c89361f4041", "resultCode": "packet_ready_with_caution", "reason": "ne.compiled_rule_match.rule-05-the-sentence-conditions-must-be-satisfactorily-complete", "sourceFormIds": [], "offenseLevelRequired": true}, "trafficking-survivor-set-aside-and-seal": {"questionRecordId": "Q-1fd3143f4dbee8014955", "resultCode": "guidance_only", "reason": "ne.lawrence_hold_guidance_only", "sourceFormIds": ["NE:LegalEase Nebraska/CC-6-12.pdf:68478452073cdb89dac20843e3d7f5df2ad31b41608ab04deafe940bd6401d28"], "offenseLevelRequired": true}}},
  RI: {"reason": "Earlier Rhode Island categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {"path-f-marijuana-possession-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path F — Marijuana-possession expungement", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "path-g-decriminalized-offense-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Path G — Decriminalized-offense expungement", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}}, "routes": {"path-a-first-offender-conviction-expungement": {"questionRecordId": "Q-50cca60f5c7926124ba7", "resultCode": "needs_review", "reason": "ri.waiting_rule_not_executed", "sourceFormIds": ["RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor-superior.pdf:6a948b731d63dba93061f95786359c5ccd7df6b5eb5c88791c5efc29aafe1119", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor (2).pdf:5848e402583625f71080dd77fc1a41bd20022bebf159ffe4cee0da3fd9804358", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Felony.pdf:e5805c5482e61ef39a88d8b50ea5a3556b5ffc40d3abb2200973016af4a9afca"], "offenseLevelRequired": true}, "path-b-multiple-misdemeanor-expungement": {"questionRecordId": "Q-cb04a7aa485b8e2b72d8", "resultCode": "needs_review", "reason": "ri.waiting_rule_not_executed", "sourceFormIds": ["RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor-superior.pdf:6a948b731d63dba93061f95786359c5ccd7df6b5eb5c88791c5efc29aafe1119", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor (2).pdf:5848e402583625f71080dd77fc1a41bd20022bebf159ffe4cee0da3fd9804358", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Felony.pdf:e5805c5482e61ef39a88d8b50ea5a3556b5ffc40d3abb2200973016af4a9afca"], "offenseLevelRequired": true}, "path-c-deferred-sentence-expungement": {"questionRecordId": "Q-953071a0940638aa4080", "resultCode": "needs_review", "reason": "ri.waiting_rule_not_executed", "sourceFormIds": ["RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor-superior.pdf:6a948b731d63dba93061f95786359c5ccd7df6b5eb5c88791c5efc29aafe1119", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor (2).pdf:5848e402583625f71080dd77fc1a41bd20022bebf159ffe4cee0da3fd9804358", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Felony.pdf:e5805c5482e61ef39a88d8b50ea5a3556b5ffc40d3abb2200973016af4a9afca"], "offenseLevelRequired": true}, "path-d-non-conviction-sealing-expungement": {"questionRecordId": "Q-f267c2dff27842604000", "resultCode": "needs_review", "reason": "ri.waiting_rule_not_executed", "sourceFormIds": ["RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor-superior.pdf:6a948b731d63dba93061f95786359c5ccd7df6b5eb5c88791c5efc29aafe1119", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor (2).pdf:5848e402583625f71080dd77fc1a41bd20022bebf159ffe4cee0da3fd9804358", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Felony.pdf:e5805c5482e61ef39a88d8b50ea5a3556b5ffc40d3abb2200973016af4a9afca"], "offenseLevelRequired": true}, "path-e-filed-complaint-relief-under-12-10-12": {"questionRecordId": "Q-4eb0e509dabbd52d3833", "resultCode": "needs_review", "reason": "ri.waiting_rule_not_executed", "sourceFormIds": ["RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor-superior.pdf:6a948b731d63dba93061f95786359c5ccd7df6b5eb5c88791c5efc29aafe1119", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor (2).pdf:5848e402583625f71080dd77fc1a41bd20022bebf159ffe4cee0da3fd9804358", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Felony.pdf:e5805c5482e61ef39a88d8b50ea5a3556b5ffc40d3abb2200973016af4a9afca"], "offenseLevelRequired": true}, "path-f-marijuana-possession-expungement": {"questionRecordId": "Q-6ee35861d87c035055aa", "resultCode": "guidance_only", "reason": "ri.guidance_only_no_user_filed_court_petition", "sourceFormIds": ["RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor-superior.pdf:6a948b731d63dba93061f95786359c5ccd7df6b5eb5c88791c5efc29aafe1119", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor (2).pdf:5848e402583625f71080dd77fc1a41bd20022bebf159ffe4cee0da3fd9804358", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Felony.pdf:e5805c5482e61ef39a88d8b50ea5a3556b5ffc40d3abb2200973016af4a9afca"], "offenseLevelRequired": true}, "path-g-decriminalized-offense-expungement": {"questionRecordId": "Q-6657da2a38a7cc5786a2", "resultCode": "needs_review", "reason": "ri.legal_authority_referral_required", "sourceFormIds": ["RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor-superior.pdf:6a948b731d63dba93061f95786359c5ccd7df6b5eb5c88791c5efc29aafe1119", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor (2).pdf:5848e402583625f71080dd77fc1a41bd20022bebf159ffe4cee0da3fd9804358", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Felony.pdf:e5805c5482e61ef39a88d8b50ea5a3556b5ffc40d3abb2200973016af4a9afca"], "offenseLevelRequired": true}, "path-h-commercial-sexual-activity-related-expungement": {"questionRecordId": "Q-882f1028ec5db3a1c041", "resultCode": "needs_review", "reason": "ri.waiting_rule_not_executed", "sourceFormIds": ["RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor-superior.pdf:6a948b731d63dba93061f95786359c5ccd7df6b5eb5c88791c5efc29aafe1119", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor (2).pdf:5848e402583625f71080dd77fc1a41bd20022bebf159ffe4cee0da3fd9804358", "RI:LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Felony.pdf:e5805c5482e61ef39a88d8b50ea5a3556b5ffc40d3abb2200973016af4a9afca"], "offenseLevelRequired": true}}},
  VT: {"reason": "Earlier Vermont categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {}, "routes": {"adult-conviction-expungement-narrow-statutory-route": {"questionRecordId": "Q-08b43436b06a0f4e805b", "resultCode": "needs_review", "reason": "vt.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "adult-felony-conviction-sealing": {"questionRecordId": "Q-8d42db81cba3d83cdfc8", "resultCode": "guidance_only", "reason": "vt.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "adult-misdemeanor-conviction-sealing": {"questionRecordId": "Q-547a6af68b039d5a2147", "resultCode": "guidance_only", "reason": "vt.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "dui-sealing": {"questionRecordId": "Q-327fabab0a5a937c065b", "resultCode": "needs_review", "reason": "vt.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "juvenile-sealing": {"questionRecordId": "Q-43f2d3e844b38b09b29d", "resultCode": "packet_ready_with_caution", "reason": "vt.compiled_rule_match.rule-20-age-18-21-qualifying-crime-30-days-after-sentence-compl", "sourceFormIds": [], "offenseLevelRequired": true, "paymentAllowed": false}, "non-conviction-sealing": {"questionRecordId": "Q-91a7d389265ef74bef51", "resultCode": "guidance_only", "reason": "vt.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "offense-before-age-25-sealing-under-33-v-s-a-5119-g": {"questionRecordId": "Q-f1e29e900cf226e0d754", "resultCode": "packet_ready_with_caution", "reason": "vt.compiled_rule_match.rule-16-qualifying-dui-misdemeanor-10-years-after-sentence-comp", "sourceFormIds": [], "offenseLevelRequired": true, "paymentAllowed": false}, "young-adult-sealing-for-offenses-committed-at-ages-18-21": {"questionRecordId": "Q-66970ef1355d84b71232", "resultCode": "packet_ready_with_caution", "reason": "vt.compiled_rule_match.rule-16-qualifying-dui-misdemeanor-10-years-after-sentence-comp", "sourceFormIds": [], "offenseLevelRequired": true, "paymentAllowed": false}}},
  IL: {"reason": "Earlier Illinois categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {"clean-slate-automatic-sealing": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"age_at_offense": "30", "case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Clean Slate automatic sealing", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "state_exclusion_categories": ["None of these"], "trafficking_status": "No"}}}, "routes": {"adult-conviction-sealing": {"questionRecordId": "Q-5694f465c734a658c0e0", "resultCode": "packet_ready_with_caution", "reason": "il.compiled_rule_match.rule-06-order-of-supervision-successfully-completed-expungement", "sourceFormIds": ["IL:LegalEase Illinois/CXP Additional Cannabis Convictions.pdf:32b1ef344909ff9a38b816f0235f261678c57abaebe9858aec12b70094e55969"], "offenseLevelRequired": true}, "adult-non-conviction-expungement": {"questionRecordId": "Q-1dd94e9fab0cba0e0454", "resultCode": "not_covered_yet", "reason": "il.intentional_unsupported_route", "sourceFormIds": ["IL:LegalEase Illinois/CXP Additional Cannabis Convictions.pdf:32b1ef344909ff9a38b816f0235f261678c57abaebe9858aec12b70094e55969"], "offenseLevelRequired": true}, "cannabis-specific-automatic-or-petition-expungement": {"questionRecordId": "Q-59face7f29c93d412462", "resultCode": "needs_review", "reason": "il.waiting_rule_not_executed", "sourceFormIds": ["IL:LegalEase Illinois/CXP Additional Cannabis Convictions.pdf:32b1ef344909ff9a38b816f0235f261678c57abaebe9858aec12b70094e55969"], "offenseLevelRequired": true}, "clean-slate-automatic-sealing": {"questionRecordId": "Q-59f40e6c5a862593cb34", "resultCode": "guidance_only", "reason": "il.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "expungement-after-eligible-supervision-or-qualified-probation": {"questionRecordId": "Q-e875b077b30fe51dbdf1", "resultCode": "needs_review", "reason": "il.waiting_rule_not_executed", "sourceFormIds": ["IL:LegalEase Illinois/CXP Additional Cannabis Convictions.pdf:32b1ef344909ff9a38b816f0235f261678c57abaebe9858aec12b70094e55969"], "offenseLevelRequired": true}, "human-trafficking-survivor-vacatur-and-expungement": {"questionRecordId": "Q-c7f7280000e453756a1d", "resultCode": "not_covered_yet", "reason": "il.intentional_unsupported_route", "sourceFormIds": ["IL:LegalEase Illinois/CXP Additional Cannabis Convictions.pdf:32b1ef344909ff9a38b816f0235f261678c57abaebe9858aec12b70094e55969"], "offenseLevelRequired": true}, "juvenile-automatic-or-petition-expungement": {"questionRecordId": "Q-bd7baa2e2c96bc9547a0", "resultCode": "not_covered_yet", "reason": "il.intentional_unsupported_route", "sourceFormIds": ["IL:LegalEase Illinois/CXP Additional Cannabis Convictions.pdf:32b1ef344909ff9a38b816f0235f261678c57abaebe9858aec12b70094e55969"], "offenseLevelRequired": true}}},
  NV: {"reason": "Earlier Nevada categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {}, "routes": {"controlled-substance-possession-sealing-under-nrs-453-3365": {"questionRecordId": "Q-c5b04053ad25b6bdc48e", "resultCode": "guidance_only", "reason": "nv.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "deferred-judgment-dismissal-and-sealing-under-nrs-176-211": {"questionRecordId": "Q-d37e8d6c0c587f910f10", "resultCode": "needs_review", "reason": "nv.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "general-conviction-record-sealing-under-nrs-179-245": {"questionRecordId": "Q-f64352d6d095968af4a5", "resultCode": "needs_review", "reason": "nv.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "non-conviction-record-sealing": {"questionRecordId": "Q-649e80666a379d07874e", "resultCode": "needs_review", "reason": "nv.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "reentry-program-sealing-under-nrs-179-259": {"questionRecordId": "Q-21a4729656d009a44472", "resultCode": "guidance_only", "reason": "nv.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "removal-of-a-record-from-the-central-repository-after-a-favourable-disposition-under-179a-160": {"questionRecordId": "Q-f23bb2e343320420f6d4", "resultCode": "guidance_only", "reason": "nv.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "trafficking-victim-vacatur-and-sealing-under-nrs-179-247": {"questionRecordId": "Q-79bc94877bba645c5ce8", "resultCode": "needs_review", "reason": "nv.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}}},
  OH: {"reason": "Earlier Ohio categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {}, "routes": {"adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32": {"questionRecordId": "Q-789e93d63ae1e416ca52", "resultCode": "needs_review", "reason": "oh.route_gate_pending_lawrence_review", "sourceFormIds": [], "offenseLevelRequired": true}, "adult-non-conviction-sealing-or-expungement-under-2953-33": {"questionRecordId": "Q-765489a449327996fbe9", "resultCode": "packet_ready_with_caution", "reason": "oh.compiled_rule_match.rule-05-grand-jury-no-bill-non-conviction-sealing-or-expungemen", "sourceFormIds": [], "offenseLevelRequired": true}, "certain-firearm-carry-conviction-expungement-under-2953-35": {"questionRecordId": "Q-bb5520a0a7519366f9e1", "resultCode": "needs_review", "reason": "oh.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "human-trafficking-survivor-conviction-expungement-under-2953-36": {"questionRecordId": "Q-2e36d0b5c1a1925c7c98", "resultCode": "needs_review", "reason": "oh.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "human-trafficking-survivor-non-conviction-expungement-under-2953-521": {"questionRecordId": "Q-daf300450ee87dd55597", "resultCode": "needs_review", "reason": "oh.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "marijuana-hashish-possession-expungement-under-2953-321": {"questionRecordId": "Q-99864a8cfd6d49f59819", "resultCode": "needs_review", "reason": "oh.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}}},
  SC: {"reason": "Earlier South Carolina categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {"diversion-or-program-completion-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"age_at_offense": "30", "case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Diversion or program-completion expungement", "prior_relief": "Yes", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "trafficking_status": "No"}}, "pardon-guidance-for-otherwise-ineligible-convictions": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"age_at_offense": "30", "case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Pardon guidance for otherwise ineligible convictions", "prior_relief": "Yes", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "trafficking_status": "No"}}}, "routes": {"diversion-or-program-completion-expungement": {"questionRecordId": "Q-3628876a599f755ccb08", "resultCode": "guidance_only", "reason": "sc.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "eligible-conviction-expungement": {"questionRecordId": "Q-a01dc251d4bc64a25e86", "resultCode": "guidance_only", "reason": "sc.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "general-sessions-non-conviction-expungement": {"questionRecordId": "Q-1e95aceea3b46b97ce1b", "resultCode": "guidance_only", "reason": "sc.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "human-trafficking-survivor-expungement": {"questionRecordId": "Q-4e381f7c25da41b693e3", "resultCode": "guidance_only", "reason": "sc.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "juvenile-expungement": {"questionRecordId": "Q-66245d5d32703c1edee8", "resultCode": "needs_review", "reason": "sc.waiting_rule_not_executed", "sourceFormIds": ["SC:LegalEase South Carolina /SCCA223E.pdf:668b70b0b3c2cd4c0354d0ed63711110d23633f73d507a9f67c051828b7bbad8", "SC:LegalEase South Carolina /SCCA223D1.pdf:988ad4b5f6054d1b47a459358fb409ac4c76b09f281b6a12650ff173f0158776"], "offenseLevelRequired": true}, "pardon-guidance-for-otherwise-ineligible-convictions": {"questionRecordId": "Q-732e7580dcb62e76f411", "resultCode": "guidance_only", "reason": "sc.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "summary-court-non-conviction-expungement": {"questionRecordId": "Q-599b985661fec0558c4b", "resultCode": "needs_review", "reason": "sc.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}}},
  SD: {"reason": "Earlier South Dakota categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {"automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"age_at_offense": "30", "case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Automatic public-record removal for petty, municipal, and Class 2 misdemeanor cases", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "trafficking_status": "No"}}, "pardon-based-sealing": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"age_at_offense": "30", "case_outcome": "Pardoned conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Pardon-based sealing", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "trafficking_status": "No"}}}, "routes": {"adult-arrest-record-expungement-under-sdcl-23a-3-27": {"questionRecordId": "Q-e3265ba918c0807bc1d4", "resultCode": "needs_review", "reason": "sd.waiting_rule_not_executed", "sourceFormIds": ["SD:LegalEase South Dakota/ujs391-motion-for-expungement-and-affidavit-of-mailing-final-07_2025.pdf:964a2fb15fbb57696b3f81dc1f9e4b3f2e901e566c6bbee3636fa739bceecdca", "SD:LegalEase South Dakota/ujs-394-order-of-expungement_06_2023.pdf:d6f2dab3ca32ca7fedd348635871d036dc90170c240ac416b4c9b770a7c7de3f", "SD:LegalEase South Dakota/ujs-393-notice-of-hearing-for-expungement-of-record_08_2025.pdf:11a9157e9e2dc58246f4bd3567bd83a26ebc52364506131cdf20f30fe61bf3dc", "SD:LegalEase South Dakota/ujs-392-waiver-of-expungement-hearing-07_2025.pdf:bae0abc96b9f81303974a8632e53ff0fd9f1e159fda6b3db759ba3bf4ec22244", "SD:LegalEase South Dakota/ujs-232-case-filing-statement-written.pdf:4301ebb8eea5a70a9ccb22702e0c8d11cfec4de2b6db2d696024d4cf75623dce"], "offenseLevelRequired": true}, "automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases": {"questionRecordId": "Q-0dd3d4a648d6ab2cace7", "resultCode": "guidance_only", "reason": "sd.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "controlled-substance-deferred-disposition-route": {"questionRecordId": "Q-6ff783980d482acdedd8", "resultCode": "guidance_only", "reason": "sd.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "diversion-expungement": {"questionRecordId": "Q-8283a2d886845701d5c8", "resultCode": "needs_review", "reason": "sd.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "juvenile-delinquency-sealing": {"questionRecordId": "Q-0fbe5c9baccd5dfb2743", "resultCode": "needs_review", "reason": "sd.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "juvenile-trafficking-expungement": {"questionRecordId": "Q-544a83f317e6925639ae", "resultCode": "needs_review", "reason": "sd.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "pardon-based-sealing": {"questionRecordId": "Q-0f015c8e313a541231b9", "resultCode": "guidance_only", "reason": "sd.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}}},
  WA: {"reason": "Earlier Washington categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {}, "routes": {"adult-felony-vacation-under-rcw-9-94a-640": {"questionRecordId": "Q-3b110b6ae08bd64d6bf3", "resultCode": "needs_review", "reason": "wa.route_gate_pending_lawrence_review", "sourceFormIds": ["WA:LegalEase Washington/CR08.0930_Vacating Record of Felony Conviction_2023 01.pdf:17e2fdfceb0823387f25dd285276c2b06778f73e10d76180dfb2ee2d6f030a00", "WA:LegalEase Washington/CR08.0920_Order re Vacating Record of Felony Conviction 2025 07.pdf:e5ccd2e0847fc9b0c2b54ef4ff75fd8d500b7b2af5a9eed963dd3855bb0226db", "WA:LegalEase Washington/CR08.0900_Mt and Decl for Or Vacating Record of Felony_2025 07.pdf:ec8b175e3a2ccfdf247328822b7ed8ac570dacd27c8b728d09a10eca05c6559e"], "offenseLevelRequired": true}, "adult-misdemeanor-gross-misdemeanor-vacation-under-rcw-9-96-060": {"questionRecordId": "Q-10152501470126ecc07d", "resultCode": "needs_review", "reason": "wa.route_gate_pending_lawrence_review", "sourceFormIds": ["WA:LegalEase Washington/JU 10_0320 Order re Sealing Records of Juvenile Offender_2022 01.pdf:bbe5a288b36a91b71cadbf1279ad6e10bfcc75732c2ef64bb5c21bc2d3ab5d86", "WA:LegalEase Washington/CR08.0930_Vacating Record of Felony Conviction_2023 01.pdf:17e2fdfceb0823387f25dd285276c2b06778f73e10d76180dfb2ee2d6f030a00", "WA:LegalEase Washington/CR08.0920_Order re Vacating Record of Felony Conviction 2025 07.pdf:e5ccd2e0847fc9b0c2b54ef4ff75fd8d500b7b2af5a9eed963dd3855bb0226db", "WA:LegalEase Washington/CR08.0900_Mt and Decl for Or Vacating Record of Felony_2025 07.pdf:ec8b175e3a2ccfdf247328822b7ed8ac570dacd27c8b728d09a10eca05c6559e"], "offenseLevelRequired": true}, "blake-drug-possession-vacation-and-refund-route": {"questionRecordId": "Q-adb77e291db09ef1d5d2", "resultCode": "needs_review", "reason": "wa.selected_pathway_rule_not_matched", "sourceFormIds": ["WA:LegalEase Washington/JU 10_0320 Order re Sealing Records of Juvenile Offender_2022 01.pdf:bbe5a288b36a91b71cadbf1279ad6e10bfcc75732c2ef64bb5c21bc2d3ab5d86", "WA:LegalEase Washington/CrRLJ 09.0870 OrderPetVacateConviction_Cannabis_2022 07(2).pdf:a69335fbbf311f4c92357db5ecb38f931b3409e14f987810247faae2f6295cc3", "WA:LegalEase Washington/CrRLJ 09.0800 PetitionDeclVacateConviction_Cannabis_2022 07(2).pdf:260367f6930cacc89727fc8a48aa0591b07ad5c7183b6412aa247b1810503d7b", "WA:LegalEase Washington/CR08.0930_Vacating Record of Felony Conviction_2023 01.pdf:17e2fdfceb0823387f25dd285276c2b06778f73e10d76180dfb2ee2d6f030a00", "WA:LegalEase Washington/CR08.0920_Order re Vacating Record of Felony Conviction 2025 07.pdf:e5ccd2e0847fc9b0c2b54ef4ff75fd8d500b7b2af5a9eed963dd3855bb0226db", "WA:LegalEase Washington/CR08.0900_Mt and Decl for Or Vacating Record of Felony_2025 07.pdf:ec8b175e3a2ccfdf247328822b7ed8ac570dacd27c8b728d09a10eca05c6559e"], "offenseLevelRequired": true}, "juvenile-record-sealing-under-rcw-13-50-260": {"questionRecordId": "Q-f58e57c144f081be3514", "resultCode": "packet_ready_with_caution", "reason": "wa.compiled_rule_match.route-juvenile-record-sealing-under-rcw-13-50-260", "sourceFormIds": ["WA:LegalEase Washington/JU 10_0320 Order re Sealing Records of Juvenile Offender_2022 01.pdf:bbe5a288b36a91b71cadbf1279ad6e10bfcc75732c2ef64bb5c21bc2d3ab5d86"], "offenseLevelRequired": true, "paymentAllowed": false}, "misdemeanor-cannabis-conviction-vacation": {"questionRecordId": "Q-4adaa2604fd09aa8f9b5", "resultCode": "needs_review", "reason": "wa.waiting_rule_not_executed", "sourceFormIds": ["WA:LegalEase Washington/CrRLJ 09.0870 OrderPetVacateConviction_Cannabis_2022 07(2).pdf:a69335fbbf311f4c92357db5ecb38f931b3409e14f987810247faae2f6295cc3", "WA:LegalEase Washington/CrRLJ 09.0800 PetitionDeclVacateConviction_Cannabis_2022 07(2).pdf:260367f6930cacc89727fc8a48aa0591b07ad5c7183b6412aa247b1810503d7b", "WA:LegalEase Washington/CR08.0930_Vacating Record of Felony Conviction_2023 01.pdf:17e2fdfceb0823387f25dd285276c2b06778f73e10d76180dfb2ee2d6f030a00", "WA:LegalEase Washington/CR08.0920_Order re Vacating Record of Felony Conviction 2025 07.pdf:e5ccd2e0847fc9b0c2b54ef4ff75fd8d500b7b2af5a9eed963dd3855bb0226db", "WA:LegalEase Washington/JU 10_0320 Order re Sealing Records of Juvenile Offender_2022 01.pdf:bbe5a288b36a91b71cadbf1279ad6e10bfcc75732c2ef64bb5c21bc2d3ab5d86", "WA:LegalEase Washington/CR08.0900_Mt and Decl for Or Vacating Record of Felony_2025 07.pdf:ec8b175e3a2ccfdf247328822b7ed8ac570dacd27c8b728d09a10eca05c6559e"], "offenseLevelRequired": true}, "non-conviction-record-deletion-under-rcw-10-97-060": {"questionRecordId": "Q-9b41697713dead823c63", "resultCode": "needs_review", "reason": "wa.waiting_rule_not_executed", "sourceFormIds": ["WA:LegalEase Washington/CR08.0920_Order re Vacating Record of Felony Conviction 2025 07.pdf:e5ccd2e0847fc9b0c2b54ef4ff75fd8d500b7b2af5a9eed963dd3855bb0226db", "WA:LegalEase Washington/CR08.0900_Mt and Decl for Or Vacating Record of Felony_2025 07.pdf:ec8b175e3a2ccfdf247328822b7ed8ac570dacd27c8b728d09a10eca05c6559e", "WA:LegalEase Washington/CrRLJ 09.0200 Ord Pet Vacate Conviction_(f)(U).pdf:b53035ddc5ea31aa9bd6816d5f157a58c8c8201db8e4a2cbb15f9874b4c851f2", "WA:LegalEase Washington/CrRLJ 09.0100 Petition to Vacate Conviction_(f)(U).pdf:1f72e901e93d576cf6c7ecad910d253da65b6af1a89ca75304c9739fa159909b", "WA:LegalEase Washington/CR08.0930_Vacating Record of Felony Conviction_2023 01.pdf:17e2fdfceb0823387f25dd285276c2b06778f73e10d76180dfb2ee2d6f030a00", "WA:LegalEase Washington/JU 10_0320 Order re Sealing Records of Juvenile Offender_2022 01.pdf:bbe5a288b36a91b71cadbf1279ad6e10bfcc75732c2ef64bb5c21bc2d3ab5d86", "WA:LegalEase Washington/CrRLJ 09.0870 OrderPetVacateConviction_Cannabis_2022 07(2).pdf:a69335fbbf311f4c92357db5ecb38f931b3409e14f987810247faae2f6295cc3", "WA:LegalEase Washington/CrRLJ 09.0800 PetitionDeclVacateConviction_Cannabis_2022 07(2).pdf:260367f6930cacc89727fc8a48aa0591b07ad5c7183b6412aa247b1810503d7b"], "offenseLevelRequired": true}, "victim-survivor-conviction-vacation-route": {"questionRecordId": "Q-90c7165ec4b0da2c49d5", "resultCode": "packet_ready_with_caution", "reason": "wa.compiled_rule_match.rule-13-ordinary-misdemeanor-gross-misdemeanor-vacation-3-years", "sourceFormIds": ["WA:LegalEase Washington/CR08.0930_Vacating Record of Felony Conviction_2023 01.pdf:17e2fdfceb0823387f25dd285276c2b06778f73e10d76180dfb2ee2d6f030a00", "WA:LegalEase Washington/CR08.0920_Order re Vacating Record of Felony Conviction 2025 07.pdf:e5ccd2e0847fc9b0c2b54ef4ff75fd8d500b7b2af5a9eed963dd3855bb0226db", "WA:LegalEase Washington/CR08.0900_Mt and Decl for Or Vacating Record of Felony_2025 07.pdf:ec8b175e3a2ccfdf247328822b7ed8ac570dacd27c8b728d09a10eca05c6559e"], "offenseLevelRequired": true, "paymentAllowed": false}}},
  WV: {"reason": "Earlier West Virginia categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {"pardon-based-expungement": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"age_at_offense": "30", "case_outcome": "Pardoned conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Pardon-based expungement", "prior_relief": "Yes", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "trafficking_status": "No"}}}, "routes": {"accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a": {"questionRecordId": "Q-cf92b9ddf3aa29535066", "resultCode": "packet_ready_with_caution", "reason": "wv.compiled_rule_match.route-accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a", "sourceFormIds": [], "offenseLevelRequired": true}, "first-offense-drug-possession-conditional-discharge-relief": {"questionRecordId": "Q-e09c22572076696b75e9", "resultCode": "packet_ready_with_caution", "reason": "wv.compiled_rule_match.route-first-offense-drug-possession-conditional-discharge-relief", "sourceFormIds": ["WV:LegalEase West Virginia/SCA-C907.pdf:2a72314146636c4120d87bdfb83f8609e35e9e904eed2f8169bc2375fba30222", "WV:LegalEase West Virginia/SCA-C906.pdf:8c6ced88c37870359bc38537c4409b2dc99a5ed6fc6b69c9c41d386fa7fe6e8c", "WV:STATES/WV/02_PACKET_FORMS/WV__FORM__SCA-C903__sca-c903-motion-for-expungement-after-acquittal-or-dismissal__REV-2010-04__EN.pdf:bbfcd767b02230300e2164a40cc2d81967c87fb9b7ddf4f0677622e1319fe878"], "offenseLevelRequired": true, "paymentAllowed": false}, "juvenile-record-relief": {"questionRecordId": "Q-8b168b02120d28ec1967", "resultCode": "needs_review", "reason": "wv.selected_pathway_rule_not_matched", "sourceFormIds": [], "offenseLevelRequired": true}, "no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication": {"questionRecordId": "Q-4788db0474a27ceae315", "resultCode": "needs_review", "reason": "wv.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "pardon-based-expungement": {"questionRecordId": "Q-438edd691f440307e9c6", "resultCode": "guidance_only", "reason": "wv.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "sex-trafficking-victim-vacatur-and-expungement": {"questionRecordId": "Q-766aea3d3342bf31ebfe", "resultCode": "needs_review", "reason": "wv.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}}},
  MD: {"reason": "Earlier Maryland categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {"automatic-expungement-under-crim-proc-10-105-1": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"age_at_offense": "30", "case_outcome": "Misdemeanor conviction", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Automatic expungement under Crim. Proc. § 10-105.1", "prior_relief": "Yes", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes", "state_exclusion_categories": ["None of these"]}}}, "routes": {"adult-non-conviction-expungement-under-crim-proc-10-105": {"questionRecordId": "Q-1ac39767ebd38f67205f", "resultCode": "needs_review", "reason": "md.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "automatic-expungement-under-crim-proc-10-105-1": {"questionRecordId": "Q-8bceb546e5c92b856e55", "resultCode": "guidance_only", "reason": "md.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "cannabis-specific-expungement": {"questionRecordId": "Q-1bfea6abba26156d604b", "resultCode": "not_covered_yet", "reason": "md.intentional_unsupported_route", "sourceFormIds": ["MD:LegalEase Maryland/LegalEase Maryland forms /ccdccr072d.pdf:6a5337a5d142c8ae1cc41845bd4c5efb5598e7a64acbda17c9ab70134773f147"], "offenseLevelRequired": true}, "eligible-conviction-expungement-under-crim-proc-10-110": {"questionRecordId": "Q-490cfd616dd97bfc8df2", "resultCode": "needs_review", "reason": "md.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "second-chance-act-shielding": {"questionRecordId": "Q-2366ddaaf367add0a243", "resultCode": "not_covered_yet", "reason": "md.intentional_unsupported_route", "sourceFormIds": ["MD:LegalEase Maryland/LegalEase Maryland forms /ccdccr072d.pdf:6a5337a5d142c8ae1cc41845bd4c5efb5598e7a64acbda17c9ab70134773f147", "MD:LegalEase Maryland/LegalEase Maryland forms /ccdccr072c.pdf:9faa52511adfce4c33a63fbc983f5999d288af2579c63f4425dd39714607c5ac", "MD:LegalEase Maryland/LegalEase Maryland forms /ccdccr072B.pdf:3a61136ead74ffc9a09652edf0ad4a113538f3e172c0ddea4df618cb3c0a4469", "MD:LegalEase Maryland/LegalEase Maryland forms /ccdccr072A.pdf:8dcb7b177cfb8900edc03158b064a57121170761e6f34e2456f08fdc68f82db2"], "offenseLevelRequired": true}}},
  MN: {"reason": "Earlier Minnesota categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {"arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "identity_error": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Arrest-identification-data destruction when no charges were filed (Minn. Stat. § 299C.11)", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "automatic-clean-slate-expungement-under-609a-015": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "identity_error": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Automatic Clean Slate expungement under § 609A.015", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "automatic-mistaken-identity-expungement-under-609a-017": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "identity_error": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Automatic mistaken-identity expungement under § 609A.017", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}}, "routes": {"arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11": {"questionRecordId": "Q-0428789b04a87e050967", "resultCode": "needs_review", "reason": "mn.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "automatic-clean-slate-expungement-under-609a-015": {"questionRecordId": "Q-3767c02a7587f8046157", "resultCode": "guidance_only", "reason": "mn.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "automatic-mistaken-identity-expungement-under-609a-017": {"questionRecordId": "Q-f23035e3845a362b111f", "resultCode": "guidance_only", "reason": "mn.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06": {"questionRecordId": "Q-5578048f10653c4f1989", "resultCode": "needs_review", "reason": "mn.legal_authority_referral_required", "sourceFormIds": [], "offenseLevelRequired": true}, "petition-based-expungement-under-609a-02-03": {"questionRecordId": "Q-522adeef09ebd5543747", "resultCode": "packet_ready_with_caution", "reason": "mn.compiled_rule_match.route-petition-based-expungement-under-609a-02-03", "sourceFormIds": [], "offenseLevelRequired": true}, "prosecutor-agreed-sealing-without-a-full-petition-under-609a-025": {"questionRecordId": "Q-afb8d1d88357accba349", "resultCode": "guidance_only", "reason": "mn.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}}},
  NH: {"reason": "Earlier New Hampshire categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {"out-of-state-federal-or-military-record-guidance": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pending_cases": "No", "possible_pathway_context": "Out-of-state, federal, or military record guidance", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}}, "routes": {"annulment-after-dismissal-acquittal-or-nonprosecution": {"questionRecordId": "Q-10e00b3dc3d3a2d6e6bf", "resultCode": "packet_ready_with_caution", "reason": "nh.compiled_rule_match.rule-11-for-offenses-disposed-of-before-january-1-2019-a-person", "sourceFormIds": [], "offenseLevelRequired": true}, "annulment-of-a-vacated-conviction": {"questionRecordId": "Q-55c5c19af69a1a529308", "resultCode": "needs_review", "reason": "nh.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "conviction-annulment-under-rsa-651-5": {"questionRecordId": "Q-1a87b0c3031a018211ec", "resultCode": "needs_review", "reason": "nh.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "dwi-dui-annulment": {"questionRecordId": "Q-c357f9bda99fc69890dd", "resultCode": "guidance_only", "reason": "nh.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}, "marijuana-possession-annulment-under-rsa-651-5-b": {"questionRecordId": "Q-4a033a26b88ca399c1b7", "resultCode": "needs_review", "reason": "nh.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "out-of-state-federal-or-military-record-guidance": {"questionRecordId": "Q-f1b376edb928d6bb9bb7", "resultCode": "guidance_only", "reason": "nh.guidance_only_no_user_filed_court_petition", "sourceFormIds": [], "offenseLevelRequired": true}}},
  MT: {"reason": "Earlier Montana categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.", "witnesses": {"doj-record-removal-update-request": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"age_at_offense": "30", "case_outcome": "Misdemeanor conviction", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "DOJ record-removal / update request", "prior_relief": "Yes", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}, "non-conviction-criminal-history-removal-through-criss": {"profileVersion": "2026-06-19-source-conversion-1", "answers": {"age_at_offense": "30", "case_outcome": "Dismissed, no-billed, nolle prosequi, or not prosecuted", "court_requirements_completed": "yes", "financial_obligations": "Yes", "jurisdiction_scope": "State or local", "new_convictions_during_waiting_period": "No", "offense_level": "Misdemeanor", "ownership_scope": "Yes", "pardon_status": "No", "pending_cases": "No", "possible_pathway_context": "Non-conviction criminal-history removal through CRISS", "prior_relief": "Yes", "record_documents": "Yes", "resolved_timing_bucket": "gt_10_years", "sentence_completion_date": "Yes", "special_preconditions_confirmed": "Yes"}}}, "routes": {"doj-record-removal-update-request": {"questionRecordId": "Q-c3d85e5a096e9c1c35d6", "resultCode": "needs_review", "reason": "mt.waiting_rule_not_executed", "sourceFormIds": ["MT:LegalEase Montana/form-b.docx:cb2fa9c3d9f38b0b7b0b11b503b05c91cd61c491ad37b74ea1298a6f12747207", "MT:LegalEase Montana/form-a.docx:968f68c78ce0d421b3751244bfcbd01c309eb7cea26027845b5e5dc6dbdb003d"], "offenseLevelRequired": true}, "marijuana-related-redesignation-expungement-under-mmrta": {"questionRecordId": "Q-7766060fdc5de774fcb8", "resultCode": "needs_review", "reason": "mt.waiting_rule_not_executed", "sourceFormIds": ["MT:LegalEase Montana/form-b.docx:cb2fa9c3d9f38b0b7b0b11b503b05c91cd61c491ad37b74ea1298a6f12747207", "MT:LegalEase Montana/form-a.docx:968f68c78ce0d421b3751244bfcbd01c309eb7cea26027845b5e5dc6dbdb003d"], "offenseLevelRequired": true}, "misdemeanor-conviction-expungement-under-mont-code-46-18-1104": {"questionRecordId": "Q-aa23f3177f750603d156", "resultCode": "needs_review", "reason": "mt.waiting_rule_not_executed", "sourceFormIds": [], "offenseLevelRequired": true}, "non-conviction-criminal-history-removal-through-criss": {"questionRecordId": "Q-844547836228a5b71b3b", "resultCode": "guidance_only", "reason": "mt.guidance_only_no_user_filed_court_petition", "sourceFormIds": ["MT:LegalEase Montana/form-b.docx:cb2fa9c3d9f38b0b7b0b11b503b05c91cd61c491ad37b74ea1298a6f12747207", "MT:LegalEase Montana/form-a.docx:968f68c78ce0d421b3751244bfcbd01c309eb7cea26027845b5e5dc6dbdb003d"], "offenseLevelRequired": true}}},
};
for (const [state, r1] of Object.entries(r1States)) for (const [route, row] of Object.entries(r1.routes)) {
  cases.push([row.questionRecordId, route, state]);
  if (r1.witnesses[route]) fixtures.push({ pathwayKey: `${state}:${route}`, ...r1.witnesses[route] });
}
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
  const r1Row=r1States[state]?.routes[route];
  const historyContext=r1Row?r1CategoryIsHistory:{OK:okCategoryAndRecordAreHistory,ME:maMeCategoryIsHistory,MA:maMeRoutes.includes(route)?maMeCategoryIsHistory:maAdditionalRoutes.includes(route)?maAdditionalCategoryIsHistory:maThreeRouteCategoryIsHistory,LA:laThreeRouteCategoryIsHistory,KY:kyThreeRouteCategoryIsHistory,HI:hiThreeRouteCategoryIsHistory,IA:iaCategoryIsHistory}[state]??alThreeRouteCategoryIsHistory;
  const hiCourtOrder=state==='HI'&&['dui-under-21-conviction','first-time-drug-conviction'].includes(route);
  const result=r1Row?r1Row.resultCode:state==='OK'?okExpectations[route].resultCode:['MA','ME'].includes(state)?{"adult-conviction-sealing-under-m-g-l-c-276-100a": "not_covered_yet", "automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c": "guidance_only", "court-requested-sealing-for-dismissal-or-nolle-prosequi-100c": "guidance_only", "juvenile-record-sealing-under-100b": "not_covered_yet", "marijuana-only-expungement": "guidance_only", "non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k": "guidance_only", "time-based-expungement-under-100f-100j": "not_covered_yet", "adult-conviction-sealing": "needs_more_info", "adult-non-conviction-record-relief": "guidance_only"}[route]:state==='LA'?(route==='non-conviction-arrest-expungement'?'packet_ready_with_caution':'guidance_only'):state==='KY'?(route==='misdemeanor-violation-traffic-conviction'?'not_covered_yet':'needs_review'):state==='HI'&&(route==='nonconviction-arrest-expungement'||hiCourtOrder)?'packet_ready_with_caution':state==='IA'&&route!=='minor-prostitution-7251'?'needs_review':'guidance_only';
  const payment=r1Row&&Object.hasOwn(r1Row,'paymentAllowed')?r1Row.paymentAllowed:result==='packet_ready_with_caution';
  const historySource=r1Row?'r1_category_history':{OK:'ok_category_history',ME:'ma_me_category_history',MA:maMeRoutes.includes(route)?'ma_me_category_history':maAdditionalRoutes.includes(route)?'ma_additional_category_history':'ma_three_route_category_history',LA:'la_three_route_category_history',KY:'ky_three_route_category_history',HI:'hi_three_route_category_history',IA:'ia_three_route_category_history'}[state]??'al_three_route_category_history';
  const historyReason=r1Row?r1States[state].reason:{OK:"Earlier Oklahoma categories remain optional literal history. Charge and statute, disposition, offense level, timing, court and applicable record-specific facts remain separate; a category does not establish statutory classification or eligibility.",ME:"These source-bound consumers use separate disposition, offense-level, timing and court facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility.",MA:maMeRoutes.includes(route)?"These source-bound consumers use separate disposition, offense-level, timing and court facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility.":"These source-bound Massachusetts consumers use separate disposition, offense-level, timing and court facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility.",LA:"These source-bound Louisiana consumers use separate disposition, charge, timing, redaction and automation-status facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility.",KY:"These source-bound Kentucky consumers use separate charge, disposition, offense-level and timing facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility.",HI:'These source-bound Hawaii consumers use separate disposition, charge and court-order facts. Earlier offense categories remain optional literal history and establish neither statutory classification nor eligibility.',IA:'These source-bound Iowa consumers use separate charge, disposition, age and timing facts. Earlier offense categories remain optional literal history and establish neither statutory classification nor eligibility.'}[state]??'These source-bound Alabama guidance consumers do not bind an offense category to a document. Earlier category answers remain optional literal history; disposition, pardon, trafficking and exclusion facts remain separate.';
  const witness=fixtures.find(f=>f.pathwayKey===`${state}:${route}`);assert(witness);
  // The HI conviction witnesses omit the required court-order confirmation; with it the paid packet opens.
  const answers=hiCourtOrder?{...structuredClone(witness.answers),hi_court_order_confirmed:'Yes'}:structuredClone(witness.answers);
  // Declared HI DUI successor: rule-09 belongs to the drug route; its sibling expectation stays fixed.
  const reason=r1Row?r1Row.reason:state==='OK'?okExpectations[route].reason:['MA','ME'].includes(state)?{"adult-conviction-sealing-under-m-g-l-c-276-100a": "ma.intentional_unsupported_route", "automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c": "ma.guidance_only_no_user_filed_court_petition", "court-requested-sealing-for-dismissal-or-nolle-prosequi-100c": "ma.lawrence_hold_guidance_only", "juvenile-record-sealing-under-100b": "ma.intentional_unsupported_route", "marijuana-only-expungement": "ma.lawrence_hold_guidance_only", "non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k": "ma.lawrence_hold_guidance_only", "time-based-expungement-under-100f-100j": "ma.intentional_unsupported_route", "adult-conviction-sealing": "me.route_identified_packet_not_yet_available", "adult-non-conviction-record-relief": "me.lawrence_hold_guidance_only"}[route]:state==='LA'?(route==='non-conviction-arrest-expungement'?'la.compiled_rule_match.rule-09-if-article-894-b-was-not-already-completed-but-appears-':route==='expungement-by-redaction-for-multi-person-records'?'la.lawrence_hold_guidance_only':'la.guidance_only_no_user_filed_court_petition'):state==='KY'?(result==='not_covered_yet'?'ky.intentional_unsupported_route':'ky.waiting_rule_not_executed'):hiCourtOrder?(route==='dui-under-21-conviction'?'hi.dui_pathway_context':'hi.compiled_rule_match.rule-09-the-source-identifies-hrs-706-622-5-and-706-622-8-first'):payment?'hi.compiled_rule_match.rule-04-a-complete-application-valid-government-photo-id-paymen':result==='needs_review'?'ia.waiting_rule_not_executed':state.toLowerCase()+'.guidance_only_no_user_filed_court_petition';
  const authoritative = evaluate({ jurisdiction: state, profileVersion: profile.profileVersion,
    matterId: `synthetic-${questionRecordId}`, answers });
  check(`${route}: exact conditional information authority`, () => {
    assert.equal(authoritative.evaluation.pathwayId, route);
    assert.equal(authoritative.evaluation.resultCode, result);
    assert.equal(authoritative.evaluation.reasons[0].code, reason);
    assert.equal(authoritative.evaluation.paymentAllowed, payment);
    assert.deepEqual(authoritative.evaluation.packetPlan.sourceFormIds,
      r1Row ? r1Row.sourceFormIds : state === 'OK' ? okExpectations[route].sourceFormIds : ['MA','ME'].includes(state) ? maSourceFormIds[route] : state === 'IA' && ['public-intoxication-12346', 'underage-alcohol-12347'].includes(route)
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
    if(r1Row?.offenseLevelRequired||state==='OK'||state==='HI'||state==='IA'||state==='KY'||state==='LA'||state==='MA'||state==='ME')assert.equal(m.questions.find(q=>q.id==='offense_level')?.required,true);
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
