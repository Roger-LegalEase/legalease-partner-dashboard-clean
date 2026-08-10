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
