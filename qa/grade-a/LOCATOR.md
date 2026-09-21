# Final QA Package — canonical location and integrity

`qa/grade-a/` is the canonical shared location for Roger's Final QA Package. No
byte-identical canonical copy existed in this repository when the package was
transferred, so this is the location the plan's §3 says to adopt, and this file
is the locator record it asks for.

## Transfer integrity, verified on installation

| Artifact | SHA-256 | Checked against |
|---|---|---|
| source ZIP | `c8065009cbaa5e6b505b7b5f28fd640991399f021b6dd2d5b92ad57db7498e09` | the recorded original ZIP hash — matches |
| `ExpungementAI_Final_QA_Checklist.xlsx` | `3bf99c500db70f23b3053cd31763cf5e92e4df85780e719f4785868b7d69be00` | the recorded original workbook hash — matches |
| `ExpungementAI_Final_QA_Execution_Prompt.md` | `ed5cc21634389b9a5f4db1d886b7777a61a38b9ae23c14674d65b87561cb9633` | recorded on installation |
| `ExpungementAI_Final_QA_Plan.md` | `3cf0bbc28205a35e1d15632ac2e60d378ddf74f3fe013bafea8788e9bdc2f742` | recorded on installation |
| `QA_Control_Library.csv` | `f787bcbd2de1f406e0dfa076ac7cb12991735b44182932cda396f5e94daa9b4b` | recorded on installation |
| `README.md` | `60a85553bc7cfbe3695909d8d39fc2cc3fb28582041ad1349fc0510033a1d593` | recorded on installation |

The `__MACOSX` resource-fork entries in the archive were not installed. Nothing
else in the archive was altered, re-exported or reformatted.

## Catalog state at installation

248 control rows, 248 unique control IDs, every status `NOT RUN`. Phase counts:
P00 20 · P01 20 · P02 24 · P03 22 · P04 24 · P05 17 · P06 22 · P07 20 · P08 23 ·
P09 20 · P10 18 · P11 18.

These are **control types, not test instances**. Every applicable route, outcome,
channel, local variant, role, language and unique document/page still needs its
own evidence, and a promised held route stays in scope. Neither 248 control
types, nor the 346 terminal families, nor 740 reported pathway identities, nor
106 audited capabilities is a completion percentage, and none substitutes for
another.

## How these files are to be used

- `ExpungementAI_Final_QA_Checklist.xlsx` is the **single working results
  source**. Populate it in place. Do not create a second results system, and
  never overwrite populated results by re-copying the blank original from the
  archive or from this commit.
- `QA_Control_Library.csv` is the **control catalog**, not a second results
  ledger. Do not record outcomes in it.
- The workbook hash above is the pristine-template hash. Once results are
  entered the workbook will no longer match it; that divergence is expected and
  is how a populated workbook is told apart from the blank one. It is not a
  transfer-integrity failure.
- Missing evidence is `NOT RUN` or `BLOCKED`; evidence whose subject changed is
  `STALE`. Do not invent verdicts or new status vocabularies.

Nothing here is a QA result. Installing the package executes no control.
