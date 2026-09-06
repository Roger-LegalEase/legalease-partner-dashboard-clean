# North Carolina: the indigency component to build

Date: September 6, 2026. Family: `nc_146_dismissal_petition-set`.
Status: proposed implementation contract, not court approval or an independent packet verdict.

## Finding

Use the court's actual expunction-specific fee-waiver link, which resolves to AOC-G-106, Petition to Proceed as an Indigent, revision 11/24. The guide's AOC-CV-226 financial affidavit cannot silently stand in for that petition. See NC1–NC4 in Source_Index.json.

## Branches

| Actual situation | Proposed output behavior |
|---|---|
| Ordinary dismissal, no §15A-146(d) fee | No indigency petition is required merely to waive a nonexistent filing fee. |
| Fee-bearing dismissal and applicant will pay | Preserve the applicable payment instructions; no automatic indigency allegation. |
| Fee-bearing dismissal and applicant requests indigency | Deliver G-106 and its completion instructions with the expunction petition. |
| Court requests more financial evidence | Supply the court-accepted supplement; identify any local requirement and avoid an unrelated sworn arbitration assertion. |

## G-106 source and mapping boundaries

The visually inspected two-page original identifies its fourth principal election as **Petition To File Expunction Petition**. Do not select the small-claims appeal or generic motion choice simply because the packet involves a court motion.

The selection includes a financial-inability assertion. Populate it only after the participant actually elects indigency and confirms the underlying assertion. Receiving sponsored LegalEase access is not proof of SNAP, TANF, SSI, or representation by legal services.

Use case-specific court/caption values and the participant's verified identifying data. The benefit and representation selections require actual supporting participant information. Absence of benefit receipt does not by itself foreclose the separate inability-to-pay selection.

Leave the petitioner's execution and oath fields for the proper acts. The legal-services certificate belongs to the legal-services/pro-bono representative, not automatically to a clinic volunteer. Leave every court-order checkbox, court signature and clerk certification uncompleted. The reverse-side court orders for inmates/small-claims appeals are not participant choices in an ordinary expunction application.

Preserve the issuer's original pages, printed text, and revision. Resolve its exact binary through existing custody; no source hash was acquired in this chat.

## CV-226 qualification

The Judiciary's general Court Costs guide itself links CV-226 for supplemental financial details in many counties. Therefore this finding is **not** that every local use of CV-226 is illegal. The issue is the missing operative G-106 petition and the unqualified claim that CV-226 alone supplies the expunction waiver. The published CV-226 side two contains an oath about arbitration fees. Do not rewrite that oath in a source PDF or have a participant make an inapplicable sworn assertion. Obtain the court's accepted supplemental practice where needed.

## Focused acceptance targets

1. An indigency-requested fixture contains the actual expunction selection, not small-claims appeal.
2. The no-fee and paid branches do not acquire a false inability-to-pay statement.
3. Benefits, attorney certification, signatures, notarial dates, court orders and clerk service are not invented.
4. Required participant facts display in the intended cells; no shared-form caption confusion.
5. The guide and generated conditional component agree. A held source record is not counted as a delivered document.

This is a family repair plus its explicit form dependency, not permission to change all North Carolina families. Coordinate any genuinely shared dependency with the Captain.
