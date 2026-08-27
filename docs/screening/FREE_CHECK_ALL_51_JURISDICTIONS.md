# Expungement.ai Free Check — 50 States + D.C.

**Basis:** paused nationwide checkpoint `2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3`.

This is the normalized free-check design. Exact dates, court and case identifiers, records, service details, and official-form fields are deferred until the participant creates or signs into an account, owns a persistent Briefcase matter, completes packet information, and undergoes final verification.

## Shared logic across every jurisdiction

1. Confirm the participant is asking about their own record.
2. Confirm the matter belongs to the selected state and is not federal.
3. Use case outcome, offense level/type, and likely pathway to identify candidate routes.
4. Ask state-specific, special-pathway, timing, completion, pending-case, prior-relief, and exclusion questions only while their route remains viable.
5. Use approximate timing during the free check. Collect exact dates later.
6. Return a preliminary packet path, more-information result, not-yet result, automatic/no-filing guidance, review/referral, or unsupported result.
7. Require account creation or sign-in before creating the persistent Briefcase matter.

## Alaska (AK)

**Candidate pathways:** Set-aside after a Suspended Imposition of Sentence (AS 12.55.085); Sealing for mistaken identity or false accusation (AS 12.62.180); Confidentiality of acquittals and dismissals (AS 22.35.030 / Administrative Rule 40); Juvenile-record sealing (AS 47.12.300); Executive-pardon backstop

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Alaska, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Alaska case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Alaska descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
8. **Was the arrest or record caused by mistaken identity, identity theft, or law-enforcement error?**  
   *When:* Ask only while an identity-correction route remains viable.  
   *Effect:* Yes routes to correction/sealing logic distinct from ordinary conviction relief.
9. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
10. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
11. **Does the record involve any Alaska category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Alaska state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/AK-alaska.json

## Alabama (AL)

**Candidate pathways:** Non-conviction expungement under Ala. Code §§ 15-27-1(a) and 15-27-2(a); Eligible conviction expungement under the REDEEMER Act; Pardoned felony expungement under Ala. Code § 15-27-2(c); Human-trafficking-victim expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Alabama, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Alabama case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Alabama descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
7. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
8. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
9. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
10. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
11. **Does the record involve any Alabama category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Alabama state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/AL-alabama.json

## Arkansas (AR)

**Candidate pathways:** Situation A — Non-convictions (§§ 16-90-1409, 1410); Situation B — Misdemeanor convictions (§ 16-90-1405); Situation C — Felony convictions (§§ 16-90-1406, 1407)

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Arkansas, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Arkansas case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Arkansas descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
7. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
8. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
9. **Does the record involve any Arkansas category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Arkansas state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** likely_not_eligible; needs_more_info; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/AR-arkansas.json

## Arizona (AZ)

**Candidate pathways:** Remedy 1 — Record sealing (A.R.S. § 13-911); Remedy 2 — Set-aside of a conviction (A.R.S. § 13-905); Remedy 3 — Marijuana expungement (A.R.S. § 36-2862, Prop 207)

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Arizona, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Arizona case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Arizona descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
7. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
8. **Does the record involve any Arizona category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Arizona state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/AZ-arizona.json

## California (CA)

**Candidate pathways:** Tool 1 — Dismissal / set-aside (PC 1203.4 and variants); Tool 2 — Automatic relief (PC 851.93 arrests / 1203.425 convictions); Tool 3 — Petition-based felony sealing (SB 731 / PC 1203.49 framework); Tool 4 — Arrest-record sealing (PC 851.91; factual innocence PC 851.8); Tool 5 — Proposition 64 marijuana relief (H&S 11361.8 / 11361.9)

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from California, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the California case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these California descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
7. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
8. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
9. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
10. **Does the record involve any California category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and California state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/CA-california.json

## Colorado (CO)

**Candidate pathways:** Petition-based non-conviction sealing (JDF 417 / § 24-72-704); Petition-based conviction sealing (JDF 612 / § 24-72-706); Automatic Clean Slate sealing (§ 13-3-117); Juvenile expungement (§ 19-1-306)

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Colorado, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Colorado case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Colorado descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
8. **Does the record involve any Colorado category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Colorado state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/CO-colorado.json

## Connecticut (CT)

