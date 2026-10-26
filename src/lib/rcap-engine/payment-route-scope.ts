import { scalarAnswerText } from "@/lib/expungement-ai/question-answer-state";
import type { ScreeningEvaluation } from "@/lib/rcap-engine/contracts";

// F-NE-2: Lead 2026-10-21 21:45–22:25; exact 158 route/rule/outcome groups, manifest 5c3f5f1f.
const HELD_OUTCOMES: Readonly<Record<string, readonly string[]>> = {
  "AR:situation-b-misdemeanor-convictions:rule-07-there-is-no-limit-on-how-many-misdemeanors-may-be-seale":
    ["acquitted", "arrest_no_charge", "dismissed"],
  "AR:situation-c-felony-convictions:rule-15-lists-felony-seal-on-completion-if-eligible-and-not-ove":
    ["acquitted", "arrest_no_charge", "dismissed"],
  "DC:dc_actual_innocence_expungement_16_803:rule-07-expungement-by-motion-d-c-code-16-803-actual-innocence":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other", "juvenile"],
  "IA:nonconviction-901c2:rule-02-all-court-costs-fees-and-other-financial-obligations-fo":
    ["convicted_misdemeanor", "convicted_other", "juvenile"],
  "NE:set-aside-probation-fine-community-service:rule-05-the-sentence-conditions-must-be-satisfactorily-complete":
    ["acquitted", "arrest_no_charge", "dismissed", "diversion_or_deferred", "juvenile", "pardon"],
  "VA:petition-based-sealing:rule-13-petition-based-sealing-19-2-392-12-12-1":
    ["acquitted", "pardon"],
  "WI:adult-conviction-expungement-under-wis-stat-973-015:rule-03-adult-misdemeanor-or-class-h-i-felony-under-25-sentenci":
    ["acquitted", "dismissed", "juvenile", "pardon"],
  "AR:situation-b-misdemeanor-convictions:route-situation-b-misdemeanor-convictions":
    ["convicted_felony", "convicted_other"],
  "AR:situation-c-felony-convictions:route-situation-c-felony-convictions":
    ["convicted_misdemeanor", "convicted_other"],
  "CO:petition-based-non-conviction-sealing-jdf-417-24-72-704:route-petition-based-non-conviction-sealing-jdf-417-24-72-704":
    ["juvenile"],
  "CT:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202:route-petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202":
    ["acquitted", "dismissed", "diversion_or_deferred"],
  "FL:court-ordered-expunction-943-0585:route-court-ordered-expunction-943-0585":
    ["diversion_or_deferred"],
  "HI:dui-under-21-conviction:route-dui-under-21-conviction":
    ["convicted_felony", "convicted_other", "juvenile"],
  "IA:nonconviction-901c2:route-nonconviction-901c2":
    ["diversion_or_deferred"],
  "ID:withheld-judgment-idaho-code-19-2604-review-branch:route-withheld-judgment-idaho-code-19-2604-review-branch":
    ["acquitted", "convicted_other", "dismissed"],
  "LA:felony-article-893-e-set-aside-followed-by-expungement:route-felony-article-893-e-set-aside-followed-by-expungement":
    ["acquitted", "convicted_misdemeanor", "convicted_other", "dismissed", "diversion_or_deferred", "juvenile"],
  "LA:misdemeanor-article-894-b-set-aside-followed-by-expungement:route-misdemeanor-article-894-b-set-aside-followed-by-expungement":
    ["acquitted", "convicted_felony", "convicted_other", "dismissed", "diversion_or_deferred"],
  "LA:non-conviction-arrest-expungement:route-non-conviction-arrest-expungement":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other"],
  "MD:adult-non-conviction-expungement-under-crim-proc-10-105:route-adult-non-conviction-expungement-under-crim-proc-10-105":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other", "juvenile"],
  "MI:misdemeanor-marijuana-set-aside-under-mcl-780-621e:route-misdemeanor-marijuana-set-aside-under-mcl-780-621e":
    ["convicted_felony", "convicted_other", "juvenile"],
  "MN:petition-based-expungement-under-609a-02-03:route-petition-based-expungement-under-609a-02-03":
    ["arrest_no_charge"],
  "MO:general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140:route-general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140":
    ["juvenile"],
  "MO:stolen-or-mistaken-identity-expungement-under-610-145:route-stolen-or-mistaken-identity-expungement-under-610-145":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other", "juvenile"],
  "MS:first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1:route-first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1":
    ["dismissed"],
  "MS:first-offense-dui-expungement:route-first-offense-dui-expungement":
    ["convicted_felony", "convicted_other", "dismissed", "juvenile"],
  "MS:minor-in-possession-underage-alcohol-expungement:route-minor-in-possession-underage-alcohol-expungement":
    ["juvenile"],
  "MT:marijuana-related-redesignation-expungement-under-mmrta:route-marijuana-related-redesignation-expungement-under-mmrta":
    ["dismissed", "diversion_or_deferred"],
  "MT:misdemeanor-conviction-expungement-under-mont-code-46-18-1104:route-misdemeanor-conviction-expungement-under-mont-code-46-18-1104":
    ["convicted_other", "dismissed", "diversion_or_deferred"],
  "NC:dismissal-and-not-guilty-expunction-under-g-s-15a-146:route-dismissal-and-not-guilty-expunction-under-g-s-15a-146":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other", "diversion_or_deferred"],
  "ND:deferred-imposition-dismissal-and-sealing:route-deferred-imposition-dismissal-and-sealing":
    ["acquitted", "convicted_felony", "convicted_misdemeanor", "convicted_other", "dismissed"],
  "ND:deferred-imposition-dismissal-and-sealing:rule-29-path-d-deferred-imposition-of-sentence-dismissal":
    ["dismissed"],
  "ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1:route-general-conviction-sealing-under-n-d-c-c-chapter-12-60-1":
    ["acquitted", "dismissed"],
  "ND:marijuana-specific-summary-pardon-or-sealing-relief:route-marijuana-specific-summary-pardon-or-sealing-relief":
    ["acquitted", "convicted_felony", "convicted_other", "dismissed", "juvenile"],
  "NH:annulment-after-dismissal-acquittal-or-nonprosecution:route-annulment-after-dismissal-acquittal-or-nonprosecution":
    ["convicted_other"],
  "NJ:arrest-dismissal-and-other-non-conviction-expungement-under-n-j-s-a-2c-52-6:route-arrest-dismissal-and-other-non-conviction-expungement-under-n-j-s-a-2c-52-6":
    ["convicted_felony", "convicted_other", "juvenile"],
  "NM:cannabis-sentence-dismissal-incarcerated-person-pathway:route-cannabis-sentence-dismissal-incarcerated-person-pathway":
    ["dismissed"],
  "NM:no-conviction-released-without-conviction:route-no-conviction-released-without-conviction":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other"],
  "NV:general-conviction-record-sealing-under-nrs-179-245:route-general-conviction-record-sealing-under-nrs-179-245":
    ["acquitted", "arrest_no_charge", "dismissed", "juvenile"],
  "OH:adult-non-conviction-sealing-or-expungement-under-2953-33:route-adult-non-conviction-sealing-or-expungement-under-2953-33":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other"],
  "OH:adult-non-conviction-sealing-or-expungement-under-2953-33:rule-05-grand-jury-no-bill-non-conviction-sealing-or-expungemen":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other"],
  "OK:acquittal-dismissal-or-other-no-conviction-expungement:route-acquittal-dismissal-or-other-no-conviction-expungement":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other", "diversion_or_deferred", "juvenile"],
  "PA:path-a-non-conviction-expungement:route-path-a-non-conviction-expungement":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other"],
  "SD:adult-arrest-record-expungement-under-sdcl-23a-3-27:route-adult-arrest-record-expungement-under-sdcl-23a-3-27":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other"],
  "TN:pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106:route-pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other", "diversion_or_deferred"],
  "TX:expunction-after-acquittal-not-guilty-disposition-chapter-55a:route-expunction-after-acquittal-not-guilty-disposition-chapter-55a":
    ["arrest_no_charge", "convicted_other", "dismissed", "diversion_or_deferred"],
  "UT:path-i-traffic-offense-expungement-or-deletion:route-path-i-traffic-offense-expungement-or-deletion":
    ["acquitted", "convicted_felony", "convicted_other", "dismissed"],
  "VA:regime-1-expungement-available-now:route-regime-1-expungement-available-now":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other", "diversion_or_deferred", "pardon"],
  "VT:dui-sealing:route-dui-sealing":
    ["acquitted", "convicted_other", "dismissed", "juvenile"],
  "WA:non-conviction-record-deletion-under-rcw-10-97-060:route-non-conviction-record-deletion-under-rcw-10-97-060":
    ["convicted_felony", "convicted_misdemeanor", "convicted_other", "diversion_or_deferred", "juvenile"],
  "WI:adult-conviction-expungement-under-wis-stat-973-015:route-adult-conviction-expungement-under-wis-stat-973-015":
    ["convicted_other", "dismissed", "juvenile"],
  "WV:accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a:route-accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a":
    ["acquitted", "dismissed", "diversion_or_deferred", "juvenile"],
};

export function explicitConvictionLevelConflict(answers: Record<string, unknown>): boolean {
  const outcome = answers.case_outcome, level = answers.offense_level;
  if ([outcome, level].some(value => value && typeof value === "object" && "unknown" in value && value.unknown === true)) return false;
  const caseOutcome = scalarAnswerText(outcome), offenseLevel = scalarAnswerText(level);
  return caseOutcome === "Felony conviction" && offenseLevel === "Misdemeanor"
    || caseOutcome === "Misdemeanor conviction" && offenseLevel === "Felony";
}

export function paymentRouteScopeHeld(evaluation: Pick<ScreeningEvaluation, "jurisdiction" | "pathwayId" | "reasons">,
  outcome: string, answers: Record<string, unknown>): boolean {
  if (explicitConvictionLevelConflict(answers)) return true;
  const prefix = `${evaluation.jurisdiction.toLowerCase()}.compiled_rule_match.`;
  const rule = evaluation.reasons.find(reason => reason.code.startsWith(prefix))?.code.slice(prefix.length);
  return !!rule && !!HELD_OUTCOMES[`${evaluation.jurisdiction}:${evaluation.pathwayId}:${rule}`]?.includes(outcome);
}
