# Written request for segregation of records — KRS 17.142(1)

**Component** `ky_criminal_record_segregation-agency-written-request-2` · unit `ky_seg_agency_written_request` · one letter per agency the participant identifies.

This is not a court document. It is not filed anywhere. The participant signs it and posts it to the agency.

Everything in braces comes from the participant's own screening answers. Nothing in this letter is prefilled from any source: no source read for this track names a single Kentucky agency or supplies any agency address.

---

## Letter body

{participantName}
{participantAddress}

{date — the participant writes the date they post the letter}

{agencyName}
{agencyAddress}

**Re: Written request to segregate arrest records under KRS 17.142(1)**

To whom it may concern:

I am writing to make a written request under KRS 17.142(1) that your agency segregate the records described below.

I was arrested on {arrestDate} in {county} County, Kentucky. I was arrested for {arrestOffenceDescription}.

{dispositionParagraph — one of the three, selected by the participant's own answer to segDispositionType:}

- *found innocent:* I was found innocent of the charge or charges relating to that offence.
- *dismissed:* All charges relating to that offence were dismissed.
- *withdrawn:* All charges relating to that offence were withdrawn.

{caseNumberSentence — rendered only where charges were filed and the participant supplied a case number: The case number was {caseNumber}.}

I believe your agency holds arrest records, fingerprints, photographs or other data relating to that arrest.

KRS 17.142(1) requires a law enforcement agency or other public agency holding such records to segregate them, on the written request of the arrestee, into a file separate and apart from those of persons who have been convicted, where the person was found innocent or where all charges relating to the offence were dismissed or withdrawn. This letter is that written request.

KRS 17.142(3) also requires each agency that segregates records to notify every agency it shared those records with, and requires that the segregated record show the disposition of the case.

I ask that you segregate these records accordingly.

Please write to me at the address above if you need anything further from me.

{signature — the participant signs}

{participantName}

---

## Rules this letter follows

| Rule | Source |
| --- | --- |
| One letter per agency the participant identifies | registry unit `ky_seg_agency_written_request`: "One letter is generated per agency the participant identifies." |
| No court involvement | registry unit description: "The statutory duty to segregate runs to the agency on the arrestee's written request without any court involvement." |
| The participant signs each request | registry `rules.participantSignature` |
| The participant posts each letter and addresses the envelopes | registry `manualCompletionItems[1]`; `packetSet.participantActionRequired[kind=complete_field]` |
| No notarization | registry `rules.notarization`: "none required." |
| No fee | registry `rules.fees`: "none identified for either route." No fee statement of any kind appears in the letter. |
| No agency name or address prefilled | No source read for this track names any Kentucky agency or address. `segAgencies` is the only source. |

## What this letter never says

- It never says the records will be expunged, sealed, erased or destroyed. Segregation is none of those things: the records continue to exist and remain accessible, and the segregated record must show the disposition.
- It never asserts that all charges ended favourably as a legal conclusion. It states the participant's own answer, in the participant's own voice, as their own statement of fact.
- It never asks for court records to be segregated. Court records are not records which may be segregated.
- It never asserts what the agency has done, will do, or has already done.
- It never states a deadline, a penalty or a consequence for the agency, because no source read for this track supplies one.
- It never carries the participant's date of birth, social security number, state identification number, driver's licence number, FBI number or any fingerprint identifier.

## Open counsel questions carried by this component

- The static legal propositions this letter asserts about the effect of segregation — the KRS 17.142(3) duty, the downstream notification duty, and the disposition-showing requirement — are **unratified** (release blocker).
- Whether this route should be a participant-facing product at all is an open **build blocker**: the controlling review classifies KRS 17.142 as an agency-level mechanism expressly not a product track, while the statute provides two participant-initiated routes.
- No source read for this track states what an agency must do on receipt, in what time, or what the participant's recourse is if nothing happens.

---
