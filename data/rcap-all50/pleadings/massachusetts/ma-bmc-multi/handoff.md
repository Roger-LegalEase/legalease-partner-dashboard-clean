# Handoff — ma-bmc-multi (Lane C2)

## Authority

G.L. c. 276, § 100C; Boston Municipal Court Department Amended Standing Order No. 1-09; Commonwealth v. Pon, 469 Mass. 296 (2014) (pinned registry authority list). Track is `missing_from_compiled_runtime`; the pinned registry entry plus the Massachusetts state pack are the operative sources.

## Mechanism

Single consolidated petition to seal three or more non-conviction criminal records from two or more BMC divisions — a local implementation of the ordinary § 100C judicial-sealing remedy, not a separate statewide remedy. Venue is the Standing Order's residence-based rule (most-recent-eligible-record division for people no longer in BMC territory). Preliminary hearing, public notice and final hearing follow filing.

## Route decision

Custom pleading via the shared renderer. The BMC division is carried through the renderer's `{county}` token (fixture `countyName` holds the division name); the division line in the caption is a deliberate confirm bracket. Registry packet set defines `primary_filing` + `instructions` components only:

- **Proposed order: absent** — no proposed-order component recorded in the source.
- **Certificate of service: absent** — service is "per the Standing Order"; mechanics flagged for Clerk-Magistrate confirmation rather than drafting an unsourced certificate.
- Vocabulary gate: `expungement`/`expunge` are QA-prohibited terms for this track (Massachusetts copy must never use sealing and expungement interchangeably); negative fixture proves the gate.

## Blocked components

None. The consolidated petition supplements rather than replaces the statewide form; no mandatory official form is recorded for the consolidated route itself. (If counsel later requires the statewide per-case form instead, that is an official-form lane dependency.)

## Open counsel flags

1. Custom consolidated petition is usable only as counsel-approved and only for qualifying BMC records (3+ records, 2+ divisions); otherwise statewide form per case.
2. Caption/party-designation format not prescribed by the source; flagged for Clerk-Magistrate confirmation.
3. Signature required, notarization "none", no verification statute stated — declaration form left null-cited.
4. Fees/fee-waiver "none identified" — confirm with clerk.
5. Pon good-cause narrative must remain participant-authored (structured prompts only).
6. Post-filing hearings (preliminary, public notice, final) are self-help boundaries; judge information-requests trigger handoff.
