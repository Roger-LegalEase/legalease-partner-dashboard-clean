# Packet-family worker brief — census V1

This replaces the brief the first national wave was dispatched with. That brief
lost five of six workers to a single omission, so read the two sections marked
**BEFORE ANYTHING ELSE** first and in order.

## What went wrong the first time, so it does not happen again

Six workers were dispatched to build official-form packet families. Five reached
their first step, looked for the official source bytes, found no corpus mounted
in their container, and stopped. Every one of those refusals was correct: an
absent corpus is not an empty corpus, and a family whose bytes were never opened
must not report as built.

The workers were not at fault. The brief was. It said the sources were
*already held* and did not say that "held" means held in a private release that
each container must recover for itself. One worker in six found
`scripts/rcap-corpus/bootstrap-private-corpus.sh` on its own and built its
family; the other five had no way to know it existed.

Every source those five were refused has since been checked against the mounted
corpus. All of them are present and hash byte-exact. Nothing was missing. The
bytes were one command away.

## BEFORE ANYTHING ELSE — 1. Recover the corpus

```sh
bash scripts/rcap-corpus/bootstrap-private-corpus.sh
```

This recovers the pinned Master Library from its private release into
`private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1`, which is
git-ignored. It verifies the archive hash and the corpus's own governance
checksums before extracting, and refuses rather than guessing: a mismatched
archive, a short extract or a source hash that does not match is a failure, not
a warning. It needs `GITHUB_TOKEN` or `GH_TOKEN` in the environment; it never
prints one and never commits a byte.

If it fails, stop and report the failure. Do not fetch a form from a court host:
egress to court and agency hosts is refused by policy, and a copy from anywhere
that is not the issuing authority is not an official source. No mirrors, caches,
aggregators or lookalike forms.

## BEFORE ANYTHING ELSE — 2. Pass the preflight

```sh
node scripts/verify-packet-build-environment.mjs --family <worklistGroupId> --branch <your branch>
```

Fourteen checks. It must print `PACKET_BUILD_ENVIRONMENT_READY` before you write
anything. If it does not, the message names what to fix. Do not start a build in
a container that fails it — that is precisely what cost the first wave.

Two failures have specific fixes:

- **the clone is shallow** — a shallow clone cannot see the branch you are
  meant to resume, so you would silently rebuild from scratch and throw away the
  research already committed on your own tip:

  ```sh
  git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'
  git fetch --unshallow origin || git fetch origin --prune
  ```

- **node_modules is absent** — `npm ci`.

## Resume, do not rebuild

If your family has a branch already, its tip carries committed work: source
gates, pinned identities, local-variation research, inherited measurements,
product wiring. That work is not to be redone.

```sh
git fetch origin --prune
git checkout <your branch>
git log --oneline origin/<your branch> -5     # read what is already there
```

Read every file your predecessor committed before you write one. A gate report
that says why a build stopped usually also says exactly what to do when it
resumes; `toReopenThisGate` and `unblockBy` are written for you.

## The build sequence

Each step consumes the one before it. Do not skip ahead, and do not record a
later step as done on documentary grounds when its input was never opened.

1. **Bind the source.** Verify each official binary against its pinned SHA-256
   in `data/rcap-all50/local-source-corpus-index.json`. A mismatch stops the
   build; so does an absence, and the two are different findings.
2. **Census the fields** with real geometry read off the document.
3. **Map every write box**, measured off the document. Use
   `scripts/lib/pdf-stroked-boxes.mjs` — it tracks the CTM. The older
   `re`-operator scan did not, and put a mark in the margin. `not_mapped` is not
   a map.
4. **Record the local variation** — filing, fee, venue, service and delivery.
   This step does not depend on the source bytes and can proceed while a source
   question is open.
5. **Wire the product** without creating authority. Wiring is not approval.
6. **Render canonical and boundary fixtures** from the source binary.
7. **Verify from the artifact bytes**, not from your own report of them. Locate
   each written value at its measured rectangle in the output.
8. **Raster every page** for visual review.

## What you may never do

- Never write a participant name into a charge, offence, count, statute or
  violation caption. The shared binder refuses this; if you find a path around
  the refusal, that is a finding to report, not a field to fill.
- Never prefill a participant signature, a signature date, a certificate of
  mailing before actual mailing, or any court-only or prosecutor-only field.
- Never skip, weaken or quarantine a verifier to make a lane report green.
- Never invent an artifact hash, and never cite a hash from
  `data/rcap-grade-a/stale-artifact-block.json` as evidence for anything.
- Never draw a new box on an official form. Mark the boxes the form already has,
  inside their measured bounds.
- Never commit a source binary, an absolute container path, or a symlink.
- Never use `git add .`, `git add -A` or `git add --all`.

## What finishing your family does not do

It opens no commercial route, creates no fulfilment record and approves nothing
for participant delivery. Commercial authority comes from a Grade-A fulfilment
record keyed to an exact route and packet family, and from nothing else. Your
family is complete when its own work types are discharged and reviewed — not
when its artifacts render.

If you stop, stop the way the first wave stopped: say exactly what is missing,
what you did not do because of it, and what would reopen the gate. That is a
useful return. A family reported as built on bytes nobody opened is not.
