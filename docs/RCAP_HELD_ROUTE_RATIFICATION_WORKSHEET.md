# RCAP Held-Route Ratification Worksheet (batch: ME, MO, LA, NE, ID, VA, IL, + NM/MA disposition)

Generated on the `fix/all51-rule-driven-provability` line of work. Engine date pinned to **2026-07-01**.

## What this batch does

Each held petition route below had its **actual problem fixed** in the engine
(`src/lib/rcap-engine/evaluator.ts`): route-specific wait + anchor wired into
`specialRouteTiming`, tangled routes separated, and the route moved out of
`HELD_GUIDANCE_ROUTES`. Every built route now sits in **`CORRECTED_AWAITING_RECONFIRM_ROUTES`**,
which means:

- The route reaches the **reconfirm hold** (`needs_review` + `lawrence_reconfirmation_required`)
  when the facts qualify and the wait is satisfied — it is *built*, not guidance.
- **The $50 clamp stays shut.** `paymentAllowed` is `false` on every branch until Lawrence
  ratifies. Nothing sells from this batch.

**Both-direction proof** for every built route is in
`scripts/verify-rcap-awaiting-reconfirm-routes.mjs` (18 route cases, all green):
qualifying+wait-met → reconfirm hold / no payment; just-under wait → `not_yet`; just-over →
reconfirm hold; pending case → fails closed; payment always `false`.

## How to ratify a route (per route, after you confirm the values below)

1. Confirm the wait value, anchor, and hard gates in the table.
2. Move the route key from `CORRECTED_AWAITING_RECONFIRM_ROUTES` → `RATIFIED_DEPLOYABLE_ROUTES`
   in `evaluator.ts`.
3. If the route has a FLAGGED hard gate (offense-exclusion, count cap, precondition), implement it
   in `routeSpecificSafetyGate` before ratifying — otherwise the route sells on the generic gates only.
4. Re-run `npm run rcap:verify-awaiting-reconfirm-routes`, `rcap:verify-all51-provability`,
   `rcap:verify-memo-promotion-safety`. A ratified route flips its proof from "reconfirm hold" to
   "packet_ready + payment", so it moves out of the reconfirm proof into the memo-promotion proof.

## Anchor-field caveat (applies to every date-based route below)

The compiled profiles for these states expose **only `disposition_date`** (and `arrest_date` for
some) as a usable date anchor. The finer statutory clocks (sentence-completion, conviction, release)
are not separate intake questions, so `disposition_date` is used as the available proxy anchor and is
**flagged for your confirmation**. The generic completion/pending/financial/new-conviction blockers
still fail-close independently of this anchor.

---

## BUILT ROUTES → awaiting-reconfirm (confirm / correct)

