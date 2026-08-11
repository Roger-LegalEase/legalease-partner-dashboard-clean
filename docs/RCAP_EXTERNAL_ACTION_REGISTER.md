# RCAP External Action Register

Every item that depends on someone outside the build. Nothing on this list waits
indefinitely: at `dueAt` the owner either resolves it, converts it into polished
participant instructions, approves a structured escalation or referral, or the
pre-registered `fallbackTerminalDisposition` is taken and logged in the ledger.

`dueAt` values below are **proposed** and become firm when the named owner
confirms them. Owners named as "Roger or Faith" are placeholders until one of
them assigns the item. Register date: 2026-08-10.

| # | Item | Owner | Proposed dueAt | Required evidence | Tracks affected | Fallback terminal disposition |
|---|------|-------|----------------|-------------------|-----------------|-------------------------------|
| 1 | Massachusetts commercial-use authorization for the official forms | Roger or Faith | 2026-08-24 | Written authorization from the issuing body, or a documented refusal/no-response record | MA packet tracks (all MA tracks in the ledger) | Tier 1/2 paths built on the official form's own bytes if authorization is silent; exact supported deferral if authorization is refused |
| 2 | The two exact Kansas originals | Roger or Faith | 2026-08-24 | The two source binaries with retrieval URL, retrieval date and SHA-256 | KS packet tracks | Exact supported deferral with the reason "source original not obtained" |
| 3 | Remaining Delaware human-browser retrieval | Roger or Faith | 2026-08-17 | Retrieved binaries with retrieval URL, date and SHA-256 | DE packet tracks | Guidance route with complete participant treatment; packet deferred |
| 4 | Minnesota currentness comparison | Roger or Faith | 2026-08-24 | Side-by-side of held revision against the currently published revision, with both SHAs | MN packet tracks | Hold at the verified older revision only if it is still the published one; otherwise exact supported deferral |
| 5 | One-time Adobe Reader reference prints for the dynamic XFA forms | Roger or Faith, after the XFA inventory names the forms | Inventory completion + 7 days | Human-created static snapshots, each admitted as a derived source hash-pinned to the official SHA | The dynamic XFA identities that fail tiers 0–2 | XFA tier 4 isolated dynamic renderer; tier 6 terminalisation if that also fails |
| 6 | We Must Vote minimum operating profile | Roger or Faith | Before any We Must Vote route goes public | Support contact and hours, escalation route, reporting recipients, launch approver, claims guardrails — all in writing | All We Must Vote sponsored routes | Sponsored routes stay disabled; they do not go public without the profile |
| 7 | The Elevation Project sponsored allocation | Roger or Faith | 2026-08-24 | Written allocation with unit definition, thresholds and reserve, matching the We Must Vote contract shape | All Elevation Project sponsored routes | No sponsored capacity is provisioned and no credit is consumable until the allocation is recorded |

## Items opened by the ground-truth audit

| # | Item | Owner | Proposed dueAt | Required evidence | Why it is external |
|---|------|-------|----------------|-------------------|--------------------|
| 8 | Access to `private/Nationwide Record Clearing/` for build sessions | Roger | 2026-08-13 | The inventory reachable from the session that needs it, or an explicit decision that ingestion happens only on the local machine | The folder is gitignored and absent from cloud sessions, so no cloud session can ingest source material |
| 9 | Production truth for deploy state, Vercel plan, Supabase object presence and the We Must Vote row | Roger | 2026-08-13 | Read-only evidence, exported by Roger — never production credentials on a build machine | Credential isolation forbids production secrets on build machines, so production facts cannot be self-served |
| 10 | Confirmation of the 497-track definition | Roger | 2026-08-13 | The definition or registry that yields 497 | The compiled profiles yield 324 tracks; the extra 173 are not represented in the repository |

## Per-court acceptability questions

Not registered here. Per the legal posture they are resolved by the
pre-registered fallback — a path built on the official form's own bytes where
one exists, otherwise exact supported deferral — and logged in the ledger with
its reason. They never block a lane.

## Status at the integration branch tip

This register was written on the captain branch on 2026-08-10 and is restored
here because `docs/RCAP_AUTHORIZATION_QUEUE.md` cites item 9 and the register
was otherwise absent from this branch. The obligation tables above are
unchanged — they are owned by their named owners, not by the build. This
section only records what the branch tip can now demonstrate about them, so a
reader does not act on a stale premise.

**Item 10 — its stated premise is now outdated; the item itself is narrower but
still open.** The register says "the extra 173 are not represented in the
repository." At this tip all 497 registry tracks are enumerated and each
carries a disposition in `data/rcap-ledger/track-pathway-crosswalk.json`,
generated against a hash-pinned registry source
(`data/record-clearing/legal-design-track-registry.json`, commit
`3b6f4c10`, SHA-256 `9d37ca7c…`) and the 51 compiled profiles under
`src/lib/rcap-engine/compiled/profiles`. The crosswalk publishes 497 registry
tracks against 324 compiled pathways: 243 exact, 19 represented by variants, 8
unresolved-ambiguous, 226 with no compiled runtime counterpart, and 262 tracks
carrying runtime coverage overall. So the 324↔497 relationship is represented
and inspectable rather than unexplained.

What stays external is the narrower question the crosswalk cannot self-serve:
that registry edition is pinned but **not confirmed authoritative** —
`registrySource.authorityEdition` is `null`. Roger confirming which registry
edition is authoritative is the remaining part of item 10; the arithmetic is
no longer the open part. `milestone1Item2Closed` is `false`, with 31 registry
gap blockers and 30 unresolved pathways still recorded, and the 38 Milestone 1
item 2 blockers are dispatched in
`data/rcap-ledger/crosswalk-resolution-dispatch.json`.

**Item 8 holds exactly as written, confirmed from this session.**
`private/Nationwide Record Clearing/` is absent from this cloud session, so no
cloud session has ingested source material from it. Nothing on this branch
claims otherwise.

**Item 9 holds as written.** No production fact on this branch is self-served;
the staging readiness record
(`scripts/verify-rcap-staging-authorization-readiness.mjs`) reports 3 of 13
fields populated and refuses to report readiness while any field is unresolved
or any blocker is open. It additionally carries the open critical blocker
`RCAP-SEC-001`, which is tracked there and not in this register because it is
a defect in this branch's own code, not an external dependency.

Items 1–7 are untouched by this branch and remain as their owners left them.
