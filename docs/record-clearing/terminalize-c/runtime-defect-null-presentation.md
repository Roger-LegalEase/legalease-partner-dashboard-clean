# Runtime defect — null presentation fields render as the literal string "null"

**Owner: Terminal A (runtime).** Lane C cannot fix this: `src/**` is frozen for
this sprint per the ledger's `runtimeWiringNote`, and the defect is in the
renderer, not in the data.

**Severity: release blocker.** It puts the literal word `null` in the party
caption of a document intended for filing with a court.

## What happens

`custom-pleading-renderer.ts` falls back to the Pennsylvania presentation only
when `presentation` is absent as a whole:

    src/lib/record-clearing/renderers/custom-pleading-renderer.ts:168
    return config.presentation ?? PA_DEFAULT_PRESENTATION;

Individual fields have no such fallback. `sovereignPartyName` and
`sovereignRole` are read straight through:

    :232   const sovereignParty = { name: pres.sovereignPartyName, role: pres.sovereignRole };
    :453   ? `${petitioner.toUpperCase()} v. ${pres.sovereignPartyName}`

So a config that sets a presentation field to `null` renders the string
`null`. `reliefActionVerb` is handled correctly at :386 with `?? defaultReliefAction(...)`
— the pattern exists in the file, it is just not applied to the party fields.

## Why the data is right and the renderer is wrong

A null here is a deliberate, sourced statement that the field does not exist for
that track. Texas `tx_exp_mistaken_identity` records it in full:

> `sovereignPartyName: null` — "There is no sovereign party in the caption. The
> proceeding is an EX PARTE petition and the compiled profile's own sample
> caption is 'CAUSE NO. ____ / IN THE DISTRICT COURT OF ____________ COUNTY,
> TEXAS / EX PARTE [NAME]'. No source read for this track names a respondent, an
> opposing party or a party-role line. Not invented."
> — `profile:sourceSections[10]` lines 428-440; `registry@3b6f4c1:tracks[409].rules.filing`

The correct rendering for an ex parte caption is no sovereign party block at
all. Supplying one would invent an opposing party the sources do not name, and
falling back to the Pennsylvania default would caption a Texas petition
`… v. COMMONWEALTH OF PENNSYLVANIA`. Both are worse than the current output;
none of the three is acceptable.

## Observed output

`data/rcap-all50/pleadings/texas/tx_exp_mistaken_identity/rendered/canonical.txt`

    CAUSE NO. ____________________
    IN THE DISTRICT COURT OF {county} COUNTY, TEXAS
    EX PARTE {petitionerName}
    COUNTY OF EXAMPLE

    null,
        null,

Note the contrast: `{county}` and `{petitionerName}` are merge fields — the
convention for a value held blank for the participant to confirm. `null` is not
a merge field. It is a value that escaped.

## Scope — 18 rendered documents across 7 jurisdictions

Pleading tracks: `ct-cannabis-petition`, `ct-decriminalized`,
`il-immediate-seal`, `in_collateral_action`, `in_supplemental_order`,
`ky_void_seal_controlled_substance`, `ky_void_seal_marijuana_synthetic_salvia`,
`tx_exp_mistaken_identity`, `tx_exp_pardon_other`, `tx_exp_specialty_court`,
`tx_exp_unlawful_carry`.

Composed-route components: `ky_criminal_record_segregation-primary-filing-1`,
`vt_exp_deferred_sentence-written-request-to-court-2`, and all five
`wv_dui_deferral_expungement` components.

Lane C2 and C3 render through the same renderer and should be swept for the
same string.

## Suggested fix (Terminal A)

Give the party fields the same treatment `reliefActionVerb` already gets, and
let a null sovereign party suppress the block rather than print it:

    const sovereignParty = pres.sovereignPartyName
      ? { name: pres.sovereignPartyName, role: pres.sovereignRole ?? null }
      : null;

and omit the `v.` line and the party block entirely when `sovereignParty` is
null, so an ex parte caption renders as an ex parte caption.

## Until it is fixed

`scripts/verify-rcap-terminalize-c1.mjs` fails on a literal `null`, `undefined`
or `NaN` in any rendered document. Affected tracks declare
`runtimeDefects: ["renderer-null-presentation"]` in their config, which is the
only thing that converts that failure into a recorded, owned defect. The
declaration is a bug report, not an approval: these renders are not fit to file
until Terminal A lands the renderer fix and they are re-rendered.