| State:route | Wait engine applies | Anchor | Hard gates to confirm/implement | Source | Both-dir proof |
|---|---:|---|---|---|---|
| **MO**:610.140 general expungement | felony **3yr** / misd **1yr** | disposition_date (proxy for authorized-disposition completion) | Class A felony, dangerous/sex/registration offenses, DWI (→610.130), CDL — via exclusion set; confirm tier waits | RSMo § 610.140 | ✅ |
| **MO**:610.130 first intoxication traffic/boating | **10yr** | disposition_date (proxy) | first-offense only; not-CDL; no later intoxication conviction | RSMo § 610.130 | ✅ |
| **MO**:610.145 stolen/mistaken identity | **0 (event)** | disposition_date | charges dismissed/acquitted; identity-theft/mistaken-identity basis | RSMo § 610.145 | ✅ |
| **LA**:non-conviction-arrest | **0 (event)** | disposition_date | DWI-pretrial-diversion **5yr-from-arrest** special rule is separate (FLAG) | La. C.Cr.P. arts. 976–977 | ✅ |
| **LA**:894(B) misdemeanor set-aside | **0 (event, after set-aside)** | disposition_date | **set-aside-granted precondition** not yet modeled (FLAG); Art. 977 offense bars | art. 894(B) | ✅ |
| **LA**:misdemeanor 5-year clean-period | **5yr** | disposition_date (proxy for sentence/probation/parole completion) | no felony in the 5yr period; Art. 977 offense bars | art. 977 | ✅ |
| **LA**:first-offense marijuana (998) | **90 days** | disposition_date | first-offense only; Art. 983(M) **fee cap expires 2026-08-01** (fee ≠ eligibility; FLAG) | art. 998 | ✅ |
| **LA**:893(E) felony set-aside | **0 (event, after set-aside)** | disposition_date | **set-aside-granted precondition** + **Art. 978(B) exclusions** not yet modeled (FLAG) | art. 893(E) | ✅ |
| **LA**:felony 10-year clean-period | **10yr** | disposition_date (proxy) | **Art. 978(B) exclusions** (violence/sex/minor-victim/CDS) not yet modeled (FLAG) | art. 978 | ✅ |
| **NE**:set-aside probation/fine/community-service (§29-2264(2)) | **0 (runs from sentence completion, no fixed wait)** | disposition_date | **SET-ASIDE, not seal/erasure — record stays visible** (represented honestly) | Neb. Rev. Stat. § 29-2264(2) | ✅ |
| **NE**:set-aside incarceration ≤1yr (§29-2264(3)) | **0 (from completion)** | disposition_date | ≤1yr incarceration; not SORA; not vehicular homicide; no prior denial in 2yr (FLAG — implement as hard gates); **set-aside honesty** | § 29-2264(3) | ✅ |
| **VA**:regime-1 non-conviction expungement | **0 (event)** | disposition_date | true non-conviction only; Dotson deferred-guilt bar | § 19.2-392.2 (in force now) | ✅ |
| **VA**:petition-based sealing | misd **7yr** / Class 5/6 felony or larceny **10yr** | disposition_date (proxy for conviction/release-later) | **effective 2026-07-01**; confirm **OES form readiness**; full exclusion list + felony-history bars (no Class 1–4; no Class 3/4 within 20yr; no other felony within 10yr) not yet modeled (FLAG) | § 19.2-392.12 / .12:1 | ✅ |
| **ME**:adult-conviction-sealing (CR-218) | **4yr** | disposition_date (proxy for "sentence fully satisfied") | eligible **Class E only**, excl. Title 17-A ch. 11; no later conviction / deferred-dismissal / out-of-state (FLAG — offense-eligibility gate) | 15 M.R.S. §§ 2261–2264 | ✅ |
| **IL**:felony-prostitution-relief | **0 (event, after sentence completion)** | disposition_date | **Class 4 felony prostitution** offense gate + trafficking-survivor 5.2(h) overlap (FLAG); caution-tier | 20 ILCS 2630/5.2(j) | ✅ |
| **ID**:withheld-judgment set-aside (§19-2604) | **0 (event, after probation completion)** | disposition_date | **withheld-judgment-granted precondition** (FLAG); **SET-ASIDE, not expungement**; discretionary → caution-tier | Idaho Code § 19-2604(1) | ✅ |

Legend: FLAG = a substantive gate you must confirm and (where noted) implement in
`routeSpecificSafetyGate` **before** ratifying; until then the route sells on the generic
completion/exclusion/pending gates only.

---

## GENUINELY NO ROUTE (guidance is the ceiling — nothing to file)

These stay guidance-only because there is **no user-filed court petition/motion** to file, not
because we are holding a buildable route.

