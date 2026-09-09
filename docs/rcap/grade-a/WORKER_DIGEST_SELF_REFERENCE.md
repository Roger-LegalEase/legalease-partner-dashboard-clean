# The recorded worker digest cannot stay current, and why

**Status:** open design question. Measured 2026-09-09, not fixed. Nothing is
currently blocked by it.

## What happens

`generate-rcap-grade-a-fulfillment-authority.mjs` fills
`provider.imageDigest` only when `createWorkerInputPlan` reports
`rebuildRequired: false` — that is, when no worker-packaged input has changed
between the accepted source SHA and the current head. That gate is right: an
image that does not contain the current packaged inputs must not be presented
as the current renderer.

But two of the worker's packaged inputs are files this generator itself writes:

```
COPY data/rcap-grade-a/fulfillment-authority-registry.json \
     data/rcap-grade-a/fulfillment-observation-snapshot.json data/rcap-grade-a/
```

So the sequence closes on itself, and this was measured rather than reasoned:

1. Publish an image from head `H`. Nothing has drifted, so the plan says reuse.
2. Run the generator. It records `provider.imageDigest` — and in doing so
   rewrites the registry.
3. Commit that. Head is now `H'`, whose registry differs from `H`'s.
4. Run the generator again. A packaged input has changed, so `rebuildRequired`
   is true and `provider.imageDigest` empties.

Step 4 was confirmed directly: the digest was present at `815b50f20` and empty
on the next run at the commit that recorded it.

The record that names the image is baked into the image, so the digest is
never simultaneously recorded and current.

## What it is not

It is not the fail-closed path misfiring. Every other case that empties this
field is real: the packet-set manifests changed under FIX96 and FIX120, and
that genuinely means the published image does not contain them. The self
reference is the one case where the drift is the recording itself.

## What is actually affected today

One family, `ms-nonconv-set`, gains a `provider` entry in `missingProof`. It is
INCOMPLETE for two other reasons regardless — its final verification state is
unbound and no official source is bound to the route — so nothing that would
otherwise be complete is held up. The worker image acceptance workflow is
unaffected: it reads `sourceSha` and `immutableRegistryDigest` from
`data/rcap-render/worker-publication-evidence.json`, not from the registry.

## The proposed fix, not applied here

Do not remove the registry from the image: the worker reads it at runtime to
know what it is authorized to render, and dropping it would be a real
regression.

Instead, narrow the rebuild comparison: when `changedCanonicalPaths` compares
the authority registry and the observation snapshot, compare them with the
fields that record the publication under decision normalized out, so a registry
that differs ONLY by the digest being decided does not force a rebuild, while
any substantive change to authority, sources, approval or scope still does.

This is deliberately not applied here. It changes the production rebuild
decision — the gate that keeps a published image honest about its own contents
— and a mistake in the normalization would mask a real authority change as
noise. It wants its own change with its own regression tests: at minimum, a
registry differing only by the recorded digest does NOT rebuild; a registry
differing by any approval, source binding or scope field DOES; and an empty or
absent digest field is never treated as equivalent to a present one.
