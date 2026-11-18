# Expungement.ai product captures

Verdict: PASS — six source PNGs and six MP4s created, each PNG opened and visually inspected; each MP4 played through to its ended event in Chromium and its complete decoded timeline visually reviewed. Authentic live product footage, with production layout caveats below.

## Production binding

- Current production application SHA: `e312a5efa7b4882e0fbf61a5ff0ae7891ac23226`.
- Current Vercel deployment ID: `dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc`.
- Production hostname: `expungement.ai`.
- Capture date: 2026-10-03 UTC; individual completion timestamps below.
- Binding evidence: latest successful GitHub Actions production public verification [run 36861106020](https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/36861106020), downloaded into `raw/production-evidence/`. Its `production-public-verify.json` binds application SHA to activated deployment, domain resolution, identical public assets and the Mississippi supported screening journey.
- Fresh live confirmation before capture: production HTML exposed `dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc` in Next.js asset URLs. After capture, fresh `/start` and `/` responses still expose that deployment; preserved as `raw/live-start.html`, `raw/live-root.html`, `raw/live-response-headers.txt`, and timestamped `raw/live-binding-check.json`. Thus the prior Actions SHA is used only after confirming its deployment is still live.
- Workspace inspection ref: `a3d4587b0fbbbfa887c78372afbfdb8824906333`. Deployed source inspected read-only with `git show e312a5efa7b4882e0fbf61a5ff0ae7891ac23226:...`; current workspace was not assumed to be the deployed application.
- Commit/ref for local exact-build rendering: not applicable. No local product build/render used; all six assets are live production captures.

## Capture format

Fresh unauthenticated Playwright/Chromium contexts; CSS viewport 390 × 844; DPR 2; mobile/touch, portrait, English `en-US`, light color scheme. Source PNGs are unchanged viewport screenshots, 780 × 1688, not full-page captures. No DOM copy edits, injected UI, fixture responses, captions, overlays or fake taps.

MP4s: H.264, yuv420p, 30 fps, 780 × 1688, no audio, fast-start metadata. Playwright records CSS-resolution content in its video canvas; ffmpeg removes only unused canvas padding and scales the captured 390 × 844 viewport to 780 × 1688. This does not change product framing or content. Raw original WEBMs are preserved in `raw/`. Setup footage was trimmed so clips begin on the settled intended screen. No speed changes or marketing effects.

`contact-sheet.png` uses a row-major A → B → C → D → E → F layout, with labels outside screenshot areas. Source PNGs were not altered.

## Source and safety inspection

Read `docs/FRONTEND_SOURCE_OF_TRUTH.md`, `docs/ROUTE_MAP.md`, `scripts/verify-frontend-surfaces.mjs`, screening/start routes and components, profile/evaluation adapters, question-selection/evaluator rules and current-deployment production verification evidence. Existing `artifacts/frontend-surfaces/` screenshots had no current deployment binding and were not reused. The Actions screenshots did bind to the current deployment but were recaptured at the requested mobile format; the Actions answer path was reused.

At the deployed SHA, `/api/expungement-ai/screening/progress` selects questions from compiled profiles without persistence. `/api/expungement-ai/evaluate` evaluates the collected answers and reads packet availability from repository authority data without database writes. No saved/resumed session exists, so completion persistence is not called. Saving progress and saving/continuing a result are separate actions, never clicked.

Do Not Track was enabled as a browser privacy setting (including navigator signal); the application's supported analytics gate honors it. A network guard permitted only GET/HEAD/OPTIONS and the inspected read-only progress/evaluation POSTs; any other write request would have been aborted. Final capture logs show zero blocked write requests and only those read-only POSTs. No server responses were mocked or replaced.

## Synthetic answer paths

Supported path A–E jurisdiction: Mississippi. Answers: own record = Yes; jurisdiction = State or local; outcome = The case was dropped or thrown out; charge = Misdemeanor; situation = Non-conviction expungement for dismissal, no disposition, or acquittal; court requirements completed = Yes; time since case end = 1-2 years ago.

Boundary F: same obviously synthetic facts, except jurisdiction scope = Federal. The real source-defined `federal_or_out_of_scope` hard-stop rule supplies the result. The deployed UI still asks the remaining questions before evaluating. No case number, name, email, phone, real case date or other participant identifier was entered.

## Shared visual caveats

The actual production app header slightly clips the right edge of the Sign in control at 390 CSS pixels; it is preserved and not repaired. The logo and all selected headlines remain complete and readable. The real Wilma assistant bubble stays present and overlaps some lower peripheral text/controls. Longer cards and lists naturally continue below the viewport; no long screenshot was substituted. B contains a brief genuine loading skeleton during navigation, followed by the fully settled first question; no source PNG contains a skeleton. E/F contain the real navigation/evaluation transition and then hold their result for more than 3 seconds. These are authentic product behaviors, not capture fabrication.

## A — A_entry_start