| State:record-type | Reason |
|---|---|
| **AK** general conviction sealing / SIS set-aside | No general user-filed court petition; narrow agency/support paths only (`isCourtFiledPetitionRoute` → false for AK). |
| **CT** absolute pardon | Board of Pardons & Paroles **ePardon portal**, not a court filing. |
| **GA** agency/prosecutor restriction | Prosecutor/agency-only process; not a user-filed court petition. |
| **DC** §16-802 / §16-805 automatic | Automatic by law (court says automatic sealing not currently operating). |
| **MO** 610.105 closed-record; Art. XIV marijuana (completed sentences) | Automatic closure / court-directed, no user petition. |
| **LA** 985.2 automated expungement status | Automatic process contingent on appropriation; no filing. |
| **NE** automatic non-conviction & juvenile sealing; pardon-then-seal | Automatic (§29-3523(3), §43-2,108); pardon is the **Board of Pardons**, not a court. |
| **ME** non-conviction CHRI confidentiality; pardon route | Administrative confidentiality (16 M.R.S. §§703/705); pardon is the **DOC Pardon Board**. |
| **ID** §67-3004(10) non-conviction fingerprint/CHRI; §67-3004(11) clean-slate shielding | **ISP administrative** request / automatic shielding — not a court petition. |
| **NM** DNA sample/profile expungement | **DPS administrative** written request to remove a DNA sample from the state database (NMSA §29-16-10) — **not a court petition**. It is separate from ordinary NM court-record expungement (the Criminal Record Expungement Act routes, already ratified). |

---

## NOT BUILT THIS BATCH — reason + what's needed

### MA — spec-ready, blocked on an intake-schema change (design + Lawrence)
Massachusetts' compiled intake profile exposes **no date-anchor question, no `pending_cases`, and
no `sentence_completion_date`** (only `financial_obligations`). The timing engine therefore cannot
compute a wait or fail a case closed on timing without **adding standard intake questions** — a
change to the consumer flow (and the `all51.json` designer fixture), which is a design decision
beyond a timing correction. The per-route values are derived and ready to wire once those questions
are approved:

| MA route | Derived wait | Class |
|---|---:|---|
| §100A adult conviction sealing | misd **3yr** / felony **7yr** / sex-offense **15yr** (or registration period) | COURT |
| §100B juvenile sealing | **3yr** from termination of supervision | COURT |
| §§100F–100J time-based expungement (offenses before 21) | misd **3yr** / felony **7yr**, ≤2 records, §100J offense bars | COURT |
| §100C court-requested sealing (dismissal/nolle) | event — court "substantial justice" discretion | COURT (caution) |
| §100K non-time-based expungement | event — clear-and-convincing error/false-ID/decriminalized | COURT (caution) |
| §100C automatic non-conviction sealing | — | GUIDANCE (automatic) |

Recommendation: approve adding `disposition_date`, `pending_cases`, `sentence_completion_date` to the
MA intake (mirroring the other states), then MA wires in exactly like MO/LA/VA.

### NM DNA — correctly guidance (see no-route table)
The DNA-sample route is a DPS administrative request, not a court petition, so it stays guidance.
This is the "separate DNA relief from ordinary court-record expungement" fix: DNA = administrative
(no payment); the ordinary NM Criminal Record Expungement Act routes are the court routes.

### Routes kept guidance inside built states (fail-safe)
- **MO**: 610.122–123 false-info/arrest (mixed 18-month/immediate + CDL gates); 311.326 MIP
  (birth-date-derived anchor not representable).
- **LA**: first-offender-pardon (pardon precondition), interim-expungement & redaction (procedural),
  trafficking (DA certification), 985.3 (court discretion).
- **NE**: trafficking-survivor (nexus), law-enforcement-error (clear-and-convincing), juvenile-petition-backstop.
- **ME**: survivor-sealing (trafficking nexus / manual review); juvenile-sealing (single pathway
  conflates automatic + petition — needs a pathway split before the 3yr petition branch can be built).
- **ID**: trafficking-survivor vacatur — **forced to guidance** (`HELD_GUIDANCE_ROUTES`) because the
  "offense *resulted from* trafficking" nexus cannot be modeled from a collected fact (fail-safe).
