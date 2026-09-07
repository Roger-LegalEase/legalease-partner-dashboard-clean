/** IL education-family participant completion, keyed to the actual printed forms.
 * ATJ2901.9 (06/26) item22; ATJ601.9 (08/25) sections3-5.
 * No eligibility calculation or participant/benefit/judicial attestation is supplied.
 */
import assert from "node:assert/strict";
export const EDUCATION_FIELD = "22 -  I have completed my last sentence and may now ask the court to seal eligible felony convictions because all of the following are true";
export const EDUCATION_COMPLETION = "Request page 5, item 22: leave unasserted until you truthfully confirm completion of your last sentence; a listed educational goal earned during the specified sentence, aftercare or mandatory-supervised-release period; the printed felony sentence condition (prison/jail or revoked conditional discharge/probation); no prior completion of that same goal; and proof actually attached. Check item 22 yourself only after every condition is true. A family selection, planned attachment or unverified claim is not evidence.";
export const WAIVER_COMPLETION = "A fee-waiver request is your choice, not an effect of sponsorship or a missing email. When requested, submit the complete Application and its three-page Order together. The judge alone completes the Order's decisions, financial findings, payment terms, hearing information, signature and date. On the Application, truthfully select any qualifying benefits you receive in section 3. If at least one applies, follow the printed page-2 choice and skip sections 4 and 5, going to section 6. Otherwise complete the applicable section-4 financial information. Section 5 hardship is optional, even on that path. No benefit is selected for you.";
const base=(label,reason)=>({effectiveLabel:label,reason,role:"participant",factAvailable:false,routeDetermined:false});
export function isOptionalEmail(documentId,name) {
  return ["EXP-AD Request","EXP-AD Order Granting","EXP-AD Order Denying","FW-CIV-APPLICATION"].includes(documentId)
    && /email/i.test(name) && !/lawyer/i.test(name);
}
export function fieldCompletionPolicy(documentId,name,facts) {
  if(documentId==="EXP-AD Request" && name===EDUCATION_FIELD)
    return {...base("Request page 5, item 22: education, last sentence and attached proof",EDUCATION_COMPLETION),
      isSelectionControl:true,completenessDisposition:"REQUIRED_BEFORE_FILING",requiredBeforeFiling:true,
      completionActor:"participant",noAutomaticAttestation:true};
  if(isOptionalEmail(documentId,name) && !facts.email?.trim())
    return {...base("Email, if you have one","The participant has not supplied an optional email. No address is synthesized."),
      completenessDisposition:"OPTIONAL_PARTICIPANT_CONTENT",requiredBeforeFiling:false};
  if(documentId==="FW-CIV-APPLICATION") {
    const section4=/^(?:1[6-9]|[2-9]\d|10[0-6])\s*-/.test(name);
    const hardship=name==="107-110 - Hardship";
    if((section4||hardship) && facts.feeBenefitStatus==="qualifying")
      return {...base(hardship?"Section 5: optional hardship":"Section 4: financial details",
        "Confirmed qualifying-benefit path: the printed page-2 instruction skips sections 4 and 5. The participant must still truthfully identify the benefit in section 3."),
        completenessDisposition:"NOT_APPLICABLE_ON_THIS_ROUTE",requiredBeforeFiling:false,
        routeConditionThatMakesItInapplicable:"ATJ601.9 page2: a qualifying section-3 benefit applies; skip sections4 and5."};
    if(hardship && !facts.hardship?.trim()) return {...base("Section 5: hardship information (optional)","The printed form expressly makes hardship optional."),
      completenessDisposition:"OPTIONAL_PARTICIPANT_CONTENT",requiredBeforeFiling:false};
    if(section4) return {...base("Section 4: applicable financial information",
        "Only when no qualifying section-3 benefit applies: complete the applicable income, expense and asset questions and amounts; do not invent a zero or fill a category that does not apply."),
        completenessDisposition:"REQUIRED_BEFORE_FILING",requiredBeforeFiling:true,
        requiredWhen:"No qualifying section-3 benefit applies; supply only amounts/details for applicable categories."};
  }
  return null;
}
export function expectedComponents(facts) {
  const result=["EXP-AD Request","EXP-AD Case List","EXP-AD Order Granting","EXP-AD Order Denying"];
  if(facts.waiverRequested===true) result.push("FW-CIV-APPLICATION","FW-CIV-ORDER");
  return result;
}
export function assertFullComponentSet(sources,facts) {
  const actual=sources.map(s=>s.documentId),expected=expectedComponents(facts);
  const missing=expected.filter(id=>!actual.includes(id));
  assert.equal(missing.length,0,`MISSING_REQUIRED_COMPONENT: ${missing.join(", ")}`);
  assert.deepEqual(actual,expected,"Incorrect component order, duplicate or unrequested fee-waiver component");
}
