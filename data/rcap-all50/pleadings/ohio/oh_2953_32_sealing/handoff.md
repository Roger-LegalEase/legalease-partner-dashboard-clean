# Handoff — Sealing of Conviction and Bail-Forfeiture Records (ORC 2953.32)

## Authority

- Ohio Rev. Code § 2953.32
- Ohio Rev. Code § 2953.31
- Ohio Rev. Code § 2953.61
- Ohio Rev. Code § 2919.25
- Ohio Rev. Code § 2919.27
- Ohio Rev. Code § 2921.41
- Ohio Rev. Code § 2921.43
- Am. Sub. S.B. 288, 134th Gen. Assemb.

## Mechanism

A person convicted of an offense, or whose misdemeanor bail was forfeited, applies to the sentencing court to seal the record once the applicable waiting period has run from final discharge (completion of sentence, parole, all fines and all restitution; court costs excluded). SB 288 removed the numeric cap on sealable convictions. Relief is discretionary under the statutory balancing test, with prosecutor notice (60 days) and objection (30 days) windows and a hearing 45-90 days after filing.

## Route decision

Custom pleading (controlled pleading, lane C) as drafted content: Ohio publishes no statewide mandatory form — each court maintains its own application — so the packet drafts the statutory content and the participant transcribes it onto the sentencing court's own application (registry manual completion item). The post-order BCI transmission uses the Ohio Attorney General's 'Sealings and Expungements Request' official form (registry outputStrategy official_pdf_fill): that component is BLOCKED in this lane and recorded as a lane D/E dependency — exact dependency: Ohio Attorney General Sealings and Expungements Request form (no officialFormId/URL recorded in the registry component; the AG instructs that signed sealing orders be sent to BCI with it, per the state pack filing instructions). Independently valid participant instructions for every other step are complete.

## Open counsel flags

- Registry build blocker: the full text of ORC 2953.32 was not read at source; waiting periods/exclusions are corroborated by the Franklin County Law Library guides but the section must be read before any tier ships.
- Registry build blocker: whether any county's local application deviates from the statutory content requirements, and how many distinct local packets exist.
- Registry release blocker: the exact terms of the third-degree-felony counting rule.
- Notarization is not identified by the source; local practice may require it (verification statute null).
- Sealing-vs-expungement vocabulary: both remedies exist in Ohio and are different; the BCI limited-record disclosure is mandatory copy.