- PNG: `A_entry_start.png`.
- MP4: `A_entry_start.mp4` (4.700000 seconds).
- Source URL: `https://expungement.ai/start`; final browser route: `https://expungement.ai/expungement-ai/screening`. Internal route: `/expungement-ai/start`.
- Capture provenance: **live production capture**.
- Production SHA: `e312a5efa7b4882e0fbf61a5ff0ae7891ac23226`.
- Deployment ID: `dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc`.
- Capture completed at: `2026-10-03T16:46:24.903Z`.
- Viewport: 390 × 844 CSS pixels, DPR 2; PNG 780 × 1688.
- Jurisdiction: not yet selected; journey proceeds to Mississippi.
- Step: Not applicable.
- Exact headline/question: “Start with what happened. See what may be available.”.
- Interaction: Hold the entry, tap Check my options, hold the settled picker.
- Production write occurred: **No**. Read-only screening POSTs: 0; blocked write attempts: 0.
- Reason chosen: The dedicated guided-check entry, with real branding, opening explanation and Check my options CTA.
- Caveat: shared production header/bubble/viewport caveats above apply.

## B — B_state_selection

- PNG: `B_state_selection.png`.
- MP4: `B_state_selection.mp4` (6.200000 seconds).
- Source URL: `https://expungement.ai/screening`; final browser route: `https://expungement.ai/expungement-ai/screening/MS`. Internal route: `/expungement-ai/screening`.
- Capture provenance: **live production capture**.
- Production SHA: `e312a5efa7b4882e0fbf61a5ff0ae7891ac23226`.
- Deployment ID: `dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc`.
- Capture completed at: `2026-10-03T16:49:13.248Z`.
- Viewport: 390 × 844 CSS pixels, DPR 2; PNG 780 × 1688.
- Jurisdiction: not yet selected; journey proceeds to Mississippi.
- Step: Not applicable.
- Exact headline/question: “Where is the record?”.
- Interaction: Hold the picker, scroll to Mississippi and tap Mississippi once; hold the first question.
- Production write occurred: **No**. Read-only screening POSTs: 1; blocked write attempts: 0.
- Reason chosen: The actual all-51 picker clearly shows the question and many jurisdiction choices.
- Caveat: shared production header/bubble/viewport caveats above apply.

## C — C_plain_english_question

- PNG: `C_plain_english_question.png`.
- MP4: `C_plain_english_question.mp4` (4.733333 seconds).
- Source URL: `https://expungement.ai/screening/MS`; final browser route: `https://expungement.ai/screening/MS`. Internal route: `/expungement-ai/screening/MS`.
- Capture provenance: **live production capture**.
- Production SHA: `e312a5efa7b4882e0fbf61a5ff0ae7891ac23226`.
- Deployment ID: `dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc`.
- Capture completed at: `2026-10-03T16:47:50.566Z`.
- Viewport: 390 × 844 CSS pixels, DPR 2; PNG 780 × 1688.
- Jurisdiction: Mississippi (MS).
- Step: 3 of 7.
- Exact headline/question: “How did the case end?”.
- Interaction: Hold the unselected question, tap The case was dropped or thrown out once; hold the selected state without advancing.
- Production write occurred: **No**. Read-only screening POSTs: 3; blocked write attempts: 0.
- Reason chosen: The shortest case-outcome question, with everyday dropped or thrown out language leading the legal explanations; clearer than charge categories or pathway labels.
- Caveat: shared production header/bubble/viewport caveats above apply.

Exact answer choices rendered (all appear in the viewport):

1. The case was dropped or thrown out — dismissed, no-billed, nolle prosequi, or not prosecuted
2. Completed a program instead of a conviction — diversion, deferred disposition, supervision, or similar
3. Convicted of a misdemeanor — a less serious conviction
4. Convicted of a felony — a more serious conviction
5. Another kind of conviction — other conviction or adjudication
6. It happened when I was a minor — juvenile adjudication or offense as a minor
7. I'm not sure — That's okay — we'll help you figure it out

## D — D_guided_question

- PNG: `D_guided_question.png`.
- MP4: `D_guided_question.mp4` (4.700000 seconds).
- Source URL: `https://expungement.ai/screening/MS`; final browser route: `https://expungement.ai/screening/MS`. Internal route: `/expungement-ai/screening/MS`.
- Capture provenance: **live production capture**.
- Production SHA: `e312a5efa7b4882e0fbf61a5ff0ae7891ac23226`.
- Deployment ID: `dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc`.
- Capture completed at: `2026-10-03T16:48:05.773Z`.
- Viewport: 390 × 844 CSS pixels, DPR 2; PNG 780 × 1688.
- Jurisdiction: Mississippi (MS).
- Step: 7 of 7.
- Exact headline/question: “About how long ago did this case end or get resolved?”.
- Interaction: Hold the unselected question, tap 1-2 years ago once; hold the selected state without advancing.
- Production write occurred: **No**. Read-only screening POSTs: 7; blocked write attempts: 0.
- Reason chosen: Timing complements case outcome and explicitly accepts an estimate rather than requiring a case date.
- Caveat: shared production header/bubble/viewport caveats above apply.