**Candidate pathways:** Automatic non-conviction erasure under Conn. Gen. Stat. § 54-142a; Automatic Clean Slate erasure for eligible post-2000 convictions; Petitioned Clean Slate erasure for eligible pre-2000 convictions (JD-CR-202); Cannabis-conviction erasure; Absolute pardon resulting in erasure

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Connecticut, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Connecticut case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Connecticut descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
7. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
8. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
9. **Does the record involve any Connecticut category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Connecticut state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_more_info; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/CT-connecticut.json

## District of Columbia (DC)

**Candidate pathways:** Automatic expungement under D.C. Code § 16-802; Actual-innocence expungement by motion under D.C. Code § 16-803; Automatic sealing under D.C. Code § 16-805; Non-conviction sealing by motion under D.C. Code § 16-806; Fugitive-from-justice sealing; Conviction sealing by motion under D.C. Code § 16-806; Incorrect-identity or mistaken-arrest record correction; Juvenile-record sealing under D.C. Code § 16-2335

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from District of Columbia, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the District of Columbia case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these District of Columbia descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
8. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and District of Columbia state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/DC-district-of-columbia.json

## Delaware (DE)

**Candidate pathways:** Mandatory and automatic expungement under 11 Del. C. §§ 4373 and 4373A; Discretionary court expungement under 11 Del. C. § 4374; Pardon-based discretionary expungement under 11 Del. C. § 4375; Juvenile expungement under 10 Del. C. §§ 1017–1019 / 1017A

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Delaware, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Delaware case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Delaware descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
7. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
8. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
9. **Does the record involve any Delaware category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Delaware state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/DE-delaware.json

## Florida (FL)

**Candidate pathways:** Court-ordered expunction - 943.0585; Court-ordered sealing - 943.059; Automatic sealing - 943.0595; Human trafficking victim expunction - 943.0583; Lawful self-defense expunction - 943.0578; Juvenile diversion expunction - 943.0582; Early juvenile expunction - 943.0515; Administrative expunction - mistaken or unlawful arrest

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Florida, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Florida case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Florida descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Have you previously received record-clearing relief in Florida or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
8. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
9. **Was the arrest or record caused by mistaken identity, identity theft, or law-enforcement error?**  
   *When:* Ask only while an identity-correction route remains viable.  
   *Effect:* Yes routes to correction/sealing logic distinct from ordinary conviction relief.
10. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
11. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
12. **Does the record involve any Florida category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Florida state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/FL-florida.json

## Georgia (GA)

**Candidate pathways:** Non-conviction record restriction through the agency/prosecutor process; Automatic restriction of qualifying post-July 1, 2013 non-convictions; SB 288 misdemeanor-conviction restriction and sealing; Restriction and sealing of a pardoned felony; Youthful / first-offender restriction route

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Georgia, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Georgia case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Georgia descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you previously received record-clearing relief in Georgia or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
7. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
8. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
9. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
10. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
11. **Does the record involve any Georgia category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Georgia state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/GA-georgia.json

## Hawaii (HI)

**Candidate pathways:** Non-conviction arrest-information expungement under HRS § 831-3.2; Deferred acceptance dismissal — general one-year route; Deferred acceptance dismissal — HRS § 712-1200 three-year route; First-time drug-offender conviction expungement; DUI under age 21 conviction expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Hawaii, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Hawaii case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Hawaii descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Hawaii state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** needs_review; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/HI-hawaii.json

## Iowa (IA)

**Candidate pathways:** Acquittal or all-charges-dismissed expungement under Iowa Code § 901C.2; Misdemeanor conviction expungement under Iowa Code § 901C.3; Public-intoxication conviction expungement under Iowa Code § 123.46; Underage-alcohol conviction expungement under Iowa Code § 123.47; Prostitution conviction expungement for conduct while under 18 under Iowa Code § 725.1

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Iowa, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Iowa case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Iowa descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Have you previously received record-clearing relief in Iowa or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
8. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
9. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Iowa state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/IA-iowa.json

## Idaho (ID)

**Candidate pathways:** Non-conviction fingerprint and criminal-history expungement under Idaho Code § 67-3004(10); Clean Slate shielding under Idaho Code § 67-3004(11); Withheld-judgment / Idaho Code § 19-2604 review branch; Juvenile expungement; Human-trafficking-survivor vacatur and expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Idaho, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Idaho case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Idaho descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you previously received record-clearing relief in Idaho or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
7. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
8. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Idaho state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_more_info; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/ID-idaho.json

