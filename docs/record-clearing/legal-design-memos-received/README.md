# Received legal-design memos — human originals

The attorney's own words, preserved as returned.

Filed here as `<CODE>-<memoVersion>.md` (or `.pdf`, `.docx` — whatever counsel
sent). One file per memo revision; never overwrite an earlier one.

## Why this is separate from the intake directory

`data/record-clearing/legal-design-intake/` holds only **completed normalized
JSON** that has passed the validator. It is a runtime input.

This directory holds the **human original** the normalization was derived from.
When a question arises later about why a track was built a particular way, the
answer is here, in counsel's own words, not in our restatement of them.

Partial drafts, marked-up returns and follow-up clarifications belong here too.
**They must never be placed in the intake directory**, which accepts only
memos that validate completely.

## The operator flow

1. Counsel returns a completed memo. File the original here.
2. Convert its conclusions into `data/record-clearing/legal-design-intake/<CODE>.memo.json`.
   Convert only what counsel actually said.
3. Run the validator. Fix conversion errors; do **not** fill legal gaps.
4. Where the memo is genuinely silent or contradictory, go back to counsel with
   the specific question. A missing waiting period is a question, not a blank
   to fill in.
5. Re-run until the normalized memo passes. Only then is it imported.
6. The imported track is `runtime_disabled`. Nothing is enabled by importing.

## No attorney metadata

Do not record reviewer names, contact details, firms, bar numbers, bar
jurisdictions, signatures, reviewer profiles or engagement information —
here or anywhere else. If a returned memo carries them in its letterhead,
redact before filing.

This is not a reviewer database and must never become one.