Exact answer choices: Less than 1 year ago; 1-2 years ago; 2-3 years ago; 3-5 years ago; 5-7 years ago; 7-10 years ago; More than 10 years ago; I'm not sure; The case is still open. The last choice is below this viewport. Selected answer: 1-2 years ago.

Supporting copy: “An estimate is okay for this free screening. You can use the date the case was dismissed, resolved, or when you finished what the court ordered. We may ask for exact case details later before generating documents.”

## E — E_supported_path

- PNG: `E_supported_path.png`.
- MP4: `E_supported_path.mp4` (6.966667 seconds).
- Source URL: `https://expungement.ai/screening/MS`; final browser route: `https://expungement.ai/screening/MS`. Internal route: `/expungement-ai/screening/MS`.
- Capture provenance: **live production capture**.
- Production SHA: `e312a5efa7b4882e0fbf61a5ff0ae7891ac23226`.
- Deployment ID: `dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc`.
- Capture completed at: `2026-10-03T16:48:23.557Z`.
- Viewport: 390 × 844 CSS pixels, DPR 2; PNG 780 × 1688.
- Jurisdiction: Mississippi (MS).
- Step: Result; progress shows 7 of 7.
- Exact headline/question: “A path may be available.”.
- Interaction: From the answered timing question, tap Continue and hold the supported result for over 3 seconds. No result CTA clicked.
- Production write occurred: **No**. Read-only screening POSTs: 9; blocked write attempts: 0.
- Reason chosen: Known supported Mississippi non-conviction branch proven by production verification; renders a conditional supported path, the named pathway and practical next steps.
- Caveat: shared production header/bubble/viewport caveats above apply.

Exact main language: “Based on what you shared, there may be a record-clearing path available. Expungement.ai can help you generate a self-help packet and next-step instructions.” Named path: “Mississippi: Non-conviction expungement for dismissal, no disposition, or acquittal”.

Visible next steps: “Save this result to your free Briefcase.” / “Complete the packet information.” / “Verify the packet facts before payment or covered generation.” / “Read the filing checklist before you file anything with the court.” No claim of guaranteed eligibility or result was added.

## F — F_stop_boundary

- PNG: `F_stop_boundary.png`.
- MP4: `F_stop_boundary.mp4` (6.966667 seconds).
- Source URL: `https://expungement.ai/screening/MS`; final browser route: `https://expungement.ai/screening/MS`. Internal route: `/expungement-ai/screening/MS`.
- Capture provenance: **live production capture**.
- Production SHA: `e312a5efa7b4882e0fbf61a5ff0ae7891ac23226`.
- Deployment ID: `dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc`.
- Capture completed at: `2026-10-03T16:48:41.414Z`.
- Viewport: 390 × 844 CSS pixels, DPR 2; PNG 780 × 1688.
- Jurisdiction: Mississippi (MS); Federal scope selected.
- Step: Result; progress shows 7 of 7.
- Exact headline/question: “This matter is outside the self-help state screening scope.”.
- Interaction: From the answered timing question on the federal branch, tap Continue and hold the hard-stop result for over 3 seconds. No save or external links clicked.
- Production write occurred: **No**. Read-only screening POSTs: 9; blocked write attempts: 0.
- Reason chosen: A designed hard-stop outcome explicitly says the matter is outside self-help scope, says not to use the packet flow and directs the consumer to legal aid or an attorney. This is stronger and clearer than uncertainty or a technical error.
- Caveat: shared production header/bubble/viewport caveats above apply.

Exact eyebrow: “WE CAN'T HELP WITH THIS RECORD”. Exact reason: “Federal matters are outside this state record-clearing engine.” Exact next steps: “Do not use this state self-help packet flow.” / “Gather the relevant record.” / “Contact legal aid or an attorney.” The real “Save my result and continue” button is visible and was not clicked.

## Quality review

Every source PNG was opened using the image viewer and visually checked for authentic logo/app header, settled content, readable full headline, intact assets, no browser chrome, no cursor, no private data, no fabricated copy and no capture overlay. All six MP4s decoded completely without ffmpeg errors, were played from beginning through the ended event in Chromium, and were visually reviewed using decoded 0.5-second timeline panels spanning each full clip. All begin and end with real product frames, are portrait, and end on a held meaningful state. Technical metrics are in `raw/video-metrics.json`; complete Chromium playback evidence is in `raw/playback-review.json`; review timelines are in `raw/timeline-*.png`.

## Safety statement

- No real participant data used.
- No real customer account created; no account sign-in.
- No payment made or payment details entered.
- No Stripe Checkout session created; no checkout submitted.
- No paid packet generated; no court submission.
- No email/SMS sent; no partner or clinic records created.
- No application code changed or product behavior patched.
- No commit created; no push, deploy, migration, database mutation, configuration or secrets changes performed.
- All task files remain untracked under this capture directory. No staging performed.