## Illinois (IL)

**Candidate pathways:** Adult non-conviction expungement; Expungement after eligible supervision or qualified probation; Adult conviction sealing; Cannabis-specific automatic or petition expungement; Human-trafficking-survivor vacatur and expungement; Felony-prostitution relief; Criminal identity-theft / mistaken-identity relief; Juvenile automatic or petition expungement; Clean Slate automatic sealing

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Illinois, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Illinois case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Illinois descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
8. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
9. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
10. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
11. **Does the record involve any Illinois category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Illinois state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/IL-illinois.json

## Indiana (IN)

**Candidate pathways:** Non-conviction arrest or criminal-charge expungement; Juvenile-allegation expungement; Conviction expungement with sealed/confidential access; Conviction expungement with records marked expunged

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Indiana, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Indiana case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **Do any of these Indiana descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
5. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
6. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
7. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
8. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Indiana state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** needs_more_info; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/IN-indiana.json

## Kansas (KS)

**Candidate pathways:** Conviction or diversion expungement under K.S.A. 21-6614; Specialty-court completion route; Prostitution offense committed under coercion; Drug-offender registration relief coordinated with expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Kansas, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Kansas case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Kansas descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
7. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Kansas state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_more_info; needs_review; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/KS-kansas.json

## Kentucky (KY)

**Candidate pathways:** Misdemeanor, violation, or traffic-infraction conviction expungement under KRS 431.078; Eligible felony conviction vacatur and expungement under KRS 431.073; Acquittal, dismissal, or failure-to-indict expungement under KRS 431.076; Juvenile automatic expungement on qualifying dismissal; Juvenile petition to vacate and expunge under KRS 610.330

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Kentucky, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Kentucky case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Kentucky descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
8. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
9. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Kentucky state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/KY-kentucky.json

## Louisiana (LA)

**Candidate pathways:** Non-conviction arrest expungement; Misdemeanor Article 894(B) set-aside followed by expungement; Misdemeanor five-year clean-period expungement; First-offense marijuana expungement after 90 days (Art. 998); Felony Article 893(E) set-aside followed by expungement; Felony ten-year clean-period expungement; First-offender-pardon felony expungement; Interim expungement of a felony arrest reduced to a misdemeanor conviction; Expungement by redaction for multi-person records; Human-trafficking-survivor expungement / fee-exempt route; Immediate expungement after successful court-program completion (Art. 985.3); Automated-expungement status verification (Art. 985.2)

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Louisiana, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Louisiana case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Louisiana descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
7. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
8. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
9. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Louisiana state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_review; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/LA-louisiana.json

## Massachusetts (MA)

**Candidate pathways:** Adult conviction sealing under M.G.L. c. 276, § 100A; Automatic non-conviction sealing for not-guilty, no-bill, or no-probable-cause outcomes (§ 100C); Court-requested sealing for dismissal or nolle prosequi (§ 100C); Juvenile record sealing under § 100B; Time-based expungement under §§ 100F–100J; Non-time-based expungement for false identity, error, fraud, or decriminalized conduct (§ 100K); Marijuana-only expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Massachusetts, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Massachusetts case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Massachusetts descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Was the arrest or record caused by mistaken identity, identity theft, or law-enforcement error?**  
   *When:* Ask only while an identity-correction route remains viable.  
   *Effect:* Yes routes to correction/sealing logic distinct from ordinary conviction relief.
8. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
9. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Massachusetts state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/MA-massachusetts.json

## Maryland (MD)

**Candidate pathways:** Adult non-conviction expungement under Crim. Proc. § 10-105; Automatic expungement under Crim. Proc. § 10-105.1; Police-record expungement when no charge was filed under § 10-103; Eligible conviction expungement under Crim. Proc. § 10-110; Cannabis-specific expungement; Second Chance Act shielding; Juvenile expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Maryland, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Maryland case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Maryland descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Have you previously received record-clearing relief in Maryland or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
8. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
9. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
10. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
11. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
12. **Does the record involve any Maryland category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Maryland state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/MD-maryland.json

## Maine (ME)

**Candidate pathways:** Adult conviction sealing; Sex-trafficking / sexual-exploitation-survivor sealing; Adult non-conviction record relief; Pardon route; Juvenile sealing

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Maine, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Maine case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Maine descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
8. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
9. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
10. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
11. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Maine state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/ME-maine.json

## Michigan (MI)

**Candidate pathways:** Set-aside by application under MCL 780.621; Automatic Clean Slate set-aside under MCL 780.621g; Misdemeanor marijuana set-aside under MCL 780.621e; First-offense OWI set-aside by application; Human-trafficking-related set-aside application

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Michigan, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Michigan case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Michigan descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you previously received record-clearing relief in Michigan or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
7. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
8. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
9. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
10. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
11. **Does the record involve any Michigan category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Michigan state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/MI-michigan.json

## Minnesota (MN)

**Candidate pathways:** Arrest-identification-data destruction when no charges were filed (Minn. Stat. § 299C.11); Automatic mistaken-identity expungement under § 609A.017; Automatic Clean Slate expungement under § 609A.015; Cannabis automatic or board-reviewed expungement under §§ 609A.055–.06; Prosecutor-agreed sealing without a full petition under § 609A.025; Petition-based expungement under §§ 609A.02–.03

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Minnesota, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Minnesota case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Minnesota descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Was the arrest or record caused by mistaken identity, identity theft, or law-enforcement error?**  
   *When:* Ask only while an identity-correction route remains viable.  
   *Effect:* Yes routes to correction/sealing logic distinct from ordinary conviction relief.
7. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
8. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
9. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Minnesota state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/MN-minnesota.json

## Missouri (MO)

**Candidate pathways:** General arrest, charge, plea, trial, or conviction expungement under RSMo § 610.140; Closed-record outcome under RSMo § 610.105; False-information or qualifying arrest-record expungement under §§ 610.122–.123; First intoxication-related traffic or boating expungement under § 610.130; Marijuana expungement under Missouri Constitution article XIV; Stolen- or mistaken-identity expungement under § 610.145; First minor-in-possession alcohol expungement under § 311.326

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Missouri, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Missouri case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Missouri descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you previously received record-clearing relief in Missouri or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
7. **Was the arrest or record caused by mistaken identity, identity theft, or law-enforcement error?**  
   *When:* Ask only while an identity-correction route remains viable.  
   *Effect:* Yes routes to correction/sealing logic distinct from ordinary conviction relief.
8. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
9. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
10. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
11. **Does the record involve any Missouri category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Missouri state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/MO-missouri.json

## Mississippi (MS)

**Candidate pathways:** Non-conviction expungement for dismissal, no disposition, or acquittal; Uncharged or unprosecuted misdemeanor after 12 months (§ 99-15-59); First-offender nontraffic misdemeanor conviction expungement (§ 99-19-71(1)); Additional justice- or municipal-court misdemeanor relief; Eligible felony-conviction expungement (§ 99-19-71); Nonadjudication under § 99-15-26; Pretrial intervention or diversion expungement; First-offense controlled-substance conditional-discharge relief; Intervention-court completion expungement; First-offense DUI expungement; DUI nonadjudication; Minor-in-possession / underage-alcohol expungement; Human-trafficking-survivor vacatur and expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Mississippi, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Mississippi case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Mississippi descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Mississippi state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_more_info; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/MS-mississippi.json

## Montana (MT)

**Candidate pathways:** Misdemeanor-conviction expungement under Mont. Code § 46-18-1104; Non-conviction criminal-history removal through CRISS; Deferred-sentence dismissal or confidentiality route; Marijuana-related redesignation / expungement under MMRTA; DOJ record-removal / update request

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Montana, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Montana case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Montana descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Have you previously received record-clearing relief in Montana or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
8. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
9. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
10. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
11. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Montana state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; hard_stop; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/MT-montana.json

## North Carolina (NC)

**Candidate pathways:** Dismissal and not-guilty expunction under G.S. 15A-146; Nonviolent conviction expunction under G.S. 15A-145.5; Youthful / pre-Raise-the-Age expunction under G.S. 15A-145.8A and related statutes

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from North Carolina, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the North Carolina case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these North Carolina descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you previously received record-clearing relief in North Carolina or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
7. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
8. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
9. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
10. **Does the record involve any North Carolina category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and North Carolina state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/NC-north-carolina.json

## North Dakota (ND)

**Candidate pathways:** General conviction sealing under N.D.C.C. chapter 12-60.1; Non-conviction court-record closing under N.D.C.C. § 12-60.1-05; DUI-record sealing under the separate DUI statute; Deferred-imposition dismissal and sealing; First-offense possession sealing; Marijuana-specific summary-pardon or sealing relief

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from North Dakota, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the North Dakota case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these North Dakota descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and North Dakota state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/ND-north-dakota.json

## Nebraska (NE)

**Candidate pathways:** Automatic/time-based sealing of non-conviction records under § 29-3523; Conviction set-aside after probation, fine-only sentence, or community service under § 29-2264(2); Conviction set-aside after incarceration of one year or less under § 29-2264(3); Trafficking-survivor set-aside and sealing under § 29-3005; Pardon followed by motion to seal under § 29-3523(5); True expungement for arrest caused by law-enforcement error under § 29-3523(6); Juvenile automatic sealing under §§ 43-2,108.01 to 43-2,108.05; Juvenile petition-based sealing backstop

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Nebraska, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Nebraska case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Nebraska descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
8. **Was the arrest or record caused by mistaken identity, identity theft, or law-enforcement error?**  
   *When:* Ask only while an identity-correction route remains viable.  
   *Effect:* Yes routes to correction/sealing logic distinct from ordinary conviction relief.
9. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
10. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
11. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Nebraska state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_more_info; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/NE-nebraska.json

## New Hampshire (NH)

**Candidate pathways:** Annulment after dismissal, acquittal, or nonprosecution; Annulment of a vacated conviction; Conviction annulment under RSA 651:5; Marijuana-possession annulment under RSA 651:5-b; DWI / DUI annulment; Out-of-state, federal, or military record guidance

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from New Hampshire, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the New Hampshire case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these New Hampshire descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
7. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and New Hampshire state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_covered_yet; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/NH-new-hampshire.json

## New Jersey (NJ)

**Candidate pathways:** Regular expungement under N.J.S.A. 2C:52-2 / 2C:52-3; Clean Slate petition under N.J.S.A. 2C:52-5.3; Marijuana / hashish expungement under N.J.S.A. 2C:52-5.1, -5.2, and -6.1; Arrest, dismissal, and other non-conviction expungement under N.J.S.A. 2C:52-6

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from New Jersey, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the New Jersey case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these New Jersey descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Have you previously received record-clearing relief in New Jersey or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
8. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
9. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
10. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
11. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
12. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
13. **Does the record involve any New Jersey category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and New Jersey state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/NJ-new-jersey.json

## New Mexico (NM)

**Candidate pathways:** No conviction / released without conviction; Conviction; Cannabis expungement; Cannabis sentence dismissal / incarcerated-person pathway; DNA sample/profile expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from New Mexico, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the New Mexico case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these New Mexico descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Was the arrest or record caused by mistaken identity, identity theft, or law-enforcement error?**  
   *When:* Ask only while an identity-correction route remains viable.  
   *Effect:* Yes routes to correction/sealing logic distinct from ordinary conviction relief.
8. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
9. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
10. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and New Mexico state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/NM-new-mexico.json

## Nevada (NV)

**Candidate pathways:** General conviction-record sealing under NRS 179.245; Deferred-judgment dismissal and sealing under NRS 176.211; Probation or specialty-court dismissal / set-aside sealing; Reentry-program sealing under NRS 179.259; Trafficking-victim vacatur and sealing under NRS 179.247; Controlled-substance possession sealing under NRS 453.3365; Non-conviction record sealing

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Nevada, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Nevada case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Nevada descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
7. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
8. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
9. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Nevada state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/NV-nevada.json

## New York (NY)

**Candidate pathways:** Automatic non-conviction sealing under CPL 160.50 / 160.55; Marijuana-record destruction under the MRTA; Conditional / treatment sealing under CPL 160.58; Discretionary conviction sealing by petition under CPL 160.59; Automatic Clean Slate sealing under CPL 160.57

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from New York, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the New York case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these New York descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
7. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
8. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
9. **Does the record involve any New York category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and New York state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/NY-new-york.json

## Ohio (OH)

**Candidate pathways:** Adult conviction sealing or expungement under Ohio Rev. Code § 2953.32; Adult non-conviction sealing or expungement under § 2953.33; Marijuana / hashish possession expungement under § 2953.321; Human-trafficking-survivor conviction expungement under § 2953.36; Human-trafficking-survivor non-conviction expungement under § 2953.521; Certain firearm / carry conviction expungement under § 2953.35; Juvenile sealing and expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Ohio, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Ohio case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Ohio descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
8. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
9. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
10. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
11. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Ohio state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/OH-ohio.json

## Oklahoma (OK)

**Candidate pathways:** Arrest with no charges filed; Acquittal, dismissal, or other no-conviction expungement; Conviction reversed and case dismissed; DNA factual-innocence expungement; Misdemeanor deferred-dismissal expungement; Nonviolent-felony deferred-dismissal expungement; Up-to-two-felony deferred-dismissal expungement; Fine-only misdemeanor conviction expungement; Other eligible misdemeanor-conviction expungement; One eligible nonviolent-felony conviction expungement; Not-more-than-two eligible felony convictions expungement; Felony reclassified as a misdemeanor; Pardon-based expungement; Deferred-sentence court-record expungement under § 991(c); Clean Slate automatic expungement; Human-trafficking-survivor relief; Victim Protective Order record relief; Juvenile record expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Oklahoma, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Oklahoma case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Oklahoma descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
8. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
9. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
10. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Oklahoma state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_more_info; needs_review; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/OK-oklahoma.json

## Oregon (OR)

**Candidate pathways:** Set-aside of arrests or charges without conviction under ORS 137.225(1)(c); Set-aside of eligible convictions under ORS 137.225(1)(a); Marijuana-specific set-aside / redesignation

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Oregon, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Oregon case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Oregon descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
7. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
8. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
9. **Does the record involve any Oregon category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Oregon state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/OR-oregon.json

## Pennsylvania (PA)

**Candidate pathways:** Path A — Non-conviction expungement; Path B — Complete-acquittal / not-guilty expungement; Path C — Summary-conviction expungement; Path D — ARD expungement; Path E — Age-70 expungement; Path F — Deceased-person expungement; Path G — Underage-drinking conviction expungement; Path H — Pardon-based expungement; Path I — Petition for limited access; Path J — Clean Slate automatic limited access; Path K — Human-trafficking vacatur / expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Pennsylvania, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Pennsylvania case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Pennsylvania descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Pennsylvania state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_more_info; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/PA-pennsylvania.json

## Rhode Island (RI)

**Candidate pathways:** Path A — First-offender conviction expungement; Path B — Multiple-misdemeanor expungement; Path C — Deferred-sentence expungement; Path D — Non-conviction sealing / expungement; Path E — Filed-complaint relief under § 12-10-12; Path F — Marijuana-possession expungement; Path G — Decriminalized-offense expungement; Path H — Commercial-sexual-activity-related expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Rhode Island, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Rhode Island case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Rhode Island descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Rhode Island state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_more_info; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/RI-rhode-island.json

## South Carolina (SC)

**Candidate pathways:** General Sessions non-conviction expungement; Summary-court non-conviction expungement; Diversion or program-completion expungement; Eligible conviction expungement; Human-trafficking-survivor expungement; Juvenile expungement; Pardon guidance for otherwise ineligible convictions

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from South Carolina, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the South Carolina case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these South Carolina descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Have you previously received record-clearing relief in South Carolina or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
8. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
9. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
10. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
11. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
12. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and South Carolina state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/SC-south-carolina.json

## South Dakota (SD)

**Candidate pathways:** Adult arrest-record expungement under SDCL § 23A-3-27; Diversion expungement; Automatic public-record removal for petty, municipal, and Class 2 misdemeanor cases; Suspended-imposition-of-sentence sealing; Controlled-substance deferred-disposition route; Pardon-based sealing; Juvenile-delinquency sealing; Juvenile-trafficking expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from South Dakota, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the South Dakota case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these South Dakota descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
8. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
9. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
10. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and South Dakota state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_review; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/SD-south-dakota.json

## Tennessee (TN)

**Candidate pathways:** Pathway 1 — Free non-conviction expunction under Tenn. Code §§ 40-32-101(a) / 40-32-106; Pathway 2 — Diversion expunction under §§ 40-15-105 / 40-35-313; Pathway 3 — Eligible-conviction expunction under §§ 40-32-101(g) / 40-32-107; Pathway 4 — Two-offense expunction under § 40-32-101(k)

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Tennessee, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Tennessee case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Tennessee descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you previously received record-clearing relief in Tennessee or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
7. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
8. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
9. **Does the record involve any Tennessee category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Tennessee state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/TN-tennessee.json

## Texas (TX)

**Candidate pathways:** Expunction after acquittal / not-guilty disposition (Chapter 55A); Expunction for arrest with no charge filed after the limitations period; Expunction after qualifying dismissal or quash; Expunction after pardon or actual-innocence relief; Expunction after qualifying Class C deferred disposition; Automatic nondisclosure for qualifying nonviolent misdemeanor deferred adjudication (§ 411.072); Petitioned nondisclosure after completed deferred adjudication (§ 411.0725); Petitioned nondisclosure for an eligible conviction (§ 411.0735); First-offense DWI nondisclosure

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Texas, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Texas case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Texas descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
7. **Was the arrest or record caused by mistaken identity, identity theft, or law-enforcement error?**  
   *When:* Ask only while an identity-correction route remains viable.  
   *Effect:* Yes routes to correction/sealing logic distinct from ordinary conviction relief.
8. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
9. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
10. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
11. **Does the record involve any Texas category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Texas state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/TX-texas.json

## Utah (UT)

**Candidate pathways:** Path A — Automatic Clean Slate expungement; Path B — Automatic expungement after acquittal or dismissal with prejudice; Path C — Clean Slate eligible convictions and plea-in-abeyance dismissals; Path D — Petition-based expungement with a BCI Certificate of Eligibility; Path E — Petition-based non-conviction expungement; Path F — Petition-based conviction expungement; Path I — Traffic-offense expungement or deletion; Path J — Cannabis-possession petition without a BCI certificate; Path K — Pardon-based expungement; Path L — Vacatur / human-trafficking-related expungement; Path M — Juvenile expungement

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Utah, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Utah case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Utah descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Utah state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/UT-utah.json

## Virginia (VA)

**Candidate pathways:** Regime 1 — Expungement (§ 19.2-392.2), available now; Automatic sealing (§ 19.2-392.7) — no filing; Petition-based sealing (§ 19.2-392.12 / .12:1)

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Virginia, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Virginia case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Virginia descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
7. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
8. **Was the arrest or record caused by mistaken identity, identity theft, or law-enforcement error?**  
   *When:* Ask only while an identity-correction route remains viable.  
   *Effect:* Yes routes to correction/sealing logic distinct from ordinary conviction relief.
9. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.
10. **Does the record involve any Virginia category that the source identifies as excluded or review-required?**  
   *When:* Ask after the route is narrowed; show only categories relevant to the remaining route.  
   *Effect:* Matching category → hard stop or review; none → continue.

### Screening logic

Confirm ownership and Virginia state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/VA-virginia.json

## Vermont (VT)

**Candidate pathways:** Adult conviction expungement — narrow statutory route; Adult misdemeanor-conviction sealing; Adult felony-conviction sealing; DUI sealing; Non-conviction sealing; Young-adult sealing for offenses committed at ages 18–21; Offense-before-age-25 sealing under 33 V.S.A. § 5119(g); Juvenile sealing

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Vermont, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Vermont case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Vermont descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
8. **Was the arrest or record caused by mistaken identity, identity theft, or law-enforcement error?**  
   *When:* Ask only while an identity-correction route remains viable.  
   *Effect:* Yes routes to correction/sealing logic distinct from ordinary conviction relief.
9. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
10. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
11. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Vermont state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/VT-vermont.json

## Washington (WA)

**Candidate pathways:** Adult misdemeanor / gross-misdemeanor vacation under RCW 9.96.060; Adult felony vacation under RCW 9.94A.640; Non-conviction record deletion under RCW 10.97.060; Blake drug-possession vacation and refund route; Misdemeanor cannabis-conviction vacation; Victim / survivor conviction-vacation route; Juvenile-record sealing under RCW 13.50.260

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Washington, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Washington case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Washington descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
8. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
9. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
10. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Washington state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/WA-washington.json

## Wisconsin (WI)

**Candidate pathways:** Adult conviction expungement under Wis. Stat. § 973.015; Adult non-conviction / arrest-only record correction or removal; Human-trafficking / prostitution relief under § 973.015(2m); Juvenile-adjudication expungement under Wis. Stat. § 938.355(4m); Executive-pardon guidance

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Wisconsin, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Wisconsin case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Wisconsin descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
8. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
9. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
10. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Wisconsin state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; needs_review; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/WI-wisconsin.json

## West Virginia (WV)

**Candidate pathways:** No-conviction expungement for acquittal, dismissal, diversion, or deferred adjudication; Eligible conviction expungement under W. Va. Code § 61-11-26; Accelerated treatment / recovery / job-readiness expungement under § 61-11-26a; First-offense drug-possession conditional-discharge relief; Pardon-based expungement; Sex-trafficking-victim vacatur and expungement; Juvenile-record relief

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from West Virginia, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the West Virginia case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these West Virginia descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Have you previously received record-clearing relief in West Virginia or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
8. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
9. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
10. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
11. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and West Virginia state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/WV-west-virginia.json

## Wyoming (WY)

**Candidate pathways:** Adult non-conviction expungement - W.S. 7-13-1401; Misdemeanor conviction expungement - W.S. 7-13-1501; Felony conviction expungement - W.S. 7-13-1502; Human-trafficking victim vacatur - W.S. 6-2-708; Juvenile / minor expungement - W.S. 14-6-241

### Free-check question outline

1. **Are you asking about your own record?**  
   *When:* Ask in every free check  
   *Effect:* No → stop or redirect; Yes → continue.
2. **Is this a state or local matter from Wyoming, rather than a federal matter?**  
   *When:* Ask in every free check  
   *Effect:* Federal or wrong-state matter → outside this state flow; state/local matter → continue.
3. **How did the Wyoming case or record end?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Splits nonconviction, conviction, diversion/deferred, juvenile, automatic, pardon, correction, and other route families.
4. **What level or type was the charge?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Narrows offense-level routes, waiting-period bands, and obvious exclusions.
5. **Do any of these Wyoming descriptions sound close to your situation?**  
   *When:* Ask after scope, before route-specific questions  
   *Effect:* Lets the participant select a likely remedy or “not sure”; selection prunes unrelated route-specific questions.
6. **How old were you when the offense or case began?**  
   *When:* Ask only when adult-versus-juvenile or youthful-offender treatment may change the route.  
   *Effect:* Routes to juvenile/youthful-offender logic or keeps the adult route.
7. **Have you previously received record-clearing relief in Wyoming or elsewhere?**  
   *When:* Ask only when prior use of relief affects the candidate route.  
   *Effect:* Prior relief may limit the route, change the packet, or require review.
8. **Was this offense connected to your status as a human-trafficking or sex-trafficking survivor?**  
   *When:* Ask only while trafficking-survivor relief remains viable; allow “prefer not to say.”  
   *Effect:* May open vacatur/expungement or review treatment.
9. **Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction?**  
   *When:* Ask only while a pardon or executive-relief route remains viable.  
   *Effect:* Yes may open a pardon-based route; No preserves ordinary routes; Not sure defers proof.
10. **Do you currently have any pending criminal charge, open case, probation, parole, or other supervision?**  
   *When:* Ask only when pending cases or active supervision can block the candidate route.  
   *Effect:* Pending/open matter may produce not-yet, review, or a different route.
11. **Have you completed everything the court ordered in this case?**  
   *When:* Ask only when a viable route depends on sentence, supervision, program, restitution, or financial completion.  
   *Effect:* No → usually not yet or needs more information; Yes → continue; Not sure → defer exact proof.
12. **About how long ago did this case end or get resolved?**  
   *When:* Ask only when at least one viable route has a waiting period.  
   *Effect:* Uses an approximate band for a preliminary result; exact dates are collected later.

### Screening logic

Confirm ownership and Wyoming state/local scope; use case outcome, offense type, and likely-pathway selection to establish candidate routes. Ask only candidate-route special, completion, approximate timing, pending-case, prior-relief, or exclusion questions. Return a preliminary packet path, guidance/automatic result, not-yet result, needs-information/review, or ineligible/out-of-scope result. Exact dates, court/case identifiers, records, service, and form fields are deferred until the authenticated matter's packet-completion and final-verification stages.

**Preliminary outcomes supported:** guidance_only; likely_not_eligible; needs_review; not_yet; packet_ready_with_caution

**Deferred until account + packet completion:** exact dates, exact court/county, case or docket number, charge/statute detail, records and documents, service/mailing data, and official-form fields.

**Source profile:** https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3/src/lib/rcap-engine/compiled/profiles/WY-wyoming.json
